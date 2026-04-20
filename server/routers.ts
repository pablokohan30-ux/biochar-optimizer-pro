import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { safeAnchorH } from "../client/src/lib/biocharModel";
import { z } from "zod";
import Stripe from "stripe";
import { requireDb, getUserByEmail, getRawDb } from "./db";
import { users, aiSearchUsage } from "../drizzle/schema";
import { eq, and, gte, gt, count, sql } from "drizzle-orm";
import { TIER_PRODUCTS, getPassById, isValidSocialShareUrl, verifySocialSharePost } from "./stripeProducts";
import { sdk } from "./_core/sdk";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { projectsRouter } from "./projectsRouter";
import { hasAccess as tierHasAccess } from "./stripeProducts";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-03-31.basil" })
  : null;

// Social share unlock: free users get this many AI analyses after sharing
const SOCIAL_SHARE_AI_CREDITS = 3;

// ─── In-memory login rate limiter ────────────────────────────────────────────
// Max 5 failed attempts per email within a 15-minute window.
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function checkLoginRateLimit(email: string): void {
  const now = Date.now();
  const key = email.toLowerCase();
  const entry = loginAttempts.get(key);

  if (entry) {
    if (now >= entry.resetAt) {
      // Window expired — reset
      loginAttempts.delete(key);
      return;
    }
    if (entry.count >= LOGIN_MAX_ATTEMPTS) {
      throw new Error("Too many login attempts. Try again in 15 minutes.");
    }
  }
}

function recordFailedLogin(email: string): void {
  const now = Date.now();
  const key = email.toLowerCase();
  const entry = loginAttempts.get(key);

  if (!entry || now >= entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    entry.count++;
  }
}

function clearLoginAttempts(email: string): void {
  loginAttempts.delete(email.toLowerCase());
}

