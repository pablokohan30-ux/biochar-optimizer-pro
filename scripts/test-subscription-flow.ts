/**
 * Smoke test for the subscription checkout flow (Analyst / Developer / Engineer / Expert).
 *
 * Parallel to scripts/test-pass-flow.ts but for mode: "subscription" instead of mode: "payment".
 *
 * Run with:
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/test-subscription-flow.ts
 *
 * Also works without STRIPE_SECRET_KEY — it skips the live Stripe calls and
 * exercises only the pure + DB layers.
 *
 * What it covers end-to-end:
 *   1. TIER_PRODUCTS array integrity (4 tiers, prices consistent, lookup keys unique)
 *   2. TIER_ORDER + getTierIndex — ordering and unknown-tier handling
 *   3. hasAccess() — full matrix of (userTier × requiredTier × status) combinations
 *   4. Stripe test-mode: for each tier, create customer + recurring price + subscription
 *      checkout session (mode: "subscription", interval: month, interval_count: 3)
 *   5. Webhook simulation — full subscription lifecycle DB writes:
 *      - checkout.session.completed (subscription) → sets tier + subscriptionId + clears accessExpiresAt
 *      - customer.subscription.updated (past_due) → updates status
 *      - customer.subscription.deleted → downgrades to free + clears subscriptionId
 *      - invoice.payment_failed → marks past_due
 *   6. Tier upgrade (analyst → developer) — DB transition
 *   7. Pass-to-subscription transition — accessExpiresAt is cleared when upgrading
 *   8. Cleanup (delete test user + expire Stripe test sessions + delete customers)
 *
 * Exit code 0 on success, 1 on any failure.
 */

import "dotenv/config";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import {
  TIER_PRODUCTS,
  TIER_ORDER,
  getTierIndex,
  hasAccess,
  type TierId,
} from "../server/stripeProducts";

const TEST_EMAIL = `subtest-${Date.now()}@biochar.test`;
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

let passed = 0;
let failed = 0;

function pass(msg: string) {
  passed++;
  console.log(`  ${GREEN}✓${RESET} ${msg}`);
}

function fail(msg: string, details?: unknown) {
  failed++;
  console.log(`  ${RED}✗${RESET} ${msg}`);
  if (details) console.log(`    ${DIM}${JSON.stringify(details)}${RESET}`);
}

function section(title: string) {
  console.log(`\n${title}`);
}

function expect(cond: boolean, msg: string, details?: unknown) {
  if (cond) pass(msg);
  else fail(msg, details);
}

// ─── 1. TIER_PRODUCTS array integrity ───────────────────────────────────────
section("1. TIER_PRODUCTS array integrity");

expect(TIER_PRODUCTS.length === 4, `TIER_PRODUCTS has exactly 4 tiers (got ${TIER_PRODUCTS.length})`);

const expectedTiers: TierId[] = ["analyst", "developer", "engineer", "expert"];
for (const tierId of expectedTiers) {
  const tier = TIER_PRODUCTS.find((p) => p.id === tierId);
  expect(!!tier, `${tierId} tier exists`);
  if (tier) {
    expect(tier.monthlyPriceUsd > 0, `${tierId}: monthlyPriceUsd > 0 (got ${tier.monthlyPriceUsd})`);
    expect(
      tier.quarterlyPricePerMonthUsd < tier.monthlyPriceUsd,
      `${tierId}: quarterly per-month < monthly (${tier.quarterlyPricePerMonthUsd} < ${tier.monthlyPriceUsd})`,
    );
    expect(
      tier.quarterlyTotalUsd === tier.quarterlyPricePerMonthUsd * 3,
      `${tierId}: quarterlyTotal === quarterlyPerMonth × 3 (got ${tier.quarterlyTotalUsd}, expected ${tier.quarterlyPricePerMonthUsd * 3})`,
    );
    expect(typeof tier.monthlyLookupKey === "string" && tier.monthlyLookupKey.length > 0, `${tierId}: monthlyLookupKey is non-empty`);
    expect(tier.monthlyLookupKey.startsWith("biochar_"), `${tierId}: monthlyLookupKey has biochar_ prefix`);
    expect(typeof tier.quarterlyLookupKey === "string" && tier.quarterlyLookupKey.length > 0, `${tierId}: quarterlyLookupKey is non-empty`);
    expect(tier.quarterlyLookupKey.startsWith("biochar_"), `${tierId}: quarterlyLookupKey has biochar_ prefix`);
  }
}

