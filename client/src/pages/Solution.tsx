/**
 * Vertical-specific landing pages — `/solutions/:vertical`
 *
 * One component, six verticals driven by URL param and i18n keys.
 * Each vertical has its own content namespace: `landing:solutions.<vertical>.*`
 *
 * Verticals:
 *   - developer      → Project Developers
 *   - consultant     → Consultants / Advisory
 *   - trader         → Carbon Traders / Funds
 *   - agribusiness   → Agribusiness / Food & Beverage
 *   - integrator     → Integrators / ERPs (API-first)
 *   - researcher     → Researchers / Academia
 */

import { Link, useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, ArrowRight, CheckCircle, Zap, TrendingUp,
  Building2, Briefcase, Wheat, Code2, GraduationCap,
  FileText, Layers, Database, Microscope, AlertTriangle,
  Clock, DollarSign, ShieldCheck, Target, Sparkles
} from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import LogoLink from "@/components/LogoLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SiteFooter from "@/components/SiteFooter";

type Vertical = "developer" | "consultant" | "trader" | "agribusiness" | "integrator" | "researcher";

const VERTICAL_CONFIG: Record<Vertical, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  accent: string;
  tier: "analyst" | "developer" | "engineer";
  /** Where the primary CTA leads. Default "/app"; override when the CTA
   *  text implies a different destination (e.g. integrator → "Ver docs API"). */
  primaryHref: string;
  /** Where the secondary CTA leads. Default "/pricing"; override similarly. */
  secondaryHref: string;
}> = {
  developer:    { icon: Building2,      color: "text-green-500",   accent: "from-green-500/10 to-transparent",   tier: "engineer",  primaryHref: "/app", secondaryHref: "/pricing" },
  consultant:   { icon: Briefcase,      color: "text-blue-500",    accent: "from-blue-500/10 to-transparent",    tier: "developer", primaryHref: "/app", secondaryHref: "/pricing" },
  trader:       { icon: TrendingUp,     color: "text-purple-500",  accent: "from-purple-500/10 to-transparent",  tier: "developer", primaryHref: "/app", secondaryHref: "/api" },
  agribusiness: { icon: Wheat,          color: "text-amber-500",   accent: "from-amber-500/10 to-transparent",   tier: "analyst",   primaryHref: "/app", secondaryHref: "/pricing" },
  integrator:   { icon: Code2,          color: "text-cyan-500",    accent: "from-cyan-500/10 to-transparent",    tier: "developer", primaryHref: "/api", secondaryHref: "/app" },
  researcher:   { icon: GraduationCap,  color: "text-red-500",     accent: "from-red-500/10 to-transparent",     tier: "developer", primaryHref: "/app", secondaryHref: "/api" },
};

const PAIN_ICONS = [Clock, DollarSign, AlertTriangle, Target];
const SOLUTION_ICONS = [Zap, Layers, Database, Microscope, FileText, ShieldCheck];

