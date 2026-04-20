import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Linkedin, Link2, CheckCircle, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

const SITE_URL = "https://biocharpro.io";

/** Matches the server-side validation: must be a real post URL, not a homepage/profile. */
function isValidSocialShareUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.host.toLowerCase().replace(/^www\./, "");
    if (host === "x.com" || host === "twitter.com") {
      return /^\/[a-zA-Z0-9_]{1,15}\/status\/\d+/.test(url.pathname);
    }
    if (host === "linkedin.com") {
      return /^\/(posts\/|feed\/update\/)/.test(url.pathname);
    }
    return false;
  } catch {
    return false;
  }
}

interface SocialShareUnlockProps {
  open: boolean;
  onClose: () => void;
  /** Called after credits are successfully claimed. */
  onUnlocked?: (credits: number) => void;
}

/**
 * Modal that lets free users unlock 3 AI biomass analyses by sharing on social media.
 *
 * Flow:
 *  1. User clicks LinkedIn / X share button → pre-filled post opens in new tab
 *  2. User publishes the post, copies the URL
 *  3. User pastes the URL here → client validates, submit → server grants 3 credits
 */
export default function SocialShareUnlock({ open, onClose, onUnlocked }: SocialShareUnlockProps) {
  const { t: tr } = useTranslation("home");
  const { t: tp } = useTranslation("pass");
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasValidUrl = useMemo(() => isValidSocialShareUrl(shareUrl), [shareUrl]);

  // Use the same bilingual share template as the Carbon Forum pass
  const shareText = tp("shareTemplate");
  const linkedInShareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(SITE_URL)}&title=${encodeURIComponent("Biochar Optimizer Pro")}&summary=${encodeURIComponent(shareText)}`;
  const xShareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(SITE_URL)}`;

  const utils = trpc.useUtils();
  const claimCredits = trpc.biomass.claimSocialShareCredits.useMutation({
    onSuccess: (data) => {
      if (data.credits > 0) {
        utils.biomass.getCredits.invalidate();
        onUnlocked?.(data.credits);
        handleClose();
      }
    },
    onError: (err) => {
      setError(err.message || tr("connectionError"));
    },
  });

  const openShare = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSubmit = () => {
    setError(null);
    if (!hasValidUrl) {
      setError(tr("shareUnlockInvalidUrl"));
      return;
    }
    claimCredits.mutate({ url: shareUrl.trim() });
  };

  const handleClose = () => {
    if (claimCredits.isPending) return;
    setShareUrl("");
    setError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="font-bold text-base">{tr("shareUnlockTitle")}</h2>
              <p className="text-xs text-muted-foreground">{tr("shareUnlockDesc")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={claimCredits.isPending}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Steps */}
          <div className="space-y-2">
            {[tr("shareUnlockStep1"), tr("shareUnlockStep2"), tr("shareUnlockStep3")].map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-[11px] font-bold text-green-600 dark:text-green-400 flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm">{step}</span>
              </div>
            ))}
          </div>

          {/* Share buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openShare(linkedInShareUrl)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-3 rounded-lg bg-[#0A66C2] text-white hover:bg-[#084d92] transition-colors"
            >
              <Linkedin className="w-3.5 h-3.5" />
              LinkedIn
            </button>
            <button
              type="button"
              onClick={() => openShare(xShareUrl)}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 px-3 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              <span className="text-[13px] font-black leading-none">𝕏</span>
              X / Twitter
            </button>
          </div>

          {/* URL input */}
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              {tr("shareUnlockPasteLabel")}
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
              {hasValidUrl && (
                <CheckCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-500" />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{tr("shareUnlockPasteHint")}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}

          {/* CTA */}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!hasValidUrl || claimCredits.isPending}
            className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
          >
            {claimCredits.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {tr("shareUnlockSubmitting")}
              </>
            ) : (
              tr("shareUnlockSubmit")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
