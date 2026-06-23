/**
 * Methodology Coverage TEASER — landing page section.
 *
 * Compact preview of the 6 methodologies we cover. Full content lives at
 * /product/methodologies.
 *
 * Visual: matches the Journey/AI-Builder sections — gradient ambient blobs,
 * centered badge + bold title, color-graded methodology cards with hover
 * glow. Each methodology is a portal to its dedicated detail page.
 */

import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, CheckCircle2, Clock, Award, DollarSign, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  METHODOLOGIES,
  getMethodologyDurability,
  getMethodologyLaunchStage,
  type MethodologyId,
} from "@/lib/methodologies";

const DISPLAY_ORDER: MethodologyId[] = [
  "puro-earth",
  "isometric",
  "verra-vm0044",
  "rainbow-standard",
  "gold-standard",
  "ebc",
];

// Per-methodology accent gradients — used on the card border-glow + icon bg.
// Map onto the same color families METHODOLOGIES already uses.
const METHODOLOGY_GRADIENT: Record<MethodologyId, string> = {
  "puro-earth":       "from-green-500/20 to-emerald-600/10",
  "isometric":        "from-blue-500/20 to-indigo-600/10",
  "verra-vm0044":     "from-purple-500/20 to-violet-600/10",
  "ebc":              "from-emerald-500/20 to-teal-600/10",
  "gold-standard":    "from-amber-500/20 to-orange-600/10",
  "rainbow-standard": "from-pink-500/20 to-fuchsia-600/10",
};

const METHODOLOGY_RING: Record<MethodologyId, string> = {
  "puro-earth":       "hover:border-green-500/40 hover:shadow-green-500/10",
  "isometric":        "hover:border-blue-500/40 hover:shadow-blue-500/10",
  "verra-vm0044":     "hover:border-purple-500/40 hover:shadow-purple-500/10",
  "ebc":              "hover:border-emerald-500/40 hover:shadow-emerald-500/10",
  "gold-standard":    "hover:border-amber-500/40 hover:shadow-amber-500/10",
  "rainbow-standard": "hover:border-pink-500/40 hover:shadow-pink-500/10",
};

export default function MethodologyCoverage() {
  const { t, i18n } = useTranslation("landing");

  return (
    <section className="py-16 md:py-20 border-t border-border bg-gradient-to-b from-background via-emerald-500/[0.03] to-background relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 relative">
        {/* Centered header — matches Journey/AI Builder */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
            <Award className="w-3 h-3" />
            {t("coverage.badge", { defaultValue: "Methodology coverage" })}
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
            {t("coverage.title", { defaultValue: "La puerta de cada certificador, en un lugar" })}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("coverage.teaserSubtitle", { defaultValue: "Tu proyecto se evalúa en vivo contra cada metodología — precios, durabilidad, checks." })}
          </p>
        </div>

        {/* 6 methodologies in 3×2 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {DISPLAY_ORDER.map((id) => {
            const m = METHODOLOGIES[id];
            const isActive = getMethodologyLaunchStage(id) === "active";
            const gradient = METHODOLOGY_GRADIENT[id];
            const ring = METHODOLOGY_RING[id];
            const durability = getMethodologyDurability(id, i18n.language);
            return (
              <Link
                key={id}
                href="/product/methodologies"
                className={`relative bg-card border border-border rounded-xl p-5 transition-all hover:shadow-xl group overflow-hidden ${ring}`}
              >
                {/* Color wash on hover */}
                <div
                  className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br ${gradient} pointer-events-none`}
                />

                <div className="relative">
                  {/* Top row: name + status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className={`font-bold text-lg leading-tight ${m.color}`}>
                        {m.shortName}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
                        {m.credits
                          ? t("coverage.typeCredit", { defaultValue: "Credit-issuing" })
                          : t("coverage.typeQuality", { defaultValue: "Quality cert" })}
                      </div>
                    </div>
                    {isActive ? (
                      <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {t("coverage.statusActive", { defaultValue: "Active" })}
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        <Clock className="w-2.5 h-2.5" />
                        {t("coverage.statusPreparation", { defaultValue: "In preparation" })}
                      </span>
                    )}
                  </div>

                  {/* Stat strip: price + durability */}
                  <div className="space-y-1.5 mt-4 pt-3 border-t border-border/60">
                    {m.priceRange && (
                      <div className="flex items-center gap-2 text-xs">
                        <DollarSign className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-foreground/80 font-medium">{m.priceRange}</span>
                      </div>
                    )}
                    {durability && (
                      <div className="flex items-center gap-2 text-xs">
                        <Shield className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">{durability}</span>
                      </div>
                    )}
                    {!m.priceRange && !m.durability && m.tagline && (
                      <div className="text-xs text-muted-foreground leading-snug">{m.tagline}</div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Centered CTA */}
        <div className="text-center">
          <Link href="/product/methodologies">
            <Button size="lg" variant="outline" className="gap-2 text-sm">
              {t("coverage.viewAll", { defaultValue: "Ver todas en detalle" })}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
