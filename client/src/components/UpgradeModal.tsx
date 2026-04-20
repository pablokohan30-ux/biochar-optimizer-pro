import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Lock, CheckCircle, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { TierId } from "@/hooks/useTier";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  requiredTier: TierId;
}

const TIER_NAMES: Record<TierId, string> = {
  free: "Explorer",
  analyst: "Analyst",
  developer: "Developer",
  engineer: "Engineer",
  expert: "Expert",
};

const TIER_PRICES: Record<TierId, number> = {
  free: 0,
  analyst: 299,
  developer: 499,
  engineer: 799,
  expert: 999,
};

// Feature lists moved to i18n (upgrade.features.*)

export default function UpgradeModal({ isOpen, onClose, featureName, requiredTier }: UpgradeModalProps) {
  const { t } = useTranslation("upgrade");
  const { isAuthenticated } = useAuth();
  const createCheckout = trpc.subscription.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.info(t("redirecting"));
      }
    },
    onError: (err) => {
      toast.error(t("checkoutError") + ": " + err.message);
    },
  });

  if (!isOpen) return null;

  const handleSubscribe = () => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    createCheckout.mutate({ tierId: requiredTier as "analyst" | "developer" | "engineer" | "expert" });
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-base">{t("premiumFeature")}</h2>
              <p className="text-xs text-muted-foreground">{featureName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("requires")}{" "}
            <span className="font-semibold text-foreground">{TIER_NAMES[requiredTier]}</span> {t("orHigher")}
          </p>

          <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {t("includedIn", { tier: TIER_NAMES[requiredTier] })}
            </p>
            {(t(`features.${requiredTier}`, { returnObjects: true }) as string[]).map((feat: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">${TIER_PRICES[requiredTier]}</span>
            <span className="text-sm text-muted-foreground">{t("perMonth")}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 pt-0 flex flex-col gap-2">
          <Button
            onClick={handleSubscribe}
            disabled={createCheckout.isPending}
            className="w-full gap-2"
          >
            <Zap className="w-4 h-4" />
            {createCheckout.isPending ? t("processing") : t("subscribeTo", { tier: TIER_NAMES[requiredTier] })}
          </Button>
          <Link href="/pricing">
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={onClose}>
              {t("viewAllPlans")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
