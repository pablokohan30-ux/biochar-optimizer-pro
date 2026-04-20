import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, X, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Full-width banner shown at the top of /app after a successful Carbon Forum Pass checkout.
 *
 * Trigger: URL param `?pass=carbon_forum_2026_full` or `?pass=carbon_forum_2026_social`
 *          (set by Stripe success_url in createPassCheckout).
 *
 * On mount:
 *   1. Parses the query string; bails out if `pass` is missing
 *   2. Calls getMyTier to get the fresh accessExpiresAt (the webhook should have already fired)
 *   3. Scrubs the `pass` param from the URL with replaceState so refresh doesn't re-trigger
 *   4. Renders a dismissible green banner with the days-remaining countdown
 *
 * The banner is flow-positioned (not fixed) so it pushes the header down without overlap.
 */
export default function PassActivatedBanner() {
  const { t } = useTranslation("home");
  const [visible, setVisible] = useState(false);
  const [passId, setPassId] = useState<string | null>(null);

  // Only fetch tier when we know a pass was just activated — avoids an extra network call on every /app visit.
  const tierQuery = trpc.subscription.getMyTier.useQuery(undefined, {
    enabled: visible,
    refetchOnMount: "always",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const pass = params.get("pass");
    if (!pass) return;

    setPassId(pass);
    setVisible(true);

    // Scrub the param so a refresh doesn't re-fire the banner.
    params.delete("pass");
    const newQuery = params.toString();
    const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : "") + window.location.hash;
    window.history.replaceState({}, "", newUrl);
  }, []);

  if (!visible) return null;

  const expiresAtMs = tierQuery.data?.accessExpiresAt ?? null;
  const daysRemaining = expiresAtMs
    ? Math.max(0, Math.ceil((expiresAtMs - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;
  const expiresAtLabel = expiresAtMs
    ? new Date(expiresAtMs).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : null;

  // Nice human name — in the future if we add more passes, map here.
  const passName = passId && passId.startsWith("carbon_forum_2026") ? "Carbon Forum Pass" : "Pass";

  return (
    <div className="relative bg-gradient-to-r from-green-500/15 via-emerald-500/10 to-green-500/15 border-b border-green-500/30">
      <div className="container mx-auto px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
              {t("passBanner.activated", { name: passName })}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("passBanner.analystAccess")}
              {daysRemaining !== null && (
                <> · <span className="font-semibold text-foreground">{t("passBanner.daysRemaining", { count: daysRemaining })}</span></>
              )}
              {expiresAtLabel && (
                <> · {t("passBanner.expires", { date: expiresAtLabel })}</>
              )}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {t("passBanner.features")}
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
