import { useEffect, useState } from "react";
import { Sparkles, X, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

const TIER_LABELS: Record<string, string> = {
  analyst: "Analyst",
  developer: "Developer",
  engineer: "Engineer",
  expert: "Expert",
};

/**
 * Full-width banner shown at the top of /app after a successful subscription checkout.
 *
 * Trigger: URL param `?subscribed=1` (set by Stripe success_url in createCheckout).
 *
 * On mount:
 *   1. Parses the query string; bails out if `subscribed` is missing
 *   2. Calls getMyTier to get the fresh tier + status (the webhook should have already fired)
 *   3. Scrubs the `subscribed` param from the URL with replaceState so refresh doesn't re-trigger
 *   4. Renders a dismissible blue/primary banner with the activated tier name
 *
 * Parallel to PassActivatedBanner, but for recurring subscriptions — no expiry countdown,
 * since subscriptions auto-renew. We show "Welcome to {tier}" and the bullet points of
 * what's now unlocked.
 */
export default function SubscribedBanner() {
  const [visible, setVisible] = useState(false);

  // Only fetch tier when we know a subscription was just activated — avoids an extra
  // network call on every /app visit.
  const tierQuery = trpc.subscription.getMyTier.useQuery(undefined, {
    enabled: visible,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const subscribed = params.get("subscribed");
    if (!subscribed) return;

    setVisible(true);

    // Scrub the param so a refresh doesn't re-fire the banner.
    params.delete("subscribed");
    const newQuery = params.toString();
    const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : "") + window.location.hash;
    window.history.replaceState({}, "", newUrl);
  }, []);

  if (!visible) return null;

  const tier = tierQuery.data?.tier ?? null;
  const status = tierQuery.data?.status ?? null;
  const tierLabel = tier && TIER_LABELS[tier] ? TIER_LABELS[tier] : "Premium";

  // If the webhook hasn't fired yet, getMyTier may still return the old free tier.
  // That's rare but possible (race between Stripe webhook and Stripe redirect).
  // We still show the banner — it means "payment received" either way.
  const webhookLanded = status === "active" && tier && tier !== "free";

  return (
    <div className="relative bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15 border-b border-primary/30">
      <div className="container mx-auto px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {webhookLanded ? `Welcome to ${tierLabel}` : "Payment received"}
            </span>
            <span className="text-xs text-muted-foreground">
              {webhookLanded
                ? `Your ${tierLabel} subscription is active · quarterly billing`
                : "Your subscription is being activated — refresh in a moment if features are still locked."}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            All {tierLabel} features are unlocked — T°/time optimizer, LCA, PDF export, Project Manager. Cancel anytime from your account.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 p-1 -m-1"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