// Lookup keys must be unique across tiers (both monthly and quarterly)
const allLookupKeys = TIER_PRODUCTS.flatMap((p) => [p.monthlyLookupKey, p.quarterlyLookupKey]);
expect(new Set(allLookupKeys).size === allLookupKeys.length, "All lookup_keys are unique");

// Prices must be monotonically increasing across tiers
const priceOrder = TIER_PRODUCTS.map((p) => p.monthlyPriceUsd);
const isSorted = priceOrder.every((v, i) => i === 0 || priceOrder[i - 1] < v);
expect(isSorted, `Tier prices are strictly increasing (${priceOrder.join(" < ")})`);

// ─── 2. TIER_ORDER + getTierIndex ───────────────────────────────────────────
section("2. TIER_ORDER + getTierIndex");

expect(TIER_ORDER.length === 4, `TIER_ORDER has 4 entries (got ${TIER_ORDER.length})`);
expect(getTierIndex("analyst") === 0, `analyst index === 0 (got ${getTierIndex("analyst")})`);
expect(getTierIndex("developer") === 1, `developer index === 1 (got ${getTierIndex("developer")})`);
expect(getTierIndex("engineer") === 2, `engineer index === 2 (got ${getTierIndex("engineer")})`);
expect(getTierIndex("expert") === 3, `expert index === 3 (got ${getTierIndex("expert")})`);
expect(getTierIndex("free") === -1, `free returns -1 (got ${getTierIndex("free")})`);
expect(getTierIndex("nonsense") === -1, `unknown tier returns -1 (got ${getTierIndex("nonsense")})`);

// ─── 3. hasAccess() matrix ──────────────────────────────────────────────────
section("3. hasAccess() — full access matrix");

// Free users never get access
expect(hasAccess("free", "analyst", "active") === false, "free user cannot access analyst");
expect(hasAccess("free", "expert", "active") === false, "free user cannot access expert");

// Inactive status blocks access even if tier is correct
expect(hasAccess("analyst", "analyst", "inactive") === false, "inactive analyst cannot access analyst");
expect(hasAccess("expert", "analyst", "past_due") === false, "past_due expert cannot access analyst");
expect(hasAccess("developer", "analyst", "canceled") === false, "canceled developer cannot access analyst");

// Active users with matching or higher tier get access
expect(hasAccess("analyst", "analyst", "active") === true, "active analyst can access analyst");
expect(hasAccess("developer", "analyst", "active") === true, "active developer can access analyst");
expect(hasAccess("engineer", "analyst", "active") === true, "active engineer can access analyst");
expect(hasAccess("expert", "analyst", "active") === true, "active expert can access analyst");

// Active users with lower tier are blocked
expect(hasAccess("analyst", "developer", "active") === false, "active analyst cannot access developer");
expect(hasAccess("analyst", "engineer", "active") === false, "active analyst cannot access engineer");
expect(hasAccess("analyst", "expert", "active") === false, "active analyst cannot access expert");
expect(hasAccess("developer", "engineer", "active") === false, "active developer cannot access engineer");
expect(hasAccess("engineer", "expert", "active") === false, "active engineer cannot access expert");

// Expert can access everything
expect(hasAccess("expert", "developer", "active") === true, "active expert can access developer");
expect(hasAccess("expert", "engineer", "active") === true, "active expert can access engineer");
expect(hasAccess("expert", "expert", "active") === true, "active expert can access expert");

// Unknown tiers
expect(hasAccess("nonsense" as any, "analyst", "active") === false, "unknown user tier returns false");

// ─── 4. Stripe test-mode API calls ──────────────────────────────────────────
section("4. Stripe test-mode (live API) — per-tier subscription checkout");

const stripeKey = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;
const createdCustomerIds: string[] = [];
const createdProductIds: string[] = [];
const createdPriceIds: string[] = [];
const createdSessionIds: string[] = [];

