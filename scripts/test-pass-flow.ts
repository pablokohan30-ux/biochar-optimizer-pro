/**
 * Smoke test for the Carbon Forum Pass flow.
 *
 * Run with:
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/test-pass-flow.ts
 *
 * Also works without STRIPE_SECRET_KEY — it skips the live Stripe calls and
 * exercises only the pure + DB layers.
 *
 * What it covers end-to-end:
 *   1. PASSES array integrity (both full and social variants exist, correct prices)
 *   2. isValidSocialShareUrl — domain validation for LinkedIn / X / Twitter
 *   3. Stripe test-mode: create customer + one-time price + checkout session
 *   4. Simulate webhook: set subscriptionTier + accessExpiresAt on a test user
 *   5. Simulate getMyTier read — user should appear as "analyst"+"active" with expiry
 *   6. Simulate expiration: set accessExpiresAt to past, re-read — auto-downgrade to free
 *   7. Cleanup (delete test user + dispose Stripe test objects)
 *
 * Exit code 0 on success, 1 on any failure.
 */

import "dotenv/config";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { PASSES, getPassById, isValidSocialShareUrl } from "../server/stripeProducts";

const TEST_EMAIL = `passtest-${Date.now()}@biochar.test`;
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

// ─── 1. PASSES array integrity ──────────────────────────────────────────────
section("1. PASSES array integrity");

expect(PASSES.length >= 2, "PASSES array has at least 2 entries (full + social)");

const carbonForum = getPassById("carbon_forum_2026_full");
expect(!!carbonForum, "carbon_forum_2026_full pass exists");
const carbonForumSocial = getPassById("carbon_forum_2026_social");
expect(!!carbonForumSocial, "carbon_forum_2026_social pass exists");

if (carbonForum) {
  expect(carbonForum.priceUsd === 100, `full priceUsd === 100 (got ${carbonForum.priceUsd})`);
  expect(carbonForum.durationDays === 30, `full durationDays === 30 (got ${carbonForum.durationDays})`);
  expect(carbonForum.grantsTier === "analyst", `full grantsTier === 'analyst' (got ${carbonForum.grantsTier})`);
  expect(!carbonForum.requiresSocialProof, "full pass does NOT require social proof");
  expect(typeof carbonForum.lookupKey === "string" && carbonForum.lookupKey.length > 0, "full lookupKey is a non-empty string");
}

if (carbonForumSocial) {
  expect(carbonForumSocial.priceUsd === 50, `social priceUsd === 50 (got ${carbonForumSocial.priceUsd})`);
  expect(carbonForumSocial.durationDays === 30, `social durationDays === 30 (got ${carbonForumSocial.durationDays})`);
  expect(carbonForumSocial.grantsTier === "analyst", `social grantsTier === 'analyst' (got ${carbonForumSocial.grantsTier})`);
  expect(carbonForumSocial.requiresSocialProof === true, "social pass requires social proof");
  expect(carbonForumSocial.lookupKey !== carbonForum?.lookupKey, "social lookupKey differs from full");
}

// ─── 2. isValidSocialShareUrl ───────────────────────────────────────────────
section("2. isValidSocialShareUrl");

expect(isValidSocialShareUrl("https://www.linkedin.com/posts/pablo_biochar-activity-123"), "LinkedIn post URL is valid");
expect(isValidSocialShareUrl("https://linkedin.com/feed/update/urn:li:activity:123"), "LinkedIn URL without www is valid");
expect(isValidSocialShareUrl("https://x.com/someone/status/1234567890"), "X post URL is valid");
expect(isValidSocialShareUrl("https://twitter.com/someone/status/1234567890"), "twitter.com URL is valid");
expect(!isValidSocialShareUrl("https://facebook.com/post/123"), "Facebook URL is rejected");
expect(!isValidSocialShareUrl("not-a-url"), "non-URL is rejected");
expect(!isValidSocialShareUrl(""), "empty string is rejected");
expect(!isValidSocialShareUrl("javascript:alert(1)"), "javascript: URL is rejected");

// ─── 3. Stripe test-mode API calls ──────────────────────────────────────────
section("3. Stripe test-mode (live API)");

const stripeKey = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;
let createdCustomerId: string | null = null;
let createdProductId: string | null = null;
let createdPriceId: string | null = null;
let createdSessionId: string | null = null;

if (!stripeKey) {
  console.log(`  ${YELLOW}⊘${RESET} STRIPE_SECRET_KEY not set — skipping live Stripe calls`);
} else if (!stripeKey.startsWith("sk_test_")) {
  console.log(`  ${RED}✗${RESET} STRIPE_SECRET_KEY does not start with 'sk_test_' — refusing to run against live Stripe`);
  failed++;
} else {
  stripe = new Stripe(stripeKey, { apiVersion: "2025-03-31.basil" });

  try {
    // Create a fresh test customer
    const customer = await stripe.customers.create({
      email: TEST_EMAIL,
      name: "Pass Flow Smoke Test",
      metadata: { smoke_test: "1" },
    });
    createdCustomerId = customer.id;
    pass(`Created test Stripe customer ${customer.id}`);

    // Find or create the pass product/price
    if (carbonForum) {
      const existing = await stripe.prices.list({ lookup_keys: [carbonForum.lookupKey], limit: 1 });
      let priceId: string;
      if (existing.data.length > 0) {
        priceId = existing.data[0].id;
        pass(`Reused existing test price ${priceId} for ${carbonForum.lookupKey}`);
      } else {
        const product = await stripe.products.create({
          name: `[SMOKE TEST] ${carbonForum.name}`,
          metadata: { passId: carbonForum.id, smoke_test: "1" },
        });
        createdProductId = product.id;
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: carbonForum.priceUsd * 100,
          currency: "usd",
          lookup_key: carbonForum.lookupKey,
        });
        priceId = price.id;
        createdPriceId = price.id;
        pass(`Created test product ${product.id} + price ${price.id}`);
      }

      // Create a real checkout session (mode: payment)
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: "http://localhost:3000/app?pass=carbon_forum_2026_full",
        cancel_url: "http://localhost:3000/pricing",
        client_reference_id: "smoke-test",
        metadata: {
          user_id: "999999",
          pass_id: carbonForum.id,
          grants_tier: carbonForum.grantsTier,
          duration_days: carbonForum.durationDays.toString(),
        },
      });
      createdSessionId = session.id;
      expect(session.mode === "payment", `checkout session mode === 'payment' (got ${session.mode})`);
      expect(typeof session.url === "string" && session.url.includes("checkout.stripe.com"), "checkout session URL is a Stripe URL");
      expect(session.amount_total === 10000, `session amount_total === 10000 cents (got ${session.amount_total})`);
    }
  } catch (err) {
    fail("Stripe API call threw", (err as Error).message);
  }
}

