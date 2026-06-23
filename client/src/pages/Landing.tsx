import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Flame, BarChart3, FileText, Beaker, Leaf, Globe,
  Zap, CheckCircle, ArrowRight, Lock, ChevronRight, ChevronDown,
  FlaskConical, Building2, Map, Scale,
  Microscope, Sparkles,
  ClipboardList, Factory, Plug, Shield,
  TrendingUp, Landmark, Wheat, Code2, GraduationCap, Briefcase,
  HelpCircle,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { Button } from "@/components/ui/button";
import LogoLink from "@/components/LogoLink";
import SiteFooter from "@/components/SiteFooter";
import MethodologyCoverage from "@/components/MethodologyCoverage";
import LandingStats from "@/components/LandingStats";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SubscribeButton, { type SubscribeTierId } from "@/components/SubscribeButton";
import { compute_all, FEEDSTOCK_DB } from "@/lib/biocharModel";
import { ENGINEER_MONTHLY_USD } from "@/lib/pricingCatalog";



function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-card/60 transition-colors gap-4"
      >
        <span className="font-medium text-sm">{question}</span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
          {answer}
        </div>
      )}
    </div>
  );
}

/* TIERS and MODULES are built inside the component so they can use t() */



export default function Landing() {
  const { t, i18n } = useTranslation(["landing", "common", "pricing", "market"]);

  const TIERS = useMemo(() => [
    {
      id: "free",
      name: "Explorer",
      price: 0,
      period: "",
      description: t("landing:tiers.explorer.description"),
      color: "border-border",
      badge: null as string | null,
      cta: t("landing:tiers.explorer.cta"),
      ctaVariant: "outline" as const,
      href: "/app",
      features: [
        t("landing:tiers.explorer.features.f1"),
        t("landing:tiers.explorer.features.f2"),
        t("landing:tiers.explorer.features.f3"),
        t("landing:tiers.explorer.features.f4"),
        t("landing:tiers.explorer.features.f5"),
        t("landing:tiers.explorer.features.f6"),
      ],
    },
    {
      id: "analyst",
      name: "Analyst",
      price: 299,
      period: t("landing:tiers.analyst.period"),
      description: t("landing:tiers.analyst.description"),
      color: "border-green-500",
      badge: t("landing:tiers.analyst.badge"),
      cta: t("landing:tiers.analyst.cta"),
      ctaVariant: "default" as const,
      href: "/pricing",
      features: [
        t("landing:tiers.analyst.features.f1"),
        t("landing:tiers.analyst.features.f2"),
        t("landing:tiers.analyst.features.f3"),
        t("landing:tiers.analyst.features.f4"),
        t("landing:tiers.analyst.features.f5"),
        t("landing:tiers.analyst.features.f6"),
        t("landing:tiers.analyst.features.f7"),
        t("landing:tiers.analyst.features.f8"),
      ],
    },
    {
      id: "developer",
      name: "Developer",
      price: 499,
      period: t("landing:tiers.developer.period"),
      description: t("landing:tiers.developer.description"),
      color: "border-blue-500/40",
      badge: null as string | null,
      cta: t("landing:tiers.developer.cta"),
      ctaVariant: "default" as const,
      href: "/pricing",
      features: [
        t("landing:tiers.developer.features.f1"),
        t("landing:tiers.developer.features.f2"),
        t("landing:tiers.developer.features.f3"),
        t("landing:tiers.developer.features.f4"),
      ],
    },
    {
      id: "engineer",
      name: "Engineer",
      price: 799,
      period: t("landing:tiers.engineer.period"),
      description: t("landing:tiers.engineer.description"),
      color: "border-purple-500/40",
      badge: null as string | null,
      cta: t("landing:tiers.engineer.cta"),
      ctaVariant: "default" as const,
      href: "/pricing",
      comingSoon: true,
      features: [
        t("landing:tiers.engineer.features.f1"),
        t("landing:tiers.engineer.features.f2"),
        t("landing:tiers.engineer.features.f3"),
        t("landing:tiers.engineer.features.f4"),
      ],
    },
    {
      id: "expert",
      name: "Expert",
      price: 999,
      period: t("landing:tiers.expert.period"),
      description: t("landing:tiers.expert.description"),
      color: "border-amber-500/40",
      badge: null as string | null,
      cta: t("landing:tiers.expert.cta"),
      ctaVariant: "default" as const,
      href: "/pricing",
      comingSoon: true,
      features: [
        t("landing:tiers.expert.features.f1"),
        t("landing:tiers.expert.features.f2"),
        t("landing:tiers.expert.features.f3"),
        t("landing:tiers.expert.features.f4"),
      ],
    },
  ], [t]);

  const AUDIENCE_CARDS = useMemo(() => [
    {
      key: "developer",
      href: "/solutions/developer",
      icon: Building2,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/25",
    },
    {
      key: "consultant",
      href: "/solutions/consultant",
      icon: Briefcase,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/25",
    },
    {
      key: "agribusiness",
      href: "/solutions/agribusiness",
      icon: Wheat,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/25",
    },
    {
      key: "integrator",
      href: "/solutions/integrator",
      icon: Code2,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
      border: "border-cyan-500/25",
    },
  ], []);

  const DELIVERABLE_HIGHLIGHTS = useMemo(() => [
    {
      key: "pdd",
      icon: ClipboardList,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      title: t("landing:projectPackage.items.pdd.title"),
      desc: t("landing:projectPackage.items.pdd.desc"),
    },
    {
      key: "equipment",
      icon: Factory,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      title: t("landing:projectPackage.items.equipment.title"),
      desc: t("landing:projectPackage.items.equipment.desc"),
    },
    {
      key: "electrical",
      icon: Plug,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      title: t("landing:projectPackage.items.electrical.title"),
      desc: t("landing:projectPackage.items.electrical.desc"),
    },
    {
      key: "certification",
      icon: Shield,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      title: t("landing:projectPackage.items.certification.title"),
      desc: t("landing:projectPackage.items.certification.desc"),
    },
  ], [t]);

  const WORKFLOW_STAGES = useMemo(() => [
    {
      key: "model",
      href: "/app",
      icon: FlaskConical,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/25",
      label: t("landing:journey.stage1Label"),
      title: t("landing:journey.stage1Title"),
      desc: t("landing:journey.stage1Desc"),
      cta: t("landing:journey.stage1Cta"),
      items: [
        t("landing:journey.stage1Item1"),
        t("landing:journey.stage1Item2"),
        t("landing:journey.stage1Item3"),
      ],
    },
    {
      key: "prepare",
      href: "/ai-builder",
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/25",
      label: t("landing:journey.stage2Label"),
      title: t("landing:journey.stage2Title"),
      desc: t("landing:journey.stage2Desc"),
      cta: t("landing:journey.stage2Cta"),
      items: [
        t("landing:journey.stage2Item1"),
        t("landing:journey.stage2Item2"),
        t("landing:journey.stage2Item3"),
      ],
    },
    {
      key: "present",
      href: "/product/modules",
      icon: Shield,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/25",
      label: t("landing:journey.stage3Label"),
      title: t("landing:journey.stage3Title"),
      desc: t("landing:journey.stage3Desc"),
      cta: t("landing:journey.stage3Cta"),
      items: [
        t("landing:journey.stage3Item1"),
        t("landing:journey.stage3Item2"),
        t("landing:journey.stage3Item3"),
      ],
    },
  ], [t]);

  // Demo data for landing-page charts + LCA preview.
  // Shared demo feedstock — kept in sync with /demo and the Project Journey
  // section so the whole landing tells one story (Huila Coffee Husk).
  const demoFs = FEEDSTOCK_DB["coffee_husk"];
  const demoResult = useMemo(() => compute_all(650, 30, demoFs), [demoFs]);

  // LCA preview is anchored to the same 1.5 t/h × 8000 h/yr reference plant
  // shown on /demo. Computes the Puro.earth Edition 2025 breakdown (C_stored,
  // C_loss, E_project, leakage) using typical ratios — this is a PREVIEW of
  // the LCA surface, not a replacement for running the real calc.
  const lcaPreview = useMemo(() => {
    // NOTE: credits.net is t CO2e per tonne of BIOCHAR, not feedstock.
    // Annual CO2 = annualBiochar × credits.net (NOT annualFeedstock × credits.net).
    const capacityTph = 1.5;
    const hoursPerYear = 8000;
    const annualFeedstock = capacityTph * hoursPerYear; // 12,000 t/year
    const annualBiochar = annualFeedstock * (demoResult.yield_ / 100);
    const netCO2 = annualBiochar * demoResult.credits.net;
    const sf = demoResult.credits.sf; // stability factor 0-1
    const cStored = netCO2 / Math.max(sf, 0.5); // approximate gross
    const cLoss = cStored - netCO2;
    const eProject = netCO2 * 0.09; // typical ~9% of net (pyrolysis energy + transport)
    const perBiochar = annualBiochar > 0 ? netCO2 / annualBiochar : 0;
    const efficiency = cStored > 0 ? netCO2 / cStored : 0;
    return { netCO2, annualBiochar, cStored, cLoss, eProject, perBiochar, efficiency };
  }, [demoResult]);

  const fmt = (n: number, decimals = 0) =>
    n.toLocaleString(i18n.language === "es" ? "es-AR" : "en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const sensitivityData = useMemo(() => {
    const data = [];
    for (let T = 400; T <= 850; T += 10) {
      const r = compute_all(T, 30, demoFs);
      data.push({
        T,
        C: parseFloat(r.C.toFixed(1)),
        Yield: parseFloat(r.yield_.toFixed(1)),
        CO2e: parseFloat(r.credits.net.toFixed(2)),
      });
    }
    return data;
  }, [demoFs]);

  const radarData = useMemo(() => [
    { subject: "C%", A: Math.min(1, demoResult.C / 95), fullMark: 1 },
    { subject: "Stability", A: Math.max(0, 1 - demoResult.H_Corg / 0.7), fullMark: 1 },
    { subject: "CO₂e", A: Math.min(1, demoResult.credits.net / 3.5), fullMark: 1 },
    { subject: "BET", A: Math.min(1, demoResult.BET / 500), fullMark: 1 },
    { subject: "pH", A: Math.max(0, 1 - Math.abs(demoResult.pH - 8.5) / 4), fullMark: 1 },
    { subject: "Yield", A: Math.min(1, demoResult.yield_ / 35), fullMark: 1 },
  ], [demoResult]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <LogoLink variant="compact" iconType="flame" showSubtitle={false} />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/guide">
              <Button variant="ghost" size="sm" className="hidden md:inline-flex">
                {t("common:nav.guide", { defaultValue: "Guía" })}
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">{t("common:nav.pricing")}</Button>
            </Link>
            <Link href="/app">
              <Button size="sm" className="gap-1 px-3 sm:px-4">
                <span className="sm:hidden">{t("landing:hero.ctaPrimaryShort", { defaultValue: "Probar" })}</span>
                <span className="hidden sm:inline">{t("common:nav.tryForFree")}</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(34,197,94,0.08)_1px,_transparent_0)] [background-size:32px_32px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 py-20 md:py-28 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left: Copy */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-3 py-1 rounded-full mb-6">
                <Leaf className="w-3 h-3" />
                {t("landing:hero.badge")}
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
                {t("landing:hero.titleLine1")}<br />
                <span className="bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">
                  {t("landing:hero.titleHighlight")}
                </span>
                {t("landing:hero.titleLine2") && (
                  <>
                    <br />
                    {t("landing:hero.titleLine2")}
                  </>
                )}
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl leading-relaxed">
                {t("landing:hero.subtitle")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/app">
                  <Button size="lg" className="gap-2 text-base px-6">
                    {t("landing:hero.ctaPrimary")} <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="gap-2 text-base px-6">
                    {t("landing:hero.ctaSecondary")}
                  </Button>
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm">
                <Link href="/projects">
                  <span className="text-primary hover:text-primary/80 cursor-pointer inline-flex items-center gap-1 font-medium">
                    {t("landing:hero.ctaOperational", { defaultValue: "Ya tengo una planta operativa" })} <ChevronRight className="w-3 h-3" />
                  </span>
                </Link>
                <Link href="/guide">
                  <span className="text-muted-foreground hover:text-foreground cursor-pointer inline-flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" /> {t("landing:hero.ctaGuide", { defaultValue: "Leer la guía" })}
                  </span>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                {t("landing:hero.noCardRequired")}
              </p>
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-3xl">
                {[
                  t("landing:hero.proof1", { defaultValue: "6 metodologías cubiertas" }),
                  t("landing:hero.proof2", { defaultValue: "Simulador gratis" }),
                  t("landing:hero.proof3", { defaultValue: "Evidencia lote por lote" }),
                  t("landing:hero.proof4", { defaultValue: "Exportes listos para auditoría" }),
                ].map((proof) => (
                  <div
                    key={proof}
                    className="rounded-lg border border-border bg-card/70 px-3 py-2 text-xs font-medium text-foreground/85"
                  >
                    {proof}
                  </div>
                ))}
              </div>

              {/* Methodology badges — social proof by certification coverage */}
              <div className="mt-6 pt-5 border-t border-border/50">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
                  {t("landing:hero.methodologiesLabel", { defaultValue: "Compatible con" })}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: "Puro.earth", color: "text-green-600 border-green-500/30 bg-green-500/5" },
                    { name: "Isometric", color: "text-blue-600 border-blue-500/30 bg-blue-500/5" },
                    { name: "Verra VM0044", color: "text-purple-600 border-purple-500/30 bg-purple-500/5" },
                    { name: "EBC", color: "text-emerald-600 border-emerald-500/30 bg-emerald-500/5" },
                    { name: "Rainbow Standard", color: "text-pink-600 border-pink-500/30 bg-pink-500/5" },
                    { name: "Gold Standard", color: "text-amber-600 border-amber-500/30 bg-amber-500/5" },
                  ].map((m) => (
                    <span key={m.name} className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded text-[11px] font-semibold ${m.color}`}>
                      <CheckCircle className="w-2.5 h-2.5" /> {m.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Trust indicators — data-driven via public stats endpoint */}
              <LandingStats />
            </div>

            {/* Right: Visual KPI mockup (clickable → /app) */}
            <div className="lg:col-span-5">
              <Link href="/app">
                <div className="relative cursor-pointer group">
                  {/* Glow */}
                  <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl group-hover:bg-primary/20 transition-colors" />

                  <div className="relative bg-card border border-border group-hover:border-primary/40 rounded-2xl p-4 lg:p-6 shadow-2xl transition-all group-hover:scale-[1.01]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        {t("landing:hero.liveSimulation")}
                      </div>
                      <span className="text-[10px] text-muted-foreground">650°C / 30 min</span>
                    </div>

                    <div className="text-xs text-muted-foreground mb-3">{demoFs.name}</div>

                    {/* KPI Grid */}
                    <div className="grid grid-cols-2 gap-2 lg:gap-3">
                      <div className="bg-background border border-border border-l-2 border-l-primary rounded-lg p-2 lg:p-3">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Total Carbon</div>
                        <div className="text-xl lg:text-2xl font-mono font-bold text-primary mt-0.5">{demoResult.C.toFixed(1)}</div>
                        <div className="text-[10px] text-muted-foreground">% dry mass</div>
                      </div>
                      <div className="bg-background border border-border border-l-2 border-l-primary rounded-lg p-2 lg:p-3">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">H:Corg</div>
                        <div className="text-xl lg:text-2xl font-mono font-bold mt-0.5">{demoResult.H_Corg.toFixed(3)}</div>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500 border border-green-500/20 px-1.5 py-0.5 rounded-full">
                          {demoResult.H_Corg < 0.4 ? "BC-1" : demoResult.H_Corg < 0.7 ? "BC-2" : "FAIL"}
                        </span>
                      </div>
                      <div className="bg-background border border-border border-l-2 border-l-primary rounded-lg p-2 lg:p-3">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Net CO₂e</div>
                        <div className="text-xl lg:text-2xl font-mono font-bold mt-0.5">{demoResult.credits.net.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">t/t biochar</div>
                      </div>
                      <div className="bg-background border border-border border-l-2 border-l-cyan-500 rounded-lg p-2 lg:p-3">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Yield</div>
                        <div className="text-xl lg:text-2xl font-mono font-bold text-cyan-500 mt-0.5">{demoResult.yield_.toFixed(1)}</div>
                        <div className="text-[10px] text-muted-foreground">% dry mass</div>
                      </div>
                    </div>

                    {/* Real mini chart */}
                    <div className="mt-2 lg:mt-3 pt-2 lg:pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">{t("landing:preview.thermalSensitivity")}</div>
                        <div className="text-[10px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          {t("landing:preview.openSimulator")} <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                      <div className="h-12 lg:h-14">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sensitivityData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <Line type="monotone" dataKey="C" stroke="rgb(34, 197, 94)" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="Yield" stroke="rgb(6, 182, 212)" strokeWidth={2} dot={false} opacity={0.6} />
                            <YAxis hide domain={[0, 100]} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* AI PROJECT BUILDER — available from the Engineer tier */}
      <section className="py-16 md:py-20 border-t border-border bg-gradient-to-b from-indigo-500/5 via-transparent to-amber-500/5 overflow-hidden relative">
        {/* Decorative sparkles */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              {t("landing:aiBuilder.badge", { defaultValue: "Nuevo · Desde Engineer" })}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1]">
              {t("landing:aiBuilder.title", { defaultValue: "Cargas biomasa + capacidad + país." })}{" "}
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 bg-clip-text text-transparent">
                {t("landing:aiBuilder.titleHighlight", { defaultValue: "La IA te arma el proyecto completo." })}
              </span>
            </h2>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              {t("landing:aiBuilder.subtitle", { defaultValue: "17 borradores iniciales en unos minutos para arrancar más rápido. Se apoyan en equipos reales (PYREG, Ankur, Beston, Pyrogreen, Syncraft, Carbofex), sus aprobaciones metodológicas y factores de emisión por país." })}
            </p>
          </div>

          {/* 3 inputs → 15 docs visual */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1.6fr] gap-5 items-center">
            {/* Left: 3 inputs */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-lg">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">{t("landing:aiBuilder.inputsTitle", { defaultValue: "Tus inputs" })}</div>
              <div className="space-y-2.5">
                {[
                  { icon: "🌾", labelKey: "landing:aiBuilder.inputs.biomass", fallback: "Biomasa", hintKey: "landing:aiBuilder.inputs.biomassHint", hintFb: "48 del catálogo o tu PDF de lab" },
                  { icon: "⚡", labelKey: "landing:aiBuilder.inputs.capacity", fallback: "Capacidad", hintKey: "landing:aiBuilder.inputs.capacityHint", hintFb: "Toneladas/año de biomasa" },
                  { icon: "🌍", labelKey: "landing:aiBuilder.inputs.country", fallback: "País", hintKey: "landing:aiBuilder.inputs.countryHint", hintFb: "Para permitología y grid EF" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-2.5 bg-background border border-border rounded-lg">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-base shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold">{t(item.labelKey, { defaultValue: item.fallback })}</div>
                      <div className="text-xs text-muted-foreground">{t(item.hintKey, { defaultValue: item.hintFb })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Middle: Arrow with sparkles */}
            <div className="hidden lg:flex flex-col items-center gap-2 px-2">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center shadow-xl shadow-indigo-500/20">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -inset-2 bg-indigo-500/20 rounded-full blur-lg -z-10" />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("landing:aiBuilder.timing", { defaultValue: "~3 min" })}
              </div>
            </div>

            {/* Right: 15 docs grid */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("landing:aiBuilder.outputsTitle", { defaultValue: "Outputs — 17 documentos" })}</div>
                <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">PDF + editable</div>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  "Resumen ejecutivo",
                  "Visión técnica general",
                  "Lista de equipos",
                  "Registro de riesgos",
                  "Matriz de permisos",
                  "Resumen FEL",
                  "Plan maestro",
                  "Implementación",
                  "Paquete eléctrico",
                  "QA/QC Plan",
                  "Reporte LCA",
                  "Resumen financiero",
                  "Matriz metodológica",
                  "Plan comunitario",
                  "MRV Plan",
                  "Mapa de actores",
                  "PDD · 11 frentes",
                ].map((doc, i) => (
                  <div
                    key={i}
                    className="bg-background border border-border rounded px-2 py-1.5 text-[10.5px] font-medium text-foreground/90 flex items-center gap-1.5"
                  >
                    <div className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                    <span className="truncate">{doc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <Link href="/ai-builder">
              <Button size="lg" className="gap-2 text-base px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/20 text-white">
                <Sparkles className="w-4 h-4" />
                {t("landing:aiBuilder.cta", { defaultValue: "Probar constructor IA de proyectos" })}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-3">
              {t("landing:aiBuilder.disclaimer", { defaultValue: `Incluido desde Engineer (USD $${ENGINEER_MONTHLY_USD}/mes). Todos los documentos salen con marca de agua de borrador y requieren revisión humana.` })}
            </p>
          </div>
        </div>
      </section>

      {/* SEE IT IN ACTION — Live charts + LCA preview */}
      <section id="demo" className="py-12 border-t border-border bg-gradient-to-b from-background to-card/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-3 py-1 rounded-full mb-3">
              <Zap className="w-3 h-3" />
              {t("landing:preview.badge")}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{t("landing:preview.title")}</h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              {t("landing:preview.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LEFT — Simulator charts stacked */}
            <div className="space-y-4">
              {/* Thermal sensitivity chart */}
              <Link href="/app" className="block">
                <div className="bg-card border border-border hover:border-primary/40 rounded-xl p-4 cursor-pointer group transition-all h-[250px] flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                      <BarChart3 className="w-3.5 h-3.5" /> {t("landing:preview.thermalSensitivity")}
                    </h3>
                    <div className="text-[10px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      {t("landing:preview.tryInSimulator")} <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sensitivityData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="T" stroke="var(--color-muted-foreground)" fontSize={9} tickMargin={8} />
                        <YAxis yAxisId="left" stroke="rgb(34, 197, 94)" fontSize={9} domain={[0, 100]} />
                        <YAxis yAxisId="right" orientation="right" stroke="rgb(168, 85, 247)" fontSize={9} domain={[0, 4]} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--color-card)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "0.5rem",
                            fontSize: "10px",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "9px" }} iconType="line" />
                        <Line yAxisId="left" type="monotone" dataKey="C" stroke="rgb(34, 197, 94)" strokeWidth={2} dot={false} name="C %" />
                        <Line yAxisId="left" type="monotone" dataKey="Yield" stroke="rgb(6, 182, 212)" strokeWidth={2} dot={false} name="Yield %" />
                        <Line yAxisId="right" type="monotone" dataKey="CO2e" stroke="rgb(168, 85, 247)" strokeWidth={2} dot={false} name="CO₂e" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Link>

              {/* Quality profile radar */}
              <Link href="/app" className="block">
                <div className="bg-card border border-border hover:border-primary/40 rounded-xl p-4 cursor-pointer group transition-all h-[250px] flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-muted-foreground flex items-center gap-2">
                      <Beaker className="w-3.5 h-3.5" /> {t("landing:preview.qualityProfile")}
                    </h3>
                    <div className="text-[10px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="var(--color-border)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
                        <Radar name={demoFs.name} dataKey="A" stroke="rgb(34, 197, 94)" fill="rgb(34, 197, 94)" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </Link>
            </div>

            {/* RIGHT — LCA preview */}
            <Link href="/login?signup=1&from=lca" className="block">
              <div className="relative bg-card border border-border hover:border-green-500/50 rounded-xl p-4 cursor-pointer group transition-all h-[516px] flex flex-col">
                <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Analyst
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-3.5 h-3.5 text-green-500" />
                  <h3 className="text-xs font-bold text-muted-foreground">{t("landing:preview.lcaTitle")}</h3>
                </div>
                <div className="text-[10px] text-muted-foreground mb-3">
                  {t("landing:preview.lcaRefCase", { defaultValue: `Ref: ${demoFs.name} · 1.5 t/h · 8,000 h/yr` })}
                </div>

                {/* CORCs Hero */}
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 mb-3">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                    CORCs Netos (Eq. 5.1)
                  </div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 leading-none">
                    {fmt(lcaPreview.netCO2, 0)}
                    <span className="text-xs font-normal text-muted-foreground ml-2">tCO₂eq / yr</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px]">
                    <div>
                      <span className="text-muted-foreground">Per t biochar: </span>
                      <span className="font-semibold">{fmt(lcaPreview.perBiochar, 2)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Efficiency: </span>
                      <span className="font-semibold">{fmt(lcaPreview.efficiency * 100, 1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Breakdown — Puro.earth Ed. 2025 equations */}
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">C_stored (Eq. 6.1)</span>
                    <span className="font-mono font-semibold text-green-600 dark:text-green-400">+{fmt(lcaPreview.cStored, 0)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">− C_baseline</span>
                    <span className="font-mono text-muted-foreground">−0</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">− C_loss <span className="text-[9px]">(PF {fmt(demoResult.credits.sf * 100, 1)}%)</span></span>
                    <span className="font-mono text-red-500">−{fmt(lcaPreview.cLoss, 0)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">− E_project <span className="text-[9px]">(Eq. 7.1)</span></span>
                    <span className="font-mono text-red-500">−{fmt(lcaPreview.eProject, 0)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">− E_leakage <span className="text-[9px]">(Eq. 8.1)</span></span>
                    <span className="font-mono text-muted-foreground">−0</span>
                  </div>
                  <div className="border-t border-border pt-1 mt-1 flex justify-between items-baseline">
                    <span className="font-bold">= CORCs Netos</span>
                    <span className="font-mono font-bold text-green-600 dark:text-green-400">{fmt(lcaPreview.netCO2, 0)}</span>
                  </div>
                </div>

                {/* Revenue + methodology coverage to fill the bottom space */}
                <div className="mt-4 pt-3 border-t border-border space-y-2.5">
                  {/* Revenue estimate */}
                  <div className="bg-background/50 border border-border rounded-md p-2.5 flex items-center justify-between">
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        {t("landing:preview.revenueLabel", { defaultValue: "Revenue potencial" })}
                      </div>
                      <div className="text-base font-mono font-bold text-foreground leading-tight">
                        USD {fmt(lcaPreview.netCO2 * 150 / 1e6, 2)}M<span className="text-[10px] font-normal text-muted-foreground"> /yr</span>
                      </div>
                    </div>
                    <div className="text-[9px] text-muted-foreground text-right max-w-[120px] leading-tight">
                      {t("landing:preview.revenueHint", { defaultValue: "Ref. mercado: USD 150/tCO₂e" })}
                    </div>
                  </div>

                  {/* Methodology coverage badges */}
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      {t("landing:preview.methodologyCoverage", { defaultValue: "Compatible con" })}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { name: "Puro.earth",      color: "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400" },
                        { name: "Isometric",       color: "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400" },
                        { name: "Verra VM0044",    color: "bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400" },
                        { name: "EBC",             color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" },
                        { name: "Rainbow Standard", color: "bg-pink-500/10 border-pink-500/30 text-pink-600 dark:text-pink-400" },
                        { name: "Gold Standard",   color: "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400" },
                      ].map((m) => (
                        <span key={m.name} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${m.color}`}>
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[10px] mt-auto">
                  <div className="text-muted-foreground">{t("landing:preview.lcaValidations")}</div>
                  <div className="text-primary font-medium opacity-70 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    {t("landing:preview.openFullLCA")} <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="text-center mt-8">
            <Link href="/app">
              <Button size="lg" className="gap-2 shadow-lg shadow-primary/20">
                <Zap className="w-4 h-4" />
                {t("landing:preview.openTheSimulator")}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* METHODOLOGY COVERAGE — 6 certifications with price + durability */}
      <MethodologyCoverage />

      {/* AUDIENCE + DELIVERABLES */}
      <section className="py-16 md:py-20 border-t border-border bg-gradient-to-b from-background via-blue-500/[0.03] to-background relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-7">
              <div className="max-w-2xl mb-8">
                <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
                  <Briefcase className="w-3 h-3" />
                  {t("landing:whoUses.badge")}
                </div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 leading-[1.1]">
                  {t("landing:whoUses.title", {
                    defaultValue: "La misma plataforma, aterrizada a cuatro usos claros",
                  })}
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {t("landing:whoUses.subtitle", {
                    defaultValue: "No intentamos hablarle a todo el mercado al mismo tiempo. Estas son las cuatro entradas más naturales para empezar.",
                  })}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AUDIENCE_CARDS.map((persona) => {
                  const Icon = persona.icon;
                  return (
                    <Link key={persona.key} href={persona.href} className="group">
                      <div className={`h-full bg-card border ${persona.border} rounded-2xl p-5 hover:-translate-y-1 transition-all duration-200 hover:shadow-lg`}>
                        <div className={`w-11 h-11 rounded-xl ${persona.bg} flex items-center justify-center ${persona.color} mb-4`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                          {t(`landing:whoUses.items.${persona.key}.title`)}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                          {t(`landing:whoUses.items.${persona.key}.desc`)}
                        </p>
                        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                          {t("landing:whoUses.useCaseLabel", { defaultValue: "Caso de uso típico" })}
                        </div>
                        <p className="text-sm italic text-foreground/80">
                          {t(`landing:whoUses.items.${persona.key}.useCase`)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <p className="text-xs text-muted-foreground mt-5 max-w-2xl">
                {t("landing:whoUses.footer", {
                  defaultValue: "También funciona para traders e investigación, pero la home ahora prioriza las rutas donde más rápido entendemos el valor del producto.",
                })}
              </p>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-card border border-border rounded-3xl p-6 md:p-7 shadow-2xl">
                <div className="inline-flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
                  <Factory className="w-3 h-3" />
                  {t("landing:projectPackage.badge")}
                </div>
                <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-3 leading-tight">
                  {t("landing:projectPackage.title")}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {t("landing:projectPackage.subtitle")}
                </p>

                <div className="space-y-3">
                  {DELIVERABLE_HIGHLIGHTS.map((item) => (
                    <div key={item.key} className="flex items-start gap-3 rounded-2xl border border-border bg-background/70 p-3">
                      <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center shrink-0`}>
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold leading-tight mb-1">
                          {item.title}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-5 border-t border-border">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-border bg-background/70 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                        {t("landing:preview.methodologyCoverage", { defaultValue: "Compatible con" })}
                      </div>
                      <div className="font-semibold">6 metodologías</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-background/70 p-3">
                      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                        {t("landing:projectPackage.outputsLabel", { defaultValue: "Entregables" })}
                      </div>
                      <div className="font-semibold">PDD + LCA + evidencia</div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href="/product/project-package">
                      <Button size="sm" className="gap-1.5">
                        {t("landing:projectPackage.viewAll", { defaultValue: "Ver el paquete completo" })}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Link href="/pricing">
                      <Button size="sm" variant="outline" className="gap-1.5">
                        {t("common:nav.pricing")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 border-t border-border bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">{t("landing:pricingSection.title")}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("landing:pricingSection.subtitle")}
            </p>
          </div>

          {/* Tier cards — summary on landing, full detail on /pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {TIERS.slice(0, 3).map((tier) => {
              const isComingSoon = !!(tier as any).comingSoon;
              return (
              <div
                key={tier.id}
                className={`relative bg-card rounded-xl border-2 ${tier.color} p-5 flex flex-col ${tier.badge ? "ring-2 ring-green-500/30" : ""}`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                    {tier.badge}
                  </div>
                )}
                <div className="mb-3">
                  <h3 className="font-bold text-sm mb-1">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mb-1.5">
                    <span className="text-2xl font-bold">{tier.price === 0 ? t("landing:tiers.explorer.free") : `$${tier.price}`}</span>
                    {tier.period && <span className="text-xs text-muted-foreground">{tier.period}</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{tier.description}</p>
                </div>
                <ul className="space-y-1 mb-4 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[11px]">
                      <CheckCircle className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {tier.id === "free" ? (
                  <Link href={tier.href}>
                    <Button variant={tier.ctaVariant} size="sm" className="w-full text-xs">
                      {tier.cta}
                    </Button>
                  </Link>
                ) : isComingSoon ? (
                  <Link href="/pricing">
                    <Button variant="default" size="sm" className="w-full text-xs">
                      {tier.cta}
                    </Button>
                  </Link>
                ) : (
                  <SubscribeButton
                    tierId={tier.id as SubscribeTierId}
                    size="sm"
                    variant={tier.ctaVariant}
                    className="w-full text-xs"
                  >
                    {tier.cta}
                  </SubscribeButton>
                )}
              </div>
              );
            })}
          </div>
          <div className="text-center mt-6">
            <Link href="/pricing">
              <Button variant="outline" size="sm" className="gap-1.5">
                {t("landing:pricingSection.viewAll", { defaultValue: "Ver todos los planes" })}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            {t("landing:pricingSection.enterprisePrompt")}{" "}
            <Link href="/pricing#contact"><span className="text-primary hover:underline">{t("landing:pricingSection.enterpriseLink")}</span></Link>
          </p>
        </div>
      </section>

      {/* PLATFORM FLOW */}
      <section className="py-16 md:py-20 border-t border-border bg-gradient-to-b from-background via-card/20 to-background">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
              <FlaskConical className="w-3 h-3" />
              {t("landing:journey.badge")}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 leading-[1.1]">
              {t("landing:journey.titleLine1")}{" "}
              <span className="text-primary">{t("landing:journey.titleHighlight")}</span>
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              {t("landing:journey.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
            {WORKFLOW_STAGES.map((stage) => {
              const Icon = stage.icon;
              return (
                <div key={stage.key} className={`bg-card border ${stage.border} rounded-3xl p-6 flex flex-col shadow-sm`}>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <div className={`w-12 h-12 rounded-2xl ${stage.bg} flex items-center justify-center ${stage.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {stage.label}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 leading-tight">
                    {stage.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                    {stage.desc}
                  </p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {stage.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm">
                        <CheckCircle className={`w-4 h-4 ${stage.color} flex-shrink-0 mt-0.5`} />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={stage.href}>
                    <Button size="sm" variant="outline" className="w-full gap-1.5">
                      {stage.cta}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-6 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            {t("landing:journey.flowHint")}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 border-t border-border">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">{t("landing:faq.title")}</h2>
            <p className="text-muted-foreground">{t("landing:faq.subtitle")}</p>
          </div>
          <div className="space-y-2">
            {([1, 2, 3, 4, 5, 6, 7] as const).map((n) => (
              <FaqItem
                key={n}
                question={t(`landing:faq.q${n}`)}
                answer={t(`landing:faq.a${n}`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <SiteFooter />
    </div>
  );
}
