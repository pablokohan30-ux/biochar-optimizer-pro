/**
 * /product/methodologies — full coverage breakdown of every methodology.
 *
 * Originally lived as a 6-card grid section ("Methodology Coverage") on the
 * landing. Moved here so the landing can stay tighter; the landing keeps a
 * teaser + CTA pointing to this page.
 *
 * Same content the landing was showing, just rendered with more breathing
 * room and a richer description per certifier.
 */

import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, ArrowRight, Award, DollarSign, Layers,
  Clock, Sparkles, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoLink from "@/components/LogoLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SiteFooter from "@/components/SiteFooter";
import {
  ACTIVE_METHODOLOGIES,
  METHODOLOGIES,
  getMethodologyDurability,
  getMethodologyDurabilityNote,
  getMethodologyLaunchStage,
  getMethodologyPriceNote,
  getMethodologyTagline,
  type MethodologyId,
} from "@/lib/methodologies";

const DISPLAY_ORDER: MethodologyId[] = [
  "puro-earth",
  "isometric",
  "verra-vm0044",
  "rainbow-standard",
  "ebc",
  "gold-standard",
];

export default function Methodologies() {
  const { t, i18n } = useTranslation(["landing", "common"]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* NAV */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <LogoLink variant="compact" iconType="flame" showSubtitle={false} />
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Link href="/pricing" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">{t("common:nav.pricing")}</Button>
            </Link>
            <Link href="/app">
              <Button size="sm" className="whitespace-nowrap">{t("common:nav.tryForFree")}</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pt-6 w-full">
        <Link href="/">
          <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> {t("common:cta.back")}
          </button>
        </Link>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-20 relative">
          <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
            <Sparkles className="w-3 h-3" />
            {t("landing:coverage.badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
            {t("landing:coverage.title")}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
            {t("landing:coverage.subtitle")}
          </p>
        </div>
      </section>

      {/* CARDS — full grid */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DISPLAY_ORDER.map((id) => {
              const m = METHODOLOGIES[id];
              const stage = getMethodologyLaunchStage(id);
              const isActive = stage === "active";
              const showChecks = ACTIVE_METHODOLOGIES.includes(id);
              const autoCount = m.checks.filter((c) => c.type === "auto").length;
              const manualCount = m.checks.filter((c) => c.type === "manual").length;
              const tagline = getMethodologyTagline(id, i18n.language);
              const priceNote = getMethodologyPriceNote(id, i18n.language);
              const durability = getMethodologyDurability(id, i18n.language);
              const durabilityNote = getMethodologyDurabilityNote(id, i18n.language);

              return (
                <div
                  key={id}
                  className={`relative bg-card border rounded-xl p-5 transition-colors flex flex-col ${
                    isActive ? "border-border hover:border-primary/40" : "border-dashed border-border/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className={`text-lg font-bold ${m.color} leading-tight`}>{m.shortName}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
                        {m.credits ? t("landing:coverage.typeCredit") : t("landing:coverage.typeQuality")}
                      </div>
                    </div>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full flex-shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {t("landing:coverage.statusActive")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full flex-shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {t("landing:coverage.statusPreparation", { defaultValue: "In preparation" })}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">{tagline}</p>

                  {/* Price */}
                  <div className="border-t border-border pt-3 mb-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign className="w-3 h-3 text-muted-foreground" />
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t("landing:coverage.marketPrice")}
                      </div>
                    </div>
                    <div className="text-sm font-mono font-bold">
                      {m.priceRange ?? t("landing:coverage.notApplicable")}
                    </div>
                    {priceNote && (
                      <div className="text-[10px] text-muted-foreground leading-snug mt-0.5">{priceNote}</div>
                    )}
                  </div>

                  {/* Durability */}
                  <div className="border-t border-border pt-3 mb-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Award className="w-3 h-3 text-muted-foreground" />
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t("landing:coverage.durability")}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">{durability ?? "—"}</div>
                    {durabilityNote && (
                      <div className="text-[10px] text-muted-foreground leading-snug mt-0.5">{durabilityNote}</div>
                    )}
                  </div>

                  {/* Checks */}
                  {showChecks && (
                    <div className="border-t border-border pt-3 mt-auto">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Layers className="w-3 h-3 text-muted-foreground" />
                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {t("landing:coverage.coverage")}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-mono font-bold text-foreground">{autoCount}</span>{" "}
                        {t("landing:coverage.autoChecks")}
                        {" · "}
                        <span className="font-mono font-bold text-foreground">{manualCount}</span>{" "}
                        {t("landing:coverage.manualChecks")}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-8 max-w-lg mx-auto">
            {t("landing:coverage.footerText")}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-border bg-secondary/20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            {t("landing:methodologiesPage.ctaTitle", { defaultValue: "Prueba tu proyecto contra cada metodología" })}
          </h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
            {t("landing:methodologiesPage.ctaBody", {
              defaultValue:
                "Carga tu biomasa, ajusta temperatura y tiempo, y ve en vivo cómo tu proyecto puntúa contra cinco metodologías activas y la ruta Gold Standard en preparación.",
            })}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/demo">
              <Button size="lg" className="gap-2">
                {t("landing:methodologiesPage.ctaPrimary", { defaultValue: "Ver demo en vivo" })} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/app">
              <Button size="lg" variant="outline" className="gap-2">
                {t("landing:methodologiesPage.ctaSecondary", { defaultValue: "Probar el simulador" })}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