// ─── 4. Simulate webhook + DB writes ────────────────────────────────────────
section("4. Webhook simulation — DB writes");

const db = getDb();
if (!db) {
  fail("getDb() returned null — cannot test DB layer");
} else if (carbonForum) {
  // Insert a test user (free tier)
  const now = new Date();
  db.insert(users).values({
    email: TEST_EMAIL,
    passwordHash: "test",
    name: "Pass Flow Smoke Test",
    role: "user",
    subscriptionTier: "free",
    subscriptionStatus: "inactive",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
  }).run();

  const freshUser = db.select().from(users).where(eq(users.email, TEST_EMAIL)).limit(1).all()[0];
  expect(!!freshUser, "Test user inserted");
  expect(freshUser.subscriptionTier === "free", "Initial tier === 'free'");
  expect(freshUser.accessExpiresAt === null, "Initial accessExpiresAt === null");

  // Replicate the webhook handler's pass flow — set tier + expiry
  const expiresAt = new Date(Date.now() + carbonForum.durationDays * 24 * 60 * 60 * 1000);
  db.update(users).set({
    subscriptionTier: "analyst",
    subscriptionStatus: "active",
    accessExpiresAt: expiresAt,
  }).where(eq(users.id, freshUser.id)).run();

  const activatedUser = db.select().from(users).where(eq(users.id, freshUser.id)).limit(1).all()[0];
  expect(activatedUser.subscriptionTier === "analyst", `After webhook: tier === 'analyst' (got ${activatedUser.subscriptionTier})`);
  expect(activatedUser.subscriptionStatus === "active", `After webhook: status === 'active' (got ${activatedUser.subscriptionStatus})`);
  expect(activatedUser.accessExpiresAt !== null, "After webhook: accessExpiresAt is set");

  if (activatedUser.accessExpiresAt) {
    const deltaDays = Math.round((activatedUser.accessExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    expect(deltaDays === 30, `After webhook: accessExpiresAt is ~30 days out (got ${deltaDays})`);
  }

  // ─── 5. Simulate getMyTier with valid expiry ─────────────────────────────
  section("5. getMyTier — valid expiry");

  const nowMs = Date.now();
  const expiryMs = activatedUser.accessExpiresAt?.getTime() ?? 0;
  const stillValid = expiryMs > nowMs;
  expect(stillValid, "Pass is still within validity window");

  // ─── 6. Simulate expired pass + auto-downgrade ───────────────────────────
  section("6. getMyTier — expired pass auto-downgrade");

  // Set expiry to 1 hour in the past
  const pastDate = new Date(Date.now() - 60 * 60 * 1000);
  db.update(users).set({ accessExpiresAt: pastDate }).where(eq(users.id, freshUser.id)).run();

  // Replicate getMyTier's auto-downgrade logic
  const expiredUser = db.select().from(users).where(eq(users.id, freshUser.id)).limit(1).all()[0];
  const isExpired = expiredUser.accessExpiresAt !== null && expiredUser.accessExpiresAt.getTime() <= Date.now();
  expect(isExpired, "Pass is now flagged as expired");

  if (isExpired) {
    db.update(users).set({
      subscriptionTier: "free",
      subscriptionStatus: "inactive",
      accessExpiresAt: null,
    }).where(eq(users.id, freshUser.id)).run();

    const downgraded = db.select().from(users).where(eq(users.id, freshUser.id)).limit(1).all()[0];
    expect(downgraded.subscriptionTier === "free", `Auto-downgraded: tier === 'free' (got ${downgraded.subscriptionTier})`);
    expect(downgraded.subscriptionStatus === "inactive", `Auto-downgraded: status === 'inactive' (got ${downgraded.subscriptionStatus})`);
    expect(downgraded.accessExpiresAt === null, "Auto-downgraded: accessExpiresAt cleared");
  }

  // Cleanup
  db.delete(users).where(eq(users.id, freshUser.id)).run();
  pass("Test user cleaned up");
}

// ─── 7. Cleanup Stripe test objects ─────────────────────────────────────────
section("7. Cleanup");

if (stripe) {
  try {
    if (createdSessionId) {
      await stripe.checkout.sessions.expire(createdSessionId);
      pass(`Expired test checkout session ${createdSessionId}`);
    }
    if (createdCustomerId) {
      await stripe.customers.del(createdCustomerId);
      pass(`Deleted test customer ${createdCustomerId}`);
    }
    // Keep product/price around — they're reused across runs via lookup_key.
    if (createdProductId || createdPriceId) {
      console.log(`  ${DIM}· Kept product/price for reuse (lookup_key: ${carbonForum?.lookupKey})${RESET}`);
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
