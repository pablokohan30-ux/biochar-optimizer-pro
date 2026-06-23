import { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Lock, Flame, Sparkles, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import GuideLink from "@/components/GuideLink";
import LCAModule from "@/components/LCAModule";
import { useTier } from "@/hooks/useTier";
import { Button } from "@/components/ui/button";
import type { LCAInputs } from "@/lib/lcaModel";

// Pre-fill max age: 30 minutes. After that we ignore it so a user doesn't
// accidentally load stale data from a previous session.
const PREFILL_MAX_AGE_MS = 30 * 60 * 1000;

function readPrefill(): Partial<LCAInputs> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("lca:prefill");
    const ts = localStorage.getItem("lca:prefillTimestamp");
    if (!raw || !ts) return null;
    if (Date.now() - Number(ts) > PREFILL_MAX_AGE_MS) {
      localStorage.removeItem("lca:prefill");
      localStorage.removeItem("lca:prefillTimestamp");
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function clearPrefill() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("lca:prefill");
    localStorage.removeItem("lca:prefillTimestamp");
  } catch {
    // noop
  }
}

export default function LCAPage() {
  const [, setLocation] = useLocation();
  const { tier, hasAccess } = useTier();
  const { t } = useTranslation("lca");
  const canAccess = hasAccess("analyst");

  const [prefill, setPrefill] = useState<Partial<LCAInputs> | null>(() => readPrefill());
  // Re-read on mount in case the page was opened programmatically after the
  // simulator wrote to localStorage (SPA navigation, no reload).
  useEffect(() => {
    setPrefill(readPrefill());
  }, []);

  const handleDismissPrefill = () => {
    clearPrefill();
    setPrefill(null);
  };

  return (
    <AppLayout
      pageTitle={<span className="flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> LCA</span>}
      fullBleed
    >
      <div className="max-w-[1600px] mx-auto px-4 py-4 min-h-[calc(100vh-120px)]">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground -ml-2"
            onClick={() => {
              setLocation("/app");
            }}
          >
            <ArrowLeft className="w-3 h-3" /> {t("back")}
          </Button>
          <GuideLink anchor="resultados-lca" label="Cómo leer el LCA" />
        </div>

        {canAccess ? (
          <>
            {prefill && (
              <div className="mb-4 bg-green-500/5 border border-green-500/30 rounded-lg px-4 py-3 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-foreground mb-0.5">
                    {t("prefill.title", { biomass: prefill.biomassType ?? t("prefill.customBiomass") })}
                  </div>
                  <div className="text-muted-foreground">
                    {t("prefill.description")}
                  </div>
                </div>
                <button
                  onClick={handleDismissPrefill}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                  title={t("prefill.dismiss")}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <LCAModule initialInputs={prefill ?? undefined} />
          </>
        ) : (
          <div className="max-w-xl mx-auto mt-12 bg-card border border-border rounded-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold mb-2">{t("gate.title")}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("gate.description")}
            </p>
            <div className="text-left text-[11px] text-muted-foreground bg-secondary/30 rounded-lg p-3 mb-4">
              <div className="font-semibold text-foreground mb-1">{t("gate.whatYouGet")}</div>
              <ul className="space-y-0.5">
                <li>{t("gate.features.f1")}</li>
                <li>{t("gate.features.f2")}</li>
                <li>{t("gate.features.f3")}</li>
                <li>{t("gate.features.f4")}</li>
                <li>{t("gate.features.f5")}</li>
                <li>{t("gate.features.f6")}</li>
              </ul>
            </div>
            <Link href="/pricing">
              <Button className="gap-2">
                <Flame className="w-4 h-4" />
                {t("gate.upgradeCta")}
              </Button>
            </Link>
            <p className="text-[10px] text-muted-foreground mt-3">
              {t("gate.passHint")} <Link href="/pricing"><span className="text-primary hover:underline">{t("gate.passLink")}</span></Link>
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