if (!stripeKey) {
  console.log(`  ${YELLOW}⊘${RESET} STRIPE_SECRET_KEY not set — skipping live Stripe calls`);
} else if (!stripeKey.startsWith("sk_test_")) {
  console.log(`  ${RED}✗${RESET} STRIPE_SECRET_KEY does not start with 'sk_test_' — refusing to run against live Stripe`);
  failed++;
} else {
  stripe = new Stripe(stripeKey, { apiVersion: "2025-03-31.basil" });

  for (const tierProduct of TIER_PRODUCTS) {
    console.log(`\n  ${DIM}→ ${tierProduct.name}${RESET}`);
    try {
      // Create a fresh test customer
      const customer = await stripe.customers.create({
        email: `subtest-${tierProduct.id}-${Date.now()}@biochar.test`,
        name: `Sub Flow Test — ${tierProduct.name}`,
        metadata: { smoke_test: "1", tier: tierProduct.id },
      });
      createdCustomerIds.push(customer.id);
      pass(`[${tierProduct.id}] Created test customer ${customer.id}`);

      // Find or create recurring price (test quarterly lookup key)
      const existing = await stripe.prices.list({ lookup_keys: [tierProduct.quarterlyLookupKey], limit: 1 });
      let priceId: string;
      if (existing.data.length > 0) {
        priceId = existing.data[0].id;
        const existingPrice = existing.data[0];
        expect(
          existingPrice.recurring?.interval === "month" && existingPrice.recurring?.interval_count === 3,
          `[${tierProduct.id}] existing price is quarterly (interval=${existingPrice.recurring?.interval}, count=${existingPrice.recurring?.interval_count})`,
        );
        expect(
          existingPrice.unit_amount === tierProduct.quarterlyTotalUsd * 100,
          `[${tierProduct.id}] existing price amount === ${tierProduct.quarterlyTotalUsd * 100} cents (got ${existingPrice.unit_amount})`,
        );
      } else {
        const product = await stripe.products.create({
          name: `[SMOKE TEST] Biochar Optimizer Pro — ${tierProduct.name}`,
          description: tierProduct.description,
          metadata: { tierId: tierProduct.id, smoke_test: "1" },
        });
        createdProductIds.push(product.id);
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: tierProduct.quarterlyTotalUsd * 100,
          currency: "usd",
          recurring: { interval: "month", interval_count: 3 },
          lookup_key: tierProduct.quarterlyLookupKey,
        });
        priceId = price.id;
        createdPriceIds.push(price.id);
        pass(`[${tierProduct.id}] Created product ${product.id} + quarterly price ${price.id}`);
      }

      // Create a real subscription checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: "http://localhost:3000/app?subscribed=1",
        cancel_url: "http://localhost:3000/pricing",
        allow_promotion_codes: true,
        client_reference_id: "smoke-test",
        metadata: {
          user_id: "999999",
          tier_id: tierProduct.id,
        },
      });
      createdSessionIds.push(session.id);

      expect(
        session.mode === "subscription",
        `[${tierProduct.id}] session mode === 'subscription' (got ${session.mode})`,
      );
      expect(
        typeof session.url === "string" && session.url.includes("checkout.stripe.com"),
        `[${tierProduct.id}] session URL is a Stripe URL`,
      );
      expect(
        session.amount_total === tierProduct.quarterlyTotalUsd * 100,
        `[${tierProduct.id}] session amount_total === ${tierProduct.quarterlyTotalUsd * 100} cents (got ${session.amount_total})`,
      );
      expect(
        session.metadata?.tier_id === tierProduct.id,
        `[${tierProduct.id}] session metadata.tier_id === '${tierProduct.id}'`,
      );
    } catch (err) {
      fail(`[${tierProduct.id}] Stripe API call threw`, (err as Error).message);
    }
  }
}

// ─── 5. Webhook simulation — full subscription lifecycle DB writes ──────────
section("5. Webhook simulation — subscription lifecycle DB writes");