// ─── Stripe customer helper ─────────────────────────────────────────────────
// Ensures a valid Stripe customer exists for the user. If the stored customer
// ID is stale (e.g. created in test mode, or deleted), it creates a fresh one.
async function ensureStripeCustomer(
  stripeInstance: Stripe,
  user: { id: number; email: string | null; name: string | null; stripeCustomerId: string | null },
): Promise<string> {
  const db = requireDb();

  if (user.stripeCustomerId) {
    try {
      const existing = await stripeInstance.customers.retrieve(user.stripeCustomerId);
      if (!(existing as any).deleted) return user.stripeCustomerId;
    } catch {
      // Customer doesn't exist in Stripe — fall through to create a new one
    }
  }

  const customer = await stripeInstance.customers.create({
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    metadata: { userId: user.id.toString() },
  });
  db.update(users).set({ stripeCustomerId: customer.id }).where(eq(users.id, user.id)).run();
  return customer.id;
}

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
        // Rate-limit check — reject early if too many failed attempts
        checkLoginRateLimit(input.email);

        const user = getUserByEmail(input.email.toLowerCase());
        if (!user) {
          recordFailedLogin(input.email);
          throw new Error("Invalid email or password.");
        }

        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          recordFailedLogin(input.email);
          throw new Error("Invalid email or password.");
        }

        // Successful login — clear any accumulated failed attempts
        clearLoginAttempts(input.email);

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
      .input(z.object({
        tierId: z.enum(["analyst", "developer", "engineer", "expert"]),
        billingCycle: z.enum(["monthly", "quarterly"]).default("quarterly"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!stripe) throw new Error("Stripe is not configured");
        const tierProduct = TIER_PRODUCTS.find(p => p.id === input.tierId);
        if (!tierProduct) throw new Error("Invalid tier");

        const origin = (ctx.req.headers.origin as string) || "http://localhost:3000";
        const db = requireDb();

        const stripeCustomerId = await ensureStripeCustomer(stripe, ctx.user);

        // Pick the right lookup key, price, and interval based on billing cycle
        const isMonthly = input.billingCycle === "monthly";
        const lookupKey = isMonthly ? tierProduct.monthlyLookupKey : tierProduct.quarterlyLookupKey;
        const unitAmountCents = isMonthly
          ? tierProduct.monthlyPriceUsd * 100
          : tierProduct.quarterlyTotalUsd * 100;
        const intervalCount = isMonthly ? 1 : 3;

        const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
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
            unit_amount: unitAmountCents,
            currency: "usd",
            recurring: { interval: "month", interval_count: intervalCount },
            lookup_key: lookupKey,
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
            billing_cycle: input.billingCycle,
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

        // The social-share variant requires a valid public post URL.
        // Step 1: format check (must be a real post URL, not a homepage).
        // Step 2: fetch the page and verify it mentions biochar / us.
        if (pass.requiresSocialProof) {
          if (!input.socialProofUrl || !isValidSocialShareUrl(input.socialProofUrl)) {
            throw new Error(
              "Please paste a direct link to your post (e.g. x.com/user/status/123…), not a homepage URL."
            );
          }
          const verification = await verifySocialSharePost(input.socialProofUrl);
          if (!verification.valid) {
            const reason = verification.reason === "POST_NOT_FOUND"
              ? "We couldn't find that post. Please check the URL and try again."
              : "The post doesn't seem to mention biochar or our platform. Please include a reference to Biochar Optimizer Pro.";
            throw new Error(reason);
          }
        }

        const origin = (ctx.req.headers.origin as string) || "http://localhost:3000";
        const db = requireDb();

        // Ensure Stripe customer exists (validates against Stripe, handles stale IDs).
        const stripeCustomerId = await ensureStripeCustomer(stripe, ctx.user);

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
      if (!ctx.user.stripeCustomerId) throw new Error("No Stripe customer found. Please subscribe first.");
      const stripeCustomerId = await ensureStripeCustomer(stripe, ctx.user);

      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${origin}/app`,
      });
      return { url: session.url };
    }),
  }),

  // ─── Biomass AI search ───────────────────────────────────────────────────────
  biomass: router({
    /** Returns remaining AI credits for free users */
    getCredits: protectedProcedure.query(({ ctx }) => {
      const tier = ctx.user.subscriptionTier ?? "free";
      if (tier !== "free") return { credits: -1, hasClaimed: true, unlimited: true };
      return {
        credits: ctx.user.socialShareAiCredits ?? 0,
        hasClaimed: !!(ctx.user.socialShareUrl),
        unlimited: false,
      };
    }),

    /** Claim AI credits by submitting a social share URL */
    claimSocialShareCredits: protectedProcedure
      .input(z.object({ url: z.string().min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        const db = requireDb();

        // Only free users can claim
        const tier = ctx.user.subscriptionTier ?? "free";
        if (tier !== "free") return { credits: -1, message: "Paid users have unlimited access." };

        // Check if already claimed
        if (ctx.user.socialShareUrl) {
          return { credits: ctx.user.socialShareAiCredits ?? 0, message: "Already claimed." };
        }

        // Validate URL format (must be a real post URL, not homepage)
        if (!isValidSocialShareUrl(input.url)) {
          throw new Error("INVALID_URL: Please paste a direct link to your post (e.g. x.com/user/status/123…), not a homepage URL.");
        }

        // Verify the post exists and mentions biochar / our platform
        const verification = await verifySocialSharePost(input.url);
        if (!verification.valid) {
          const reason = verification.reason === "POST_NOT_FOUND"
            ? "POST_NOT_FOUND: We couldn't find that post. Please check the URL and try again."
            : "NO_MENTION: The post doesn't seem to mention biochar or our platform. Please include a reference to Biochar Optimizer Pro.";
          throw new Error(reason);
        }

        // Grant credits
        db.update(users)
          .set({
            socialShareAiCredits: SOCIAL_SHARE_AI_CREDITS,
            socialShareUrl: input.url.trim(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, ctx.user.id))
          .run();

        return { credits: SOCIAL_SHARE_AI_CREDITS, message: "Credits unlocked!" };
      }),

    search: protectedProcedure
      .input(z.object({ query: z.string().min(1).max(200) }))
      .mutation(async ({ ctx, input }) => {
        const db = requireDb();

        // Rate limiting for free users — requires social share credits
        const tier = ctx.user.subscriptionTier ?? "free";
        if (tier === "free") {
          const credits = ctx.user.socialShareAiCredits ?? 0;
          if (credits <= 0) {
            throw new Error("SHARE_REQUIRED: Share on LinkedIn or X to unlock 3 free AI biomass analyses.");
          }
          // Credit is decremented AFTER successful LLM response (see below)
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

          // Decrement credit only AFTER a successful LLM response (atomic to avoid races)
          if (tier === "free") {
            const result = db.update(users)
              .set({ socialShareAiCredits: sql`${users.socialShareAiCredits} - 1` })
              .where(and(eq(users.id, ctx.user.id), gt(users.socialShareAiCredits, 0)))
              .run();
            if (result.changes === 0) {
              throw new Error("SHARE_REQUIRED: Share on LinkedIn or X to unlock 3 free AI biomass analyses.");
            }
          }

          return parsed;
        } catch (e) {
          // Re-throw credit-related errors; swallow JSON parse errors
          if (e instanceof Error && e.message.startsWith("SHARE_REQUIRED")) throw e;
          return null;
        }
      }),

    /**
     * Extract structured biomass + biochar data from an uploaded lab analysis PDF.
     *
     * Tier gate: Analyst+ (not available on Free tier).
     * Input: base64-encoded PDF up to ~10 MB.
     * Output: parsed biomass/biochar/pyrolysis data — user can review & edit
     *         before applying to the simulator.
     *
     * The raw extracted JSON is persisted in the `lab_analyses` table for
     * platform-wide model improvement (opt-in flag `allowPublicUse`).
     */
    extractLabAnalysis: protectedProcedure
      .input(z.object({
        pdfBase64: z.string().min(100), // rough size sanity check
        pdfName: z.string().max(200).default("analysis.pdf"),
        allowPublicUse: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        // Tier gate
        if (!tierHasAccess(ctx.user.subscriptionTier ?? "free", "analyst", ctx.user.subscriptionStatus ?? "inactive")) {
          throw new Error("UPGRADE_REQUIRED: Lab analysis upload requires Analyst plan or higher.");
        }

        // Size guard: base64 is ~1.37x the binary size. Cap at ~15 MB encoded (~11 MB PDF).
        if (input.pdfBase64.length > 15_000_000) {
          throw new Error("PDF_TOO_LARGE: Please upload a PDF under 10 MB.");
        }

        const { extractFromPdf } = await import("./_core/llm");

        const systemInstruction = `You are an expert biomass and biochar characterization analyst.

The user has uploaded a peer-reviewed lab analysis PDF of a biomass and/or biochar sample.

Your task: extract structured data from the document. Return null for any field not present.

Units expected (use these if the document uses compatible units):
- Proximate analysis: % dry basis (moisture: % as-received)
- Elemental (CHONS): % by mass, dry basis
- H:Corg ratio: molar (dimensionless, typical biochar range 0.1–0.5)
- BET surface area: m²/g
- Pore volume: cm³/g
- Pore diameter: nm
- Pyrolysis temperature: °C
- Residence time: minutes
- Heavy metals: µg/g (or ppm, same thing)
- pH: dimensionless (1–14 scale)

If the document reports values in different units (e.g., MJ/kg, Btu/lb), convert them.

If C% of biochar is provided but H:Corg molar ratio is not, compute it from:
  H:Corg = (H_mass / 1.008) / (C_mass / 12.011)

Be precise: only extract values that are explicitly stated or clearly calculable. Do not invent data.`;

        const jsonSchema = {
          type: "object",
          properties: {
            biomassName: { type: ["string", "null"], description: "Common or scientific name of the biomass" },
            biomass: {
              type: "object",
              properties: {
                C: { type: ["number", "null"] },
                H: { type: ["number", "null"] },
                N: { type: ["number", "null"] },
                S: { type: ["number", "null"] },
                O: { type: ["number", "null"] },
                ash: { type: ["number", "null"] },
                moisture: { type: ["number", "null"] },
                volatileMatter: { type: ["number", "null"] },
                fixedCarbon: { type: ["number", "null"] },
              },
            },
            pyrolysis: {
              type: "object",
              properties: {
                temperature: { type: ["number", "null"] },
                residenceTime: { type: ["number", "null"] },
                atmosphere: { type: ["string", "null"] },
                heatingRate: { type: ["number", "null"] },
              },
            },
            biochar: {
              type: "object",
              properties: {
                C: { type: ["number", "null"] },
                H: { type: ["number", "null"] },
                N: { type: ["number", "null"] },
                S: { type: ["number", "null"] },
                O: { type: ["number", "null"] },
                HCorgMolar: { type: ["number", "null"] },
                BET: { type: ["number", "null"] },
                poreVolume: { type: ["number", "null"] },
                poreDiameter: { type: ["number", "null"] },
                pH: { type: ["number", "null"] },
                thermalStability: { type: ["number", "null"] },
              },
            },
            heavyMetals: {
              type: "object",
              description: "µg/g (ppm). Include only metals explicitly reported.",
              properties: {
                Pb: { type: ["number", "null"] },
                Cd: { type: ["number", "null"] },
                Cr: { type: ["number", "null"] },
                Cu: { type: ["number", "null"] },
                Ni: { type: ["number", "null"] },
                Zn: { type: ["number", "null"] },
                Hg: { type: ["number", "null"] },
                As: { type: ["number", "null"] },
              },
            },
            source: { type: ["string", "null"], description: "Document source (e.g. CONICET ST7446, citation if present)" },
            notes: { type: ["string", "null"], description: "Brief notes on variability, method, or caveats" },
          },
        };

        let responseText: string;
        try {
          responseText = await extractFromPdf({
            pdfBase64: input.pdfBase64,
            systemInstruction,
            userPrompt: "Extract the biomass and biochar characterization data from this lab analysis document.",
            jsonSchema,
          });
        } catch (err: any) {
          const msg = err?.message || String(err);
          console.error("[extractLabAnalysis] LLM call failed:", msg);
          // Surface known Gemini error types with actionable messages
          if (/429|quota|rate limit|rate_limit|Too Many Requests/i.test(msg)) {
            throw new Error("AI_QUOTA_EXCEEDED: Our AI extraction service is temporarily over capacity. Please try again in a few minutes, or fill in the form manually.");
          }
          if (/invalid api key|api key not valid|unauthor/i.test(msg)) {
            throw new Error("AI_UNAVAILABLE: AI extraction is not configured. Please fill in the form manually for now.");
          }
          if (/timeout|ETIMEDOUT|ECONNRESET/i.test(msg)) {
            throw new Error("AI_TIMEOUT: The extraction took too long. Try a smaller PDF or fill in the form manually.");
          }
          throw new Error(`AI_UNAVAILABLE: Extraction service error. ${msg.slice(0, 200)}`);
        }

        let parsed: any;
        try {
          parsed = JSON.parse(responseText);
        } catch (e) {
          console.error("[extractLabAnalysis] JSON parse failed:", responseText.slice(0, 500));
          throw new Error("EXTRACTION_FAILED: Could not parse the document. Please try a clearer PDF or fill the form manually.");
        }

        // Persist for platform learning
        const sqlite = getRawDb();
        if (sqlite) {
          sqlite.prepare(
            `INSERT INTO lab_analyses (user_id, biomass_name, source_pdf_name, pyrolysis_T, pyrolysis_time, biomass_data, biochar_data, heavy_metals, extracted_json, allow_public_use, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          ).run(
            ctx.user.id,
            parsed.biomassName ?? null,
            input.pdfName,
            parsed.pyrolysis?.temperature ?? null,
            parsed.pyrolysis?.residenceTime ?? null,
            JSON.stringify(parsed.biomass ?? {}),
            JSON.stringify(parsed.biochar ?? {}),
            JSON.stringify(parsed.heavyMetals ?? {}),
            responseText,
            input.allowPublicUse ? 1 : 0,
            Date.now(),
          );
        }

        return parsed;
      }),
  }),

  // ─── Market news (public, no auth required) ──────────────────────────────
  market: router({
    latestNews: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(20).default(5) }))
      .query(async ({ input }) => {
        const { fetchBiocharToday, getWeeklyDigestLink } = await import("./_core/marketNews");
        const [items] = await Promise.all([fetchBiocharToday(input.limit)]);
        return {
          items,
          weeklyDigest: getWeeklyDigestLink(),
        };
      }),
  }),

  // ─── API key management (Developer+ tier) ────────────────────────────────
  apiKeys: router({
    list: protectedProcedure.query(({ ctx }) => {
      const sqlite = getRawDb();
      if (!sqlite) return [];
      const rows = sqlite.prepare(
        `SELECT id, name, key_prefix, created_at, last_used_at, revoked_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`,
      ).all(ctx.user.id) as Array<{ id: number; name: string; key_prefix: string; created_at: number; last_used_at: number | null; revoked_at: number | null }>;
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        keyPrefix: r.key_prefix,
        createdAt: r.created_at,
        lastUsedAt: r.last_used_at,
        revokedAt: r.revoked_at,
      }));
    }),

    create: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(100).default("Default") }))
      .mutation(({ ctx, input }) => {
        if (!tierHasAccess(ctx.user.subscriptionTier ?? "free", "developer", ctx.user.subscriptionStatus ?? "inactive")) {
          throw new Error("UPGRADE_REQUIRED: API keys require Developer tier or higher.");
        }
        const sqlite = getRawDb();
        if (!sqlite) throw new Error("Database unavailable");
        // Generate a random API key: bop_<32 random hex chars>
        const rawKey = `bop_${crypto.randomBytes(24).toString("hex")}`;
        const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
        const keyPrefix = rawKey.slice(0, 12) + "…";

        sqlite.prepare(
          `INSERT INTO api_keys (user_id, name, key_hash, key_prefix, created_at) VALUES (?, ?, ?, ?, ?)`,
        ).run(ctx.user.id, input.name, keyHash, keyPrefix, Date.now());

        // Return the full key ONLY on creation — never stored in plaintext
        return { key: rawKey, prefix: keyPrefix };
      }),

    revoke: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(({ ctx, input }) => {
        const sqlite = getRawDb();
        if (!sqlite) throw new Error("Database unavailable");
        sqlite.prepare(
          `UPDATE api_keys SET revoked_at = ? WHERE id = ? AND user_id = ?`,
        ).run(Date.now(), input.id, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
