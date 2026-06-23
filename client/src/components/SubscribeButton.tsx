import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { trackEvent } from "@/lib/analytics";

export type SubscribeTierId = "analyst" | "developer" | "engineer" | "expert";
export type BillingCycle = "monthly" | "quarterly";

interface SubscribeButtonProps {
  /** Which subscription tier to start checkout for. */
  tierId: SubscribeTierId;
  /** Billing frequency — monthly (full price) or quarterly (20% off). Defaults to quarterly. */
  billingCycle?: BillingCycle;
  /** Override the default button label. */
  children?: React.ReactNode;
  /** Forwarded to the underlying Button's className for layout control. */
  className?: string;
  /** Forwarded to the underlying Button. */
  size?: "sm" | "default" | "lg" | "icon";
  /** Forwarded to the underlying Button. */
  variant?: "default" | "outline" | "ghost" | "secondary";
  /** Show the Zap icon on the left of the label. Defaults to false to match existing tier cards. */
  showIcon?: boolean;
}

/**
 * "Subscribe" button that creates a Stripe checkout session for a paid tier and redirects.
 *
 * Flow:
 *   1. Click → if not authenticated, bounce to /login
 *   2. If authenticated, fire createCheckout mutation with the given tierId
 *   3. On success, redirect the current tab to the Stripe checkout URL (same tab, not a popup)
 *   4. On error, show a toast so the user knows it failed
 *   5. After payment, Stripe redirects back to /app?subscribed=1 — the SubscribedBanner
 *      component on Home.tsx picks that up and shows the welcome banner
 *
 * Parallel to CarbonForumPassButton but for recurring subscriptions (mode: "subscription"),
 * no promo code gate, and no modal step — we go straight to Stripe on click.
 */
export default function SubscribeButton({
  tierId,
  billingCycle = "quarterly",
  children,
  className,
  size = "sm",
  variant = "default",
  showIcon = false,
}: SubscribeButtonProps) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [localLoading, setLocalLoading] = useState(false);

  const createCheckout = trpc.subscription.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        // Same-tab redirect — consistent with CarbonForumPassButton and the Stripe Checkout best practice.
        window.location.href = data.url;
      } else {
        setLocalLoading(false);
        toast.error("Checkout session had no URL. Please try again.");
      }
    },
    onError: (err) => {
      setLocalLoading(false);
      toast.error(`Could not start checkout: ${err.message}`);
    },
  });

  const handleClick = () => {
    // Analytics: capture intent BEFORE we know if the user is authed. This
    // lets us see how many logged-out users click a tier button vs. how
    // many logged-in users actually start checkout — two very different
    // funnel stages.
    trackEvent("checkout_intent", {
      tier_id: tierId,
      billing_cycle: billingCycle,
      authenticated: isAuthenticated,
    });
    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }
    setLocalLoading(true);
    trackEvent("checkout_started", {
      tier_id: tierId,
      billing_cycle: billingCycle,
    });
    createCheckout.mutate({ tierId, billingCycle });
  };

  const loading = localLoading || createCheckout.isPending;

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Redirecting…
        </>
      ) : (
        <>
          {showIcon && <Zap className="w-3.5 h-3.5" />}
          {children ?? "Subscribe"}
        </>
      )}
    </Button>
  );
}
