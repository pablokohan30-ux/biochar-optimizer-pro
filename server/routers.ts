import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { safeAnchorH } from "../client/src/lib/biocharModel";
import { z } from "zod";
import Stripe from "stripe";
import { requireDb } from "./db";
import { users, aiSearchUsage } from "../drizzle/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { TIER_PRODUCTS } from "./stripeProducts";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-03-31.basil" });

// Free tier: max 3 AI searches per day
const FREE_DAILY_SEARCH_LIMIT = 3;

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Subscription management ────────────────────────────────────────────────
  subscription: router({

    // Get current user's subscription tier
    getMyTier: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return { tier: "free", status: "inactive" };
      const rows = await (await requireDb())
        .select({ subscriptionTier: users.subscriptionTier, subscriptionStatus: users.subscriptionStatus })
        .from(users)
        .where(eq(users.id, ctx.user.id));
      const user = rows[0];
      return {
        tier: user?.subscriptionTier ?? "free",
        status: user?.subscriptionStatus ?? "inactive",
      };
    }),

    // Create a Stripe Checkout session for a given tier
    createCheckout: protectedProcedure
      .input(z.object({ tierId: z.enum(["analyst", "developer", "engineer", "expert"]) }))
      .mutation(async ({ ctx, input }) => {
        const tierProduct = TIER_PRODUCTS.find(p => p.id === input.tierId);
        if (!tierProduct) throw new Error("Invalid tier");

        const origin = (ctx.req.headers.origin as string) || "http://localhost:3000";

        // Get or create Stripe customer
        const userRows = await (await requireDb())
          .select({ stripeCustomerId: users.stripeCustomerId, email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, ctx.user.id));
        const userRecord = userRows[0];

        let stripeCustomerId = userRecord?.stripeCustomerId;
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: userRecord?.email ?? undefined,
            name: userRecord?.name ?? undefined,
            metadata: { userId: ctx.user.id.toString() },
          });
          stripeCustomerId = customer.id;
          await (await requireDb()).update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, ctx.user.id));
        }

        // Look up price by lookup key, create if missing
        const prices = await stripe.prices.list({ lookup_keys: [tierProduct.lookupKey], limit: 1 });
        let priceId: string;

        if (prices.data.length > 0) {
          priceId = prices.data[0].id;
        } else {
          const product = await stripe.products.create({
            name: `Biochar Optimizer Pro — ${tierProduct.name}`,
            description: tierProduct.description,
            metadata: { tierId: tierProduct.id },
          });
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: tierProduct.quarterlyTotalUsd * 100,
            currency: "usd",
            recurring: { interval: "month", interval_count: 3 },
            lookup_key: tierProduct.lookupKey,
          });
          priceId = price.id;
        }

        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          mode: "subscription",
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${origin}/app?subscribed=1`,
          cancel_url: `${origin}/pricing`,
          allow_promotion_codes: true,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            tier_id: input.tierId,
            customer_email: userRecord?.email ?? "",
            customer_name: userRecord?.name ?? "",
          },
        });

        return { url: session.url };
      }),

    // Create a Stripe Customer Portal session to manage subscription
    createPortal: protectedProcedure.mutation(async ({ ctx }) => {
      const origin = (ctx.req.headers.origin as string) || "http://localhost:3000";
      const rows = await (await requireDb())
        .select({ stripeCustomerId: users.stripeCustomerId })
        .from(users)
        .where(eq(users.id, ctx.user.id));
      const stripeCustomerId = rows[0]?.stripeCustomerId;
      if (!stripeCustomerId) throw new Error("No Stripe customer found. Please subscribe first.");

      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${origin}/app`,
      });
      return { url: session.url };
    }),
  }),

  // ─── Biomass AI search ───────────────────────────────────────────────────────
  biomass: router({
    search: protectedProcedure
      .input(z.object({ query: z.string().min(1).max(200) }))
      .mutation(async ({ ctx, input }) => {
        // Rate limiting for free users
        const tierRows = await (await requireDb())
          .select({ subscriptionTier: users.subscriptionTier })
          .from(users)
          .where(eq(users.id, ctx.user.id));
        const tier = tierRows[0]?.subscriptionTier ?? "free";

        if (tier === "free") {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const usageRows = await (await requireDb())
            .select({ count: count() })
            .from(aiSearchUsage)
            .where(and(eq(aiSearchUsage.userId, ctx.user.id), gte(aiSearchUsage.createdAt, startOfDay)));
          const usageCount = usageRows[0]?.count ?? 0;
          if (usageCount >= FREE_DAILY_SEARCH_LIMIT) {
            throw new Error(`LIMIT_REACHED: Free plan allows ${FREE_DAILY_SEARCH_LIMIT} AI searches per day. Upgrade to Analyst or higher for unlimited searches.`);
          }
        }

        // Log the search
        await (await requireDb()).insert(aiSearchUsage).values({ userId: ctx.user.id, query: input.query });

        const systemPrompt = `You are an expert in biomass characterization and pyrolysis science.
Given a biomass feedstock name or description, return its typical elemental composition (CHONS analysis) and physical properties as a JSON object.
Base your response on peer-reviewed literature and established databases (IEA Bioenergy, Phyllis2, USDA, etc.).

CRITICAL: anchor_H must be the HYDROGEN CONTENT IN MASS PERCENT (% H by mass, dry basis) of the biochar produced at 650°C.
This is NOT the H:Corg molar ratio. It is the actual % H in the biochar solid.
Typical values for biochar at 650°C range from 0.8% to 2.5% H by mass.
Example: pine biochar at 650°C has ~1.47% H by mass (which corresponds to H:Corg molar ratio of 0.20).

Always return valid JSON with these exact fields:
{
  "name": "Official name of the biomass",
  "C": <carbon % dry basis of raw feedstock, number>,
  "H": <hydrogen % dry basis of raw feedstock, number>,
  "O": <oxygen % dry basis of raw feedstock, number>,
  "N": <nitrogen % dry basis of raw feedstock, number>,
  "S": <sulfur % dry basis of raw feedstock, number>,
  "ash": <ash content % dry basis of raw feedstock, number>,
  "moisture": <typical moisture % as received, number>,
  "anchor_T": 650,
  "anchor_t": 30,
  "anchor_C": <estimated carbon % in biochar at 650C/30min, number, typically 70-92%>,
  "anchor_H": <estimated HYDROGEN % BY MASS in biochar at 650C/30min, number, typically 0.8-2.5%>,
  "source": "Literature source or database",
  "notes": "Brief notes on variability or key characteristics"
}
If the biomass is unknown or too ambiguous, return null.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Find biomass properties for: "${input.query}"` }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "biomass_properties",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  C: { type: "number" },
                  H: { type: "number" },
                  O: { type: "number" },
                  N: { type: "number" },
                  S: { type: "number" },
                  ash: { type: "number" },
                  moisture: { type: "number" },
                  anchor_T: { type: "number" },
                  anchor_t: { type: "number" },
                  anchor_C: { type: "number" },
                  anchor_H: { type: "number" },
                  source: { type: "string" },
                  notes: { type: "string" }
                },
                required: ["name", "C", "H", "O", "N", "S", "ash", "moisture", "anchor_T", "anchor_t", "anchor_C", "anchor_H", "source", "notes"],
                additionalProperties: false
              }
            }
          }
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) return null;
        const content = typeof rawContent === "string" ? rawContent : null;
        if (!content) return null;

        try {
          const parsed = JSON.parse(content);
          if (!parsed) return null;

          parsed.anchor_H = safeAnchorH(parsed.anchor_H, parsed.anchor_C);

          return parsed;
        } catch {
          return null;
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
