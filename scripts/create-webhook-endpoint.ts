/**
 * One-off helper to create (or recreate) the Stripe webhook endpoint pointing at our
 * tunnel/production URL. Run with:
 *
 *   STRIPE_SECRET_KEY=sk_test_... WEBHOOK_URL=https://... npx tsx scripts/create-webhook-endpoint.ts
 *
 * Prints the new signing secret on stdout — capture it and put it in .env or fly secrets.
 *
 * If a webhook endpoint already exists for the same URL, it deletes it first to get a
 * fresh signing secret (Stripe doesn't expose the secret of existing endpoints once created).
 */

import Stripe from "stripe";

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  const url = process.env.WEBHOOK_URL;

  if (!key) {
    console.error("STRIPE_SECRET_KEY not set");
    process.exit(1);
  }
  if (!url) {
    console.error("WEBHOOK_URL not set");
    process.exit(1);
  }

  const stripe = new Stripe(key, { apiVersion: "2025-03-31.basil" });

  // Look for an existing endpoint at the same URL
  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const dupe = existing.data.find((e) => e.url === url);
  if (dupe) {
    console.log(`Existing endpoint found: ${dupe.id}`);
    console.log("Deleting it so we can create a fresh one with a known secret...");
    await stripe.webhookEndpoints.del(dupe.id);
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url,
    enabled_events: [
      "checkout.session.completed",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_failed",
    ],
    description: "Biochar Optimizer Pro — Carbon Forum 2026 webhook",
  });

  console.log("");
  console.log("✓ Created webhook endpoint");
  console.log(`  ID:     ${endpoint.id}`);
  console.log(`  URL:    ${endpoint.url}`);
  console.log(`  Status: ${endpoint.status}`);
  console.log(`  Events: ${endpoint.enabled_events.join(", ")}`);
  console.log("");
  console.log(`  SECRET: ${endpoint.secret}`);
  console.log("");
  console.log("→ Put this in your STRIPE_WEBHOOK_SECRET env var and restart the server.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
