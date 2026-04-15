import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Sparkles, X, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const PASS_ID = "carbon_forum_2026" as const;
const PROMO_CODE = "CARBONFORUM50";

interface CarbonForumPassButtonProps {
  /** Classes applied to the primary button so it fits different hero / promo layouts. */
  className?: string;
  /** Button label override. */
  label?: string;
}

/**
 * "Get the Pass" button for the Carbon Forum Colombia 2026 promo.
 *
 * Flow:
 *   1. Click → open modal
 *   2. If not logged in → nudge to /login?next=/pricing
 *   3. User enters the promo code (client-side pre-validated against CARBONFORUM50)
 *   4. Submit → createPassCheckout mutation → redirect to Stripe checkout (mode: payment)
 *   5. After payment, webhook sets tier='analyst' with accessExpiresAt = now + 30 days
 */
export default function CarbonForumPassButton({ className, label }: CarbonForumPassButtonProps) {
  const { t } = useTranslation("pass");
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createPassCheckout = trpc.subscription.createPassCheckout.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  const handleClick = () => {
    setError(null);
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAuthenticated) {
      // Bounce to login then come back to pricing so the user can retry.
      setLocation("/login");
      return;
    }

    const normalized = code.trim().toUpperCase();
    if (normalized !== PROMO_CODE) {
      setError(t("invalidCode"));
      return;
    }

    createPassCheckout.mutate({ passId: PASS_ID, promoCode: normalized });
  };

  const close = () => {
    if (createPassCheckout.isPending) return;
    setOpen(false);
    setError(null);
    setCode("");
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={handleClick}
        className={className ?? "w-full md:w-40 bg-green-600 hover:bg-green-700 text-white"}
      >
        {label ?? t("buttonLabel")}
      </Button>

      {open && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="font-bold text-base">{t("header")}</h2>
                  <p className="text-xs text-muted-foreground">{t("subheader")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                disabled={createPassCheckout.isPending}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {!isAuthenticated ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t("needAccount")}
                  </p>
                  <Button type="button" onClick={() => setLocation("/login")} className="w-full">
                    {t("signInOrCreate")}
                  </Button>
                </>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {t("whatYouGet")}
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <span>{t("bullet30Days")}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <span>{t("bulletNoRenew")}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <span>{t("bulletFeatures")}</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      {t("promoCode")}
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="CARBONFORUM50"
                      autoFocus
                      autoComplete="off"
                      spellCheck={false}
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-sm font-mono tracking-wider text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 uppercase"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {t("promoCodeHint")}
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-500">{error}</p>
                    </div>
                  )}

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-muted-foreground">{t("total")}</span>
                    <span className="text-2xl font-bold text-foreground">
                      $50<span className="text-xs font-normal text-muted-foreground ml-1">{t("oneTime")}</span>
                    </span>
                  </div>

                  <Button
                    type="submit"
                    disabled={createPassCheckout.isPending || code.trim().length === 0}
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {createPassCheckout.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("redirecting")}
                      </>
                    ) : (
                      <>{t("continueToCheckout")}</>
                    )}
                  </Button>

                  <p className="text-[10px] text-center text-muted-foreground">
                    {t("stripeNote")}
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
