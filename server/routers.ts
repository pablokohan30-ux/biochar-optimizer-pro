import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { safeAnchorH } from "../client/src/lib/biocharModel";
import { z } from "zod";
import Stripe from "stripe";
import { requireDb, getUserByEmail } from "./db";
import { users, aiSearchUsage } from "../drizzle/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { TIER_PRODUCTS, getPassById, isValidSocialShareUrl } from "./stripeProducts";
import { sdk } from "./_core/sdk";
import bcrypt from "bcrypt";
import { projectsRouter } from "./projectsRouter";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-03-31.basil" })
  : null;

// Free tier: max 3 AI searches per day
const FREE_DAILY_SEARCH_LIMIT = 3;

// Corporate email validation — block free providers
const FREE_EMAIL_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.com.ar", "hotmail.com",
  "outlook.com", "live.com", "aol.com", "icloud.com", "me.com", "mail.com",
  "protonmail.com", "proton.me", "zoho.com", "yandex.com", "gmx.com",
];

function isCorporateEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && !FREE_EMAIL_DOMAINS.includes(domain);
}

export const appRouter = router({
  system: systemRouter,
  projects: projectsRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!isCorporateEmail(input.email)) {
          throw new Error("Please use a corporate email address. Free email providers (Gmail, Yahoo, etc.) are not accepted.");
        }

        const existing = getUserByEmail(input.email.toLowerCase());
        if (existing) {
          throw new Error("An account with this email already exists. Please login instead.");
        }

        const passwordHash = await bcrypt.hash(input.password, 12);
        const db = requireDb();
        const now = new Date();

        db.insert(users).values({
          email: input.email.toLowerCase(),
          passwordHash,
          name: input.name,
          role: "user",
          subscriptionTier: "free",
          subscriptionStatus: "inactive",
          createdAt: now,
          updatedAt: now,
          lastSignedIn: now,
        }).run();

        const user = getUserByEmail(input.email.toLowerCase());
        if (!user) throw new Error("Registration failed");

        const token = await sdk.createSessionToken(user.id, user.email);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return { success: true, user: { id: user.id, email: user.email, name: user.name } };
      }),

    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = getUserByEmail(input.email.toLowerCase());
        if (!user) {
          throw new Error("Invalid email or password.");
        }

        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new Error("Invalid email or password.");
        }

        // Update last sign in
        const db = requireDb();
        db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id)).run();

        const token = await sdk.createSessionToken(user.id, user.email);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return { success: true, user: { id: user.id, email: user.email, name: user.name } };
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Subscription management ────────────────────────────────────────────────
  subscription: router({
    getMyTier: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return { tier: "free", status: "inactive", accessExpiresAt: null as number | null };

      const expiresAt = ctx.user.accessExpiresAt ? new Date(ctx.user.accessExpiresAt).getTime() : null;
      const now = Date.now();

      // If the user has a time-limited pass that expired, auto-downgrade to free.
      if (expiresAt !== null && expiresAt <= now) {
        try {
          const db = requireDb();
          db.update(users).set({
            subscriptionTier: "free",
            subscriptionStatus: "inactive",
            accessExpiresAt: null,
          }).where(eq(users.id, ctx.user.id)).run();
          console.log(`[getMyTier] Auto-downgraded user ${ctx.user.id} — pass expired`);
        } catch (err) {
          console.warn("[getMyTier] Failed to auto-downgrade expired pass:", err);
        }
        return { tier: "free", status: "inactive", accessExpiresAt: null };
      }

      return {
        tier: ctx.user.subscriptionTier ?? "free",
        status: ctx.user.subscriptionStatus ?? "inactive",
        accessExpiresAt: expiresAt,
      };
    }),

    createCheckout: protectedProcedure
      .input(z.object({ tierId: z.enum(["analyst", "developer", "engineer", "expert"]) }))
      .mutation(async ({ ctx, input }) => {
        if (!stripe) throw new Error("Stripe is not configured");
        const tierProduct = TIER_PRODUCTS.find(p => p.id === input.tierId);
        if (!tierProduct) throw new Error("Invalid tier");

        const origin = (ctx.req.headers.origin as string) || "http://localhost:3000";
        const db = requireDb();

        let stripeCustomerId = ctx.user.stripeCustomerId;
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: ctx.user.email ?? undefined,
            name: ctx.user.name ?? undefined,
            metadata: { userId: ctx.user.id.toString() },
          });
          stripeCustomerId = customer.id;
          db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, ctx.user.id)).run();
        }

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
          },
        });

        return { url: session.url };
      }),

    // ─── One-time pass checkout (mode: payment, not subscription) ────────────
    // Used for event promos like the Carbon Forum Pass. Grants time-limited
    // access to a tier without auto-renewal.
    //
    // Two variants exist for Carbon Forum Colombia 2026:
    //   - "carbon_forum_2026_full":   $100, no proof needed
    //   - "carbon_forum_2026_social": $50, requires a LinkedIn/X post URL
    //     that the server validates (domain check) before charging.
    createPassCheckout: protectedProcedure
      .input(z.object({
        passId: z.enum(["carbon_forum_2026_full", "carbon_forum_2026_social"]),
        socialProofUrl: z.string().trim().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!stripe) throw new Error("Stripe is not configured");

        const pass = getPassById(input.passId);
        if (!pass) {
          throw new Error("Unknown pass.");
        }

        // The social-share variant requires a valid public post URL from an
        // allowed platform. Honour-system: we don't actually fetch the post,
        // we just validate the domain and store the URL in Stripe metadata
        // so the ops team can spot-check later.
        if (pass.requiresSocialProof) {
          if (!input.socialProofUrl || !isValidSocialShareUrl(input.socialProofUrl)) {
            throw new Error(
              "A valid LinkedIn or X (Twitter) post URL is required to unlock this price."
            );
          }
        }

        const origin = (ctx.req.headers.origin as string) || "http://localhost:3000";
        const db = requireDb();

        // Ensure Stripe customer exists for this user.
        let stripeCustomerId = ctx.user.stripeCustomerId;
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: ctx.user.email ?? undefined,
            name: ctx.user.name ?? undefined,
            metadata: { userId: ctx.user.id.toString() },
          });
          stripeCustomerId = customer.id;
          db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, ctx.user.id)).run();
        }

        // Find or create the one-time price for this pass.
        const prices = await stripe.prices.list({ lookup_keys: [pass.lookupKey], limit: 1 });
        let priceId: string;

        if (prices.data.length > 0) {
          priceId = prices.data[0].id;
        } else {
          const product = await stripe.products.create({
            name: `Biochar Optimizer Pro — ${pass.name}`,
            description: pass.description,
            metadata: { passId: pass.id },
          });
          const price = await stripe.prices.create({
            product: product.id,
            unit_amount: pass.priceUsd * 100,
            currency: "usd",
            // No recurring — one-time payment.
            lookup_key: pass.lookupKey,
          });
          priceId = price.id;
        }

        const session = await stripe.checkout.sessions.create({
          customer: stripeCustomerId,
          mode: "payment", // one-time, not subscription
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${origin}/app?pass=${pass.id}`,
          cancel_url: `${origin}/pricing`,
          client_reference_id: ctx.user.id.toString(),
          metadata: {
            user_id: ctx.user.id.toString(),
            pass_id: pass.id,
            grants_tier: pass.grantsTier,
            duration_days: pass.durationDays.toString(),
            // Store the social share URL for audit trail (empty string if
            // not applicable — Stripe metadata doesn't accept undefined).
            social_proof_url: pass.requiresSocialProof && input.socialProofUrl
              ? input.socialProofUrl
              : "",
          },
        });

        return { url: session.url };
      }),

    createPortal: protectedProcedure.mutation(async ({ ctx }) => {
      if (!stripe) throw new Error("Stripe is not configured");
      const origin = (ctx.req.headers.origin as string) || "http://localhost:3000";
      const stripeCustomerId = ctx.user.stripeCustomerId;
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
        const db = requireDb();

        // Rate limiting for free users
        const tier = ctx.user.subscriptionTier ?? "free";
        if (tier === "free") {
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const usageRows = db
            .select({ count: count() })
            .from(aiSearchUsage)
            .where(and(eq(aiSearchUsage.userId, ctx.user.id), gte(aiSearchUsage.createdAt, startOfDay)))
            .all();
          const usageCount = usageRows[0]?.count ?? 0;
          if (usageCount >= FREE_DAILY_SEARCH_LIMIT) {
            throw new Error(`LIMIT_REACHED: Free plan allows ${FREE_DAILY_SEARCH_LIMIT} AI searches per day. Upgrade to Analyst or higher for unlimited searches.`);
          }
        }

        // Log the search
        db.insert(aiSearchUsage).values({ userId: ctx.user.id, query: input.query }).run();

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
