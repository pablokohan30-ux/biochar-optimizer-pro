import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Lock, Flame, Sparkles, X } from "lucide-react";
import LogoLink from "@/components/LogoLink";
import LCAModule from "@/components/LCAModule";
import SiteFooter from "@/components/SiteFooter";
import LanguageSwitcher from "@/components/LanguageSwitcher";
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
  const { tier, hasAccess } = useTier();
  // TEMP: Allow preview via ?preview=1 query so the Carbon Forum attendees can see it before subscribing.
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const isPreview = params?.get("preview") === "1";
  const canAccess = hasAccess("analyst") || isPreview;

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
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between">
          <LogoLink variant="compact" iconType="flame" showSubtitle={false} />
          <div className="flex items-center gap-2">
            <Link href="/app">
              <Button variant="ghost" size="sm">Simulator</Button>
            </Link>
            <Link href="/projects">
              <Button variant="ghost" size="sm">Projects</Button>
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto px-4 py-4 min-h-[calc(100vh-120px)]">
        <Link href="/app">
          <Button variant="ghost" size="sm" className="gap-1 mb-2 text-muted-foreground -ml-2">
            <ArrowLeft className="w-3 h-3" /> Back to simulator
          </Button>
        </Link>

        {canAccess ? (
          <>
            {prefill && (
              <div className="mb-4 bg-green-500/5 border border-green-500/30 rounded-lg px-4 py-3 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs">
                  <div className="font-semibold text-foreground mb-0.5">
                    Pre-filled from simulator — {prefill.biomassType ?? "custom biomass"}
                  </div>
                  <div className="text-muted-foreground">
                    Biochar properties (C, H, yield, moisture) loaded from your last simulation. Capacity, transport, energy and infrastructure stay at reference defaults — edit them to match your project.
                  </div>
                </div>
                <button
                  onClick={handleDismissPrefill}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                  title="Dismiss — reloads reference defaults"
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
            <h2 className="text-xl font-bold mb-2">LCA Module — Analyst plan</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Full Life Cycle Assessment with Puro.earth Edition 2025 methodology —
              C_stored, C_loss, E_project, E_leakage and CORC calculation with live
              validation against Tabla 6.1 permanence coefficients.
            </p>
            <div className="text-left text-[11px] text-muted-foreground bg-secondary/30 rounded-lg p-3 mb-4">
              <div className="font-semibold text-foreground mb-1">What you get:</div>
              <ul className="space-y-0.5">
                <li>• 6-section interactive LCA form</li>
                <li>• Real-time CORC calculation (Eq. 5.1)</li>
                <li>• Permanence Factor lookup (Tabla 6.1)</li>
                <li>• E_biomass / E_production / E_use / E_emb breakdown</li>
                <li>• 6 automatic validations (H/C_org, PF, CORCs &gt; 0, etc.)</li>
                <li>• Reference case pre-loaded (53,946 tCO₂/yr)</li>
              </ul>
            </div>
            <Link href="/pricing">
              <Button className="gap-2">
                <Flame className="w-4 h-4" />
                Upgrade to Analyst ($299/mo)
              </Button>
            </Link>
            <p className="text-[10px] text-muted-foreground mt-3">
              Or grab the <Link href="/pricing"><span className="text-primary hover:underline">Carbon Forum Pass — from $50 for 30 days</span></Link>
            </p>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
