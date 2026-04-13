import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-03-31.basil" });

export const stripeWebhookRouter = Router();

// Must use raw body for Stripe signature verification
stripeWebhookRouter.post("/api/stripe/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return res.status(400).json({ error: "Webhook signature verification failed" });
  }

  // Test events — return verification response
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

  const db = await getDb();
  if (!db) {
    console.warn("[Stripe Webhook] Database not available");
    return res.status(500).json({ error: "Database not available" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;
        const tierId = session.metadata?.tier_id as string | undefined;
        const subscriptionId = session.subscription as string | undefined;

        if (userId && tierId && subscriptionId) {
          await db.update(users).set({
            stripeSubscriptionId: subscriptionId,
            subscriptionTier: tierId as "analyst" | "developer" | "engineer" | "expert",
            subscriptionStatus: "active",
          }).where(eq(users.id, userId));
          console.log(`[Stripe Webhook] Activated ${tierId} for user ${userId}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status; // active, past_due, canceled, etc.

        // Find user by Stripe customer ID
        const userRows = await db.select({ id: users.id })
          .from(users)
          .where(eq(users.stripeCustomerId, customerId));
        const user = userRows[0];

        if (user) {
          await db.update(users).set({
            subscriptionStatus: status,
          }).where(eq(users.id, user.id));
          console.log(`[Stripe Webhook] Updated subscription status to ${status} for user ${user.id}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const userRows = await db.select({ id: users.id })
          .from(users)
          .where(eq(users.stripeCustomerId, customerId));
        const user = userRows[0];

        if (user) {
          await db.update(users).set({
            subscriptionTier: "free",
            subscriptionStatus: "inactive",
            stripeSubscriptionId: null,
          }).where(eq(users.id, user.id));
          console.log(`[Stripe Webhook] Downgraded user ${user.id} to free tier`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const userRows = await db.select({ id: users.id })
          .from(users)
          .where(eq(users.stripeCustomerId, customerId));
        const user = userRows[0];

        if (user) {
          await db.update(users).set({
            subscriptionStatus: "past_due",
          }).where(eq(users.id, user.id));
          console.log(`[Stripe Webhook] Marked user ${user.id} as past_due after payment failure`);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[Stripe Webhook] Error processing event:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
