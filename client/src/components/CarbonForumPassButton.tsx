import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Sparkles, X, AlertCircle, Loader2, CheckCircle, Linkedin, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Carbon Forum Colombia 2026 pass flow.
 *
 * Two price points:
 *   - $100 (base)               — pass id `carbon_forum_2026_full`
 *   - $50  (social share unlock) — pass id `carbon_forum_2026_social`,
 *                                  gated by submitting a LinkedIn / X post URL
 *
 * User flow:
 *   1. Click button → modal opens
 *   2. If not logged in → nudge to /login
 *   3. Default state: big "$100 — Get the Pass" CTA
 *   4. Below that: a "Share & save $50" block with one-click share buttons
 *      that pre-fill LinkedIn and X, plus a text input for pasting the post URL
 *   5. When a valid URL is pasted the price flips to $50 and the CTA switches
 *      to the social variant
 *   6. Submit → createPassCheckout → redirect to Stripe (mode: payment)
 *   7. After payment, the webhook sets tier='analyst' with accessExpiresAt=+30d
 *
 * URL validation is duplicated client + server: client gives instant feedback,
 * server is the source of truth and re-validates before creating the session.
 */

const SITE_URL = "https://biocharpro.io";

/** Matches the server-side validation: must be a real post URL, not a homepage/profile. */
function isValidSocialShareUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.host.toLowerCase().replace(/^www\./, "");
    // X / Twitter: /<user>/status/<id>
    if (host === "x.com" || host === "twitter.com") {
      return /^\/[a-zA-Z0-9_]{1,15}\/status\/\d+/.test(url.pathname);
    }
    // LinkedIn: /posts/<slug> or /feed/update/<urn>
    if (host === "linkedin.com") {
      return /^\/(posts\/|feed\/update\/)/.test(url.pathname);
    }
    return false;
  } catch {
    return false;
  }
}

interface CarbonForumPassButtonProps {
  /** Classes applied to the primary button so it fits different hero / promo layouts. */
  className?: string;
  /** Button label override. */
  label?: string;
}

export default function CarbonForumPassButton({ className, label }: CarbonForumPassButtonProps) {
  const { t } = useTranslation("pass");
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
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

  const hasValidShareUrl = useMemo(() => isValidSocialShareUrl(shareUrl), [shareUrl]);

  // Pre-filled share templates. LinkedIn ignores text in the share URL and
  // uses OG metadata from the target page, so we only pass `url`. X accepts
  // both text and url, so we send the full post.
  const shareText = t("shareTemplate");
  const linkedInShareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(SITE_URL)}&title=${encodeURIComponent("Biochar Optimizer Pro")}&summary=${encodeURIComponent(shareText)}`;
  const xShareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(SITE_URL)}`;

  const handleClick = () => {
    setError(null);
    setOpen(true);
  };

  const openShare = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const submitFull = () => {
    if (!isAuthenticated) {
      setLocation("/login?signup=1&from=pass");
      return;
    }
    setError(null);
    createPassCheckout.mutate({ passId: "carbon_forum_2026_full" });
  };

  const submitSocial = () => {
    if (!isAuthenticated) {
      setLocation("/login?signup=1&from=pass");
      return;
    }
    if (!hasValidShareUrl) {
      setError(t("invalidShareUrl"));
      return;
    }
    setError(null);
    createPassCheckout.mutate({
      passId: "carbon_forum_2026_social",
      socialProofUrl: shareUrl.trim(),
    });
  };

  const close = () => {
    if (createPassCheckout.isPending) return;
    setOpen(false);
    setError(null);
    setShareUrl("");
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
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl my-auto">
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
            <div className="p-5 space-y-5">
              {!isAuthenticated ? (
                <>
                  <p className="text-sm text-muted-foreground">{t("needAccount")}</p>
                  <Button
                    type="button"
                    onClick={() => setLocation("/login?signup=1&from=pass")}
                    className="w-full"
                  >
                    {t("signInOrCreate")}
                  </Button>
                </>
              ) : (
                <>
                  {/* What you get */}
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

                  {/* Price block — flips from $100 to $50 when a valid share URL is pasted */}
                  <div className="bg-secondary/30 border border-border rounded-lg p-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">{t("total")}</span>
                      <div className="text-right">
                        {hasValidShareUrl ? (
                          <>
                            <span className="text-xs text-muted-foreground line-through mr-1.5">$100</span>
                            <span className="text-2xl font-bold text-green-600 dark:text-green-400">$50</span>
                          </>
                        ) : (
                          <span className="text-2xl font-bold text-foreground">$100</span>
                        )}
                        <span className="text-xs font-normal text-muted-foreground ml-1">{t("oneTime")}</span>
                      </div>
                    </div>
                    {hasValidShareUrl && (
                      <div className="text-[10px] text-green-600 dark:text-green-400 mt-1 text-right font-semibold">
                        {t("discountUnlocked")}
                      </div>
                    )}
                  </div>

                  {/* Share & save $50 */}
                  <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-4 space-y-3">
                    <div>
                      <div className="text-xs font-bold text-green-700 dark:text-green-300 uppercase tracking-wider">
                        {t("shareSaveTitle")}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{t("shareSaveHint")}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openShare(linkedInShareUrl)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg bg-[#0A66C2] text-white hover:bg-[#084d92] transition-colors"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                        LinkedIn
                      </button>
                      <button
                        type="button"
                        onClick={() => openShare(xShareUrl)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
                      >
                        <span className="text-[13px] font-black leading-none">𝕏</span>
                        X / Twitter
                      </button>
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                        {t("pasteUrlLabel")}
                      </label>
                      <div className="relative">
                        <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          type="url"
                          value={shareUrl}
                          onChange={(e) => {
                            setShareUrl(e.target.value);
                            if (error) setError(null);
                          }}
                          placeholder="https://www.linkedin.com/posts/..."
                          autoComplete="off"
                          spellCheck={false}
                          className="w-full pl-8 pr-8 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                        />
                        {hasValidShareUrl && (
                          <CheckCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-500" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{t("pasteUrlHint")}</p>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-500">{error}</p>
                    </div>
                  )}

                  {/* CTA */}
                  <Button
                    type="button"
                    onClick={hasValidShareUrl ? submitSocial : submitFull}
                    disabled={createPassCheckout.isPending}
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {createPassCheckout.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t("redirecting")}
                      </>
                    ) : hasValidShareUrl ? (
                      <>{t("continueAt50")}</>
                    ) : (
                      <>{t("continueAt100")}</>
                    )}
                  </Button>

                  <p className="text-[10px] text-center text-muted-foreground">{t("stripeNote")}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