export default function Solution() {
  const params = useParams<{ vertical: string }>();
  const [, setLocation] = useLocation();
  const { t } = useTranslation(["landing", "common"]);
  const vertical = params.vertical as Vertical;

  // Validate vertical
  useEffect(() => {
    if (!VERTICAL_CONFIG[vertical]) setLocation("/404");
  }, [vertical, setLocation]);

  if (!VERTICAL_CONFIG[vertical]) return null;

  const config = VERTICAL_CONFIG[vertical];
  const Icon = config.icon;
  const baseKey = `landing:solutions.${vertical}`;

  // Pull arrays from i18n
  const pains = (t(`${baseKey}.pains`, { returnObjects: true, defaultValue: [] }) as Array<{ title: string; desc: string }>) || [];
  const solutions = (t(`${baseKey}.solutions`, { returnObjects: true, defaultValue: [] }) as Array<{ title: string; desc: string }>) || [];

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

      {/* Back to solutions overview */}
      <div className="max-w-5xl mx-auto px-4 pt-6 w-full">
        <Link href="/">
          <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> {t("common:cta.back")}
          </button>
        </Link>
      </div>

      {/* HERO */}
      <section className={`relative overflow-hidden bg-gradient-to-b ${config.accent}`}>
        <div className="max-w-5xl mx-auto px-4 py-16 md:py-24">
          <div className="inline-flex items-center gap-1.5 bg-card border border-border text-[11px] font-bold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">
            <Icon className={`w-3 h-3 ${config.color}`} />
            {t(`${baseKey}.badge`)}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1] max-w-3xl">
            {t(`${baseKey}.title`)}
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl leading-relaxed">
            {t(`${baseKey}.subtitle`)}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={config.primaryHref}>
              <Button size="lg" className="gap-2 text-base px-8">
                <Zap className="w-4 h-4" />
                {t(`${baseKey}.ctaPrimary`)}
              </Button>
            </Link>
            <Link href={config.secondaryHref}>
              <Button size="lg" variant="outline" className="gap-2 text-base px-8">
                {t(`${baseKey}.ctaSecondary`)}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* PAINS */}
      {pains.length > 0 && (
        <section className="py-16 border-t border-border">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
                <AlertTriangle className="w-3 h-3" />
                {t(`${baseKey}.painsBadge`)}
              </div>
              <h2 className="text-3xl font-bold mb-3">{t(`${baseKey}.painsTitle`)}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pains.map((pain, idx) => {
                const PainIcon = PAIN_ICONS[idx % PAIN_ICONS.length];
                return (
                  <div key={idx} className="bg-card border border-border rounded-xl p-5">
                    <PainIcon className="w-5 h-5 text-red-500 mb-3" />
                    <h3 className="font-semibold text-sm mb-1.5">{pain.title}</h3>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{pain.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* SOLUTIONS */}
      {solutions.length > 0 && (
        <section className="py-16 border-t border-border bg-gradient-to-b from-primary/5 via-transparent to-transparent">
          <div className="max-w-5xl mx-auto px-4">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                {t(`${baseKey}.solutionsBadge`)}
              </div>
              <h2 className="text-3xl font-bold mb-3">{t(`${baseKey}.solutionsTitle`)}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {solutions.map((sol, idx) => {
                const SolIcon = SOLUTION_ICONS[idx % SOLUTION_ICONS.length];
                return (
                  <div key={idx} className="bg-card border border-border rounded-xl p-5">
                    <SolIcon className={`w-5 h-5 ${config.color} mb-3`} />
                    <h3 className="font-semibold text-sm mb-1.5">{sol.title}</h3>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">{sol.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* TIER RECOMMENDATION */}
      <section className="py-16 border-t border-border">
        <div className={`${vertical === "trader" ? "max-w-5xl" : "max-w-3xl"} mx-auto px-4`}>
          {vertical === "trader" ? (
            // 2-phase tier progression (trader-specific)
            <div>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
                  <CheckCircle className="w-3 h-3" />
                  {t(`${baseKey}.tierBadge`)}
                </div>
                <h3 className="text-2xl font-bold mb-3">{t(`${baseKey}.tierTitle`)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                  {t(`${baseKey}.tierDescription`)}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                {(["phase1", "phase2"] as const).map((phase, idx) => {
                  const bullets = (t(`${baseKey}.tierProgression.${phase}.bullets`, { returnObjects: true, defaultValue: [] }) as string[]) || [];
                  const isPhase1 = phase === "phase1";
                  return (
                    <div
                      key={phase}
                      className={`bg-card border rounded-xl p-6 ${
                        isPhase1 ? "border-blue-500/30" : "border-purple-500/30"
                      }`}
                    >
                      <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full mb-4 uppercase tracking-wider ${
                        isPhase1
                          ? "bg-blue-500/10 border border-blue-500/20 text-blue-500"
                          : "bg-purple-500/10 border border-purple-500/20 text-purple-500"
                      }`}>
                        <span className="font-mono">{idx + 1}</span>
                        {t(`${baseKey}.tierProgression.${phase}.badge`)}
                      </div>
                      <h4 className="font-bold text-lg mb-2">{t(`${baseKey}.tierProgression.${phase}.title`)}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                        {t(`${baseKey}.tierProgression.${phase}.description`)}
                      </p>
                      <ul className="space-y-1.5 mb-4">
                        {bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <CheckCircle className={`w-3 h-3 mt-0.5 flex-shrink-0 ${
                              isPhase1 ? "text-blue-500" : "text-purple-500"
                            }`} />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                      <div className={`text-[11px] italic leading-relaxed pt-3 border-t border-border ${
                        isPhase1 ? "text-blue-500/80" : "text-purple-500/80"
                      }`}>
                        {t(`${baseKey}.tierProgression.${phase}.idealFor`)}
                      </div>
                    </div>
                  );
                })}
                {/* Arrow between phases (desktop only) */}
                <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-primary/20 border border-primary/40 rounded-full items-center justify-center z-10 pointer-events-none">
                  <ArrowRight className="w-4 h-4 text-primary" />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                <Link href={config.primaryHref}>
                  <Button size="lg" className="gap-2">
                    <Zap className="w-4 h-4" />
                    {t(`${baseKey}.ctaPrimary`)}
                  </Button>
                </Link>
                <Link href={config.secondaryHref}>
                  <Button size="lg" variant="outline" className="gap-2">
                    {t(`${baseKey}.ctaSecondary`)}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            // Single-tier recommendation (all other verticals)
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
                <CheckCircle className="w-3 h-3" />
                {t(`${baseKey}.tierBadge`)}
              </div>
              <h3 className="text-2xl font-bold mb-3">{t(`${baseKey}.tierTitle`)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-xl mx-auto">
                {t(`${baseKey}.tierDescription`)}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={config.primaryHref}>
                  <Button size="lg" className="gap-2">
                    <Zap className="w-4 h-4" />
                    {t(`${baseKey}.ctaPrimary`)}
                  </Button>
                </Link>
                <Link href={config.secondaryHref}>
                  <Button size="lg" variant="outline" className="gap-2">
                    {t(`${baseKey}.ctaSecondary`)}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