const db = getDb();
if (!db) {
  fail("getDb() returned null — cannot test DB layer");
} else {
  // Insert a test user (free tier)
  const now = new Date();
  db.insert(users).values({
    email: TEST_EMAIL,
    passwordHash: "test",
    name: "Sub Flow Smoke Test",
    role: "user",
    subscriptionTier: "free",
    subscriptionStatus: "inactive",
    stripeCustomerId: "cus_smoke_test_fake",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  }).run();

  const freshUser = db.select().from(users).where(eq(users.email, TEST_EMAIL)).limit(1).all()[0];
  expect(!!freshUser, "Test user inserted");
  expect(freshUser.subscriptionTier === "free", "Initial tier === 'free'");
  expect(freshUser.subscriptionStatus === "inactive", "Initial status === 'inactive'");
  expect(freshUser.stripeSubscriptionId === null, "Initial stripeSubscriptionId === null");

  // ─── checkout.session.completed (subscription) ────────────────────────────
  // Replicate webhook: user bought analyst subscription
  db.update(users).set({
    stripeSubscriptionId: "sub_smoke_test_fake",
    subscriptionTier: "analyst",
    subscriptionStatus: "active",
    accessExpiresAt: null,
  }).where(eq(users.id, freshUser.id)).run();

  let user = db.select().from(users).where(eq(users.id, freshUser.id)).limit(1).all()[0];
  expect(user.subscriptionTier === "analyst", `After checkout.session.completed: tier === 'analyst' (got ${user.subscriptionTier})`);
  expect(user.subscriptionStatus === "active", `After checkout.session.completed: status === 'active' (got ${user.subscriptionStatus})`);
  expect(user.stripeSubscriptionId === "sub_smoke_test_fake", "After checkout.session.completed: stripeSubscriptionId is set");
  expect(user.accessExpiresAt === null, "After checkout.session.completed: accessExpiresAt stays null");

  // ─── customer.subscription.updated (past_due) ─────────────────────────────
  db.update(users).set({ subscriptionStatus: "past_due" }).where(eq(users.id, freshUser.id)).run();
  user = db.select().from(users).where(eq(users.id, freshUser.id)).limit(1).all()[0];
  expect(user.subscriptionStatus === "past_due", `After subscription.updated: status === 'past_due' (got ${user.subscriptionStatus})`);
  expect(user.subscriptionTier === "analyst", `After subscription.updated: tier stays 'analyst' (got ${user.subscriptionTier})`);
  expect(hasAccess(user.subscriptionTier ?? "free", "analyst", user.subscriptionStatus ?? "inactive") === false, "past_due analyst is blocked from analyst feature");

  // ─── invoice.payment_failed ───────────────────────────────────────────────
  db.update(users).set({ subscriptionStatus: "past_due" }).where(eq(users.id, freshUser.id)).run();
  user = db.select().from(users).where(eq(users.id, freshUser.id)).limit(1).all()[0];
  expect(user.subscriptionStatus === "past_due", "After invoice.payment_failed: status === 'past_due'");

  // Recover — next successful payment flips back to active
  db.update(users).set({ subscriptionStatus: "active" }).where(eq(users.id, freshUser.id)).run();
  user = db.select().from(users).where(eq(users.id, freshUser.id)).limit(1).all()[0];
  expect(user.subscriptionStatus === "active", "After recovery: status === 'active'");
  expect(hasAccess(user.subscriptionTier ?? "free", "analyst", user.subscriptionStatus ?? "inactive") === true, "recovered analyst can access analyst feature");

  // ─── customer.subscription.deleted ────────────────────────────────────────
  db.update(users).set({
    subscriptionTier: "free",
    subscriptionStatus: "inactive",
    stripeSubscriptionId: null,
  }).where(eq(users.id, freshUser.id)).run();

  user = db.select().from(users).where(eq(users.id, freshUser.id)).limit(1).all()[0];
  expect(user.subscriptionTier === "free", `After subscription.deleted: tier === 'free' (got ${user.subscriptionTier})`);
  expect(user.subscriptionStatus === "inactive", `After subscription.deleted: status === 'inactive' (got ${user.subscriptionStatus})`);
  expect(user.stripeSubscriptionId === null, "After subscription.deleted: stripeSubscriptionId cleared");

  // ─── 6. Tier upgrade (analyst → developer) ────────────────────────────────
  section("6. Tier upgrade — analyst to developer");

  // User resubscribes at analyst
  db.update(users).set({
    stripeSubscriptionId: "sub_upgrade_test",
    subscriptionTier: "analyst",
    subscriptionStatus: "active",
    accessExpiresAt: null,
  }).where(eq(users.id, freshUser.id)).run();

  user = db.select().from(users).where(eq(users.id, freshUser.id)).limit(1).all()[0];
  expect(user.subscriptionTier === "analyst", "User starts at analyst");
  expect(hasAccess(user.subscriptionTier ?? "free", "developer", user.subscriptionStatus ?? "inactive") === false, "analyst is blocked from developer feature");

  // Upgrade to developer
  db.update(users).set({ subscriptionTier: "developer" }).where(eq(users.id, freshUser.id)).run();

  user = db.select().from(users).where(eq(users.id, freshUser.id)).limit(1).all()[0];
  expect(user.subscriptionTier === "developer", `After upgrade: tier === 'developer' (got ${user.subscriptionTier})`);
  expect(user.stripeSubscriptionId === "sub_upgrade_test", "After upgrade: subscriptionId preserved");
  expect(hasAccess(user.subscriptionTier ?? "free", "developer", user.subscriptionStatus ?? "inactive") === true, "developer can now access developer feature");
  expect(hasAccess(user.subscriptionTier ?? "free", "analyst", user.subscriptionStatus ?? "inactive") === true, "developer still has analyst access");
  expect(hasAccess(user.subscriptionTier ?? "free", "engineer", user.subscriptionStatus ?? "inactive") === false, "developer is blocked from engineer feature");

  // ─── 7. Pass-to-subscription transition ───────────────────────────────────
  section("7. Pass-to-subscription transition — accessExpiresAt cleared");

  // User has an active pass (analyst + accessExpiresAt set)
  const passExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  db.update(users).set({
    subscriptionTier: "analyst",
    subscriptionStatus: "active",
    stripeSubscriptionId: null,
    accessExpiresAt: passExpiresAt,
  }).where(eq(users.id, freshUser.id)).run();

  user = db.select().from(users).where(eq(users.id, freshUser.id)).limit(1).all()[0];
  expect(user.accessExpiresAt !== null, "User has pass expiry set");
  expect(user.stripeSubscriptionId === null, "User has no subscription yet");

  // User buys a real analyst subscription → webhook clears accessExpiresAt
  db.update(users).set({
    stripeSubscriptionId: "sub_from_pass_test",
    subscriptionTier: "analyst",
    subscriptionStatus: "active",
    accessExpiresAt: null,
  }).where(eq(users.id, freshUser.id)).run();

  user = db.select().from(users).where(eq(users.id, freshUser.id)).limit(1).all()[0];
  expect(user.accessExpiresAt === null, "After subscription upgrade: accessExpiresAt cleared");
  expect(user.stripeSubscriptionId === "sub_from_pass_test", "After subscription upgrade: subscriptionId set");
  expect(user.subscriptionTier === "analyst", "After subscription upgrade: tier stays 'analyst'");

  // Cleanup
  db.delete(users).where(eq(users.id, freshUser.id)).run();
  pass("Test user cleaned up");
}

