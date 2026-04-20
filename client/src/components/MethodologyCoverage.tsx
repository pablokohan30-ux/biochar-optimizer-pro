/**
 * Methodology Coverage — landing page section.
 *
 * Shows every methodology we cover (active + coming-soon) with:
 *   - Market price range (USD per tCO₂e)
 *   - Durability claim
 *   - Check count (auto + manual)
 *   - Coverage status (active / coming-soon)
 *
 * Why this matters: developers comparing where to submit their project care
 * about PRICE and DURABILITY first, not about check counts. Surfacing this
 * info on the landing is how prospects self-qualify before talking to us.
 *
 * Design inspiration: Supercritical's "Removal methods" grid — each row a
 * methodology card with permanence + price — but adapted to OUR strength
 * (pre-certification readiness, not downstream procurement).
 */

import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Award, ArrowRight, Clock, DollarSign, Layers,
  CheckCircle2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  METHODOLOGIES,
  ACTIVE_METHODOLOGIES,
  type MethodologyId,
} from "@/lib/methodologies";

// Order matters: credit-issuing first (higher business value), quality later.
const DISPLAY_ORDER: MethodologyId[] = [
  "puro-earth",
  "isometric",
  "verra-vm0044",
  "gold-standard",
  "ebc",
  "ibi",
];

export default function MethodologyCoverage() {
  const { t } = useTranslation("landing");

  return (
    <section className="py-20 border-t border-border">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            {t("coverage.badge", { defaultValue: "Methodology coverage" })}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
            {t("coverage.title", { defaultValue: "La puerta de cada certificador, en un lugar" })}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("coverage.subtitle", {
              defaultValue:
                "Tu proyecto se evalúa en vivo contra cada metodología. Precio de mercado, clase de durabilidad y check-list completo — para que sepas cuál te conviene antes de invertir 6 meses de preparación.",
            })}
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DISPLAY_ORDER.map((id) => {
            const m = METHODOLOGIES[id];
            const isActive = ACTIVE_METHODOLOGIES.includes(id);
            const autoCount = m.checks.filter((c) => c.type === "auto").length;
            const manualCount = m.checks.filter((c) => c.type === "manual").length;

            return (
              <div
                key={id}
                className={`relative bg-card border ${
                  isActive ? "border-border hover:border-primary/40" : "border-dashed border-border/60"
                } rounded-xl p-5 transition-colors flex flex-col`}
              >
                {/* Status pill */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className={`text-lg font-bold ${m.color} leading-tight`}>
                      {m.shortName}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                      {m.credits
                        ? t("coverage.typeCredit", { defaultValue: "Credit-issuing" })
                        : t("coverage.typeQuality", { defaultValue: "Quality cert" })}
                    </div>
                  </div>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full flex-shrink-0">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {t("coverage.statusActive", { defaultValue: "Active" })}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full flex-shrink-0">
                      <Clock className="w-2.5 h-2.5" />
                      {t("coverage.statusComingSoon", { defaultValue: "Coming soon" })}
                    </span>
                  )}
                </div>

                {/* Tagline */}
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {m.tagline}
                </p>

                {/* Price */}
                <div className="border-t border-border pt-3 mb-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <DollarSign className="w-3 h-3 text-muted-foreground" />
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t("coverage.marketPrice", { defaultValue: "Market price" })}
                    </div>
                  </div>
                  <div className="text-sm font-mono font-bold">
                    {m.priceRange ?? t("coverage.notApplicable", { defaultValue: "N/A" })}
                  </div>
                  {m.priceNote && (
                    <div className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                      {m.priceNote}
                    </div>
                  )}
                </div>

                {/* Durability */}
                <div className="border-t border-border pt-3 mb-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Award className="w-3 h-3 text-muted-foreground" />
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t("coverage.durability", { defaultValue: "Durability" })}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">{m.durability ?? "—"}</div>
                  {m.durabilityNote && (
                    <div className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                      {m.durabilityNote}
                    </div>
                  )}
                </div>

                {/* Checks */}
                {isActive && (
                  <div className="border-t border-border pt-3 mt-auto">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Layers className="w-3 h-3 text-muted-foreground" />
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t("coverage.coverage", { defaultValue: "Coverage" })}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-mono font-bold text-foreground">{autoCount}</span>{" "}
                      {t("coverage.autoChecks", { defaultValue: "auto checks" })}
                      {" · "}
                      <span className="font-mono font-bold text-foreground">{manualCount}</span>{" "}
                      {t("coverage.manualChecks", { defaultValue: "manual" })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <p className="text-xs text-muted-foreground text-center sm:text-left max-w-lg">
            {t("coverage.footerText", {
              defaultValue:
                "Precios de referencia a 2025, observados en mercados secundarios. Rangos varían por comprador, volumen y durabilidad.",
            })}
          </p>
          <Link href="/demo">
            <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0">
              {t("coverage.cta", { defaultValue: "Ver tu score contra cada una" })}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
