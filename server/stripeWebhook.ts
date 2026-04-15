import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-03-31.basil" });

export const stripeWebhookRouter = Router();

stripeWebhookRouter.post("/api/stripe/webhook", (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    res.status(400).json({ error: "Webhook signature verification failed" });
    return;
  }

  if (event.id.startsWith("evt_test_")) {
    res.json({ verified: true });
    return;
  }

  console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

  const db = getDb();
  if (!db) {
    res.status(500).json({ error: "Database not available" });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id ? parseInt(session.metadata.user_id) : null;

        // One-time pass flow (mode: payment) — Carbon Forum etc.
        const passId = session.metadata?.pass_id as string | undefined;
        if (userId && passId && session.mode === "payment") {
          const grantsTier = session.metadata?.grants_tier as string | undefined;
          const durationDays = parseInt(session.metadata?.duration_days ?? "30", 10);

          if (grantsTier) {
            const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
            db.update(users).set({
              subscriptionTier: grantsTier as "analyst" | "developer" | "engineer" | "expert",
              subscriptionStatus: "active",
              accessExpiresAt: expiresAt,
              // Do NOT set stripeSubscriptionId — this is a one-time payment, no subscription.
            }).where(eq(users.id, userId)).run();
            console.log(`[Stripe Webhook] Activated pass ${passId} for user ${userId}, expires ${expiresAt.toISOString()}`);
          }
          break;
        }

        // Subscription flow (mode: subscription) — regular Analyst/Developer/etc.
        const tierId = session.metadata?.tier_id as string | undefined;
        const subscriptionId = session.subscription as string | undefined;

        if (userId && tierId && subscriptionId) {
          db.update(users).set({
            stripeSubscriptionId: subscriptionId,
            subscriptionTier: tierId as "analyst" | "developer" | "engineer" | "expert",
            subscriptionStatus: "active",
            accessExpiresAt: null, // clear any leftover pass expiry
          }).where(eq(users.id, userId)).run();
          console.log(`[Stripe Webhook] Activated ${tierId} for user ${userId}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status;

        const userRows = db.select({ id: users.id })
          .from(users)
          .where(eq(users.stripeCustomerId, customerId))
          .all();
        const user = userRows[0];

        if (user) {
          db.update(users).set({ subscriptionStatus: status }).where(eq(users.id, user.id)).run();
          console.log(`[Stripe Webhook] Updated subscription status to ${status} for user ${user.id}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const userRows = db.select({ id: users.id })
          .from(users)
          .where(eq(users.stripeCustomerId, customerId))
          .all();
        const user = userRows[0];

        if (user) {
          db.update(users).set({
            subscriptionTier: "free",
            subscriptionStatus: "inactive",
            stripeSubscriptionId: null,
          }).where(eq(users.id, user.id)).run();
          console.log(`[Stripe Webhook] Downgraded user ${user.id} to free tier`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const userRows = db.select({ id: users.id })
          .from(users)
          .where(eq(users.stripeCustomerId, customerId))
          .all();
        const user = userRows[0];

        if (user) {
          db.update(users).set({ subscriptionStatus: "past_due" }).where(eq(users.id, user.id)).run();
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