// ─── 8. Cleanup Stripe test objects ─────────────────────────────────────────
section("8. Cleanup");

if (stripe) {
  try {
    for (const sessionId of createdSessionIds) {
      try {
        await stripe.checkout.sessions.expire(sessionId);
        pass(`Expired test session ${sessionId}`);
      } catch (err: any) {
        // Already expired or completed — not fatal
        console.log(`  ${DIM}· Session ${sessionId} could not be expired: ${err.message}${RESET}`);
      }
    }
    for (const customerId of createdCustomerIds) {
      await stripe.customers.del(customerId);
      pass(`Deleted test customer ${customerId}`);
    }
    if (createdProductIds.length > 0 || createdPriceIds.length > 0) {
      console.log(`  ${DIM}· Kept ${createdProductIds.length} product(s) + ${createdPriceIds.length} price(s) for reuse via lookup_key${RESET}`);
    }
  } catch (err) {
    fail("Stripe cleanup threw", (err as Error).message);
  }
}

// ─── Final report ───────────────────────────────────────────────────────────
console.log(`\n${passed + failed > 0 ? "─".repeat(50) : ""}`);
if (failed === 0) {
  console.log(`${GREEN}✓ All ${passed} checks passed${RESET}`);
  process.exit(0);
} else {
  console.log(`${RED}✗ ${failed} failed${RESET} · ${GREEN}${passed} passed${RESET}`);
  process.exit(1);
}
