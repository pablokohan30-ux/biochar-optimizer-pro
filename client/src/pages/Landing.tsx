import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Flame, BarChart3, FileText, Beaker, Leaf, Globe,
  Zap, CheckCircle, ArrowRight, Lock, ChevronRight, ChevronDown,
  FlaskConical, Building2, Map, Scale,
  Microscope, Ruler, BadgeCheck, Sparkles,
  ClipboardList, Factory, Plug, Shield,
  TrendingUp, Landmark, Wheat, Code2, GraduationCap, Briefcase
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { Button } from "@/components/ui/button";
import LogoLink from "@/components/LogoLink";
import SiteFooter from "@/components/SiteFooter";
import MarketPulse from "@/components/MarketPulse";
import ProjectJourney from "@/components/ProjectJourney";
import MethodologyCoverage from "@/components/MethodologyCoverage";
import CarbonForumPassButton from "@/components/CarbonForumPassButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SubscribeButton, { type SubscribeTierId } from "@/components/SubscribeButton";
import { compute_all, FEEDSTOCK_DB } from "@/lib/biocharModel";



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
  const { t } = useTranslation(["landing", "common", "pricing", "market"]);
  const [, setLocation] = useLocation();
  const [openModule, setOpenModule] = useState<string | null>(null);

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

  const MODULES = useMemo(() => [
    {
      id: "technicalSimulation",
      icon: FlaskConical,
      title: t("landing:modules.technicalSimulation.title"),
      summary: t("landing:modules.technicalSimulation.summary"),
      desc: t("landing:modules.technicalSimulation.desc"),
      tier: t("landing:modules.technicalSimulation.tier"),
      tierColor: "bg-green-500/10 text-green-500 border-green-500/20",
      color: "text-green-500",
      borderHover: "hover:border-green-500/40",
      features: [
        t("landing:modules.technicalSimulation.features.f1"),
        t("landing:modules.technicalSimulation.features.f2"),
        t("landing:modules.technicalSimulation.features.f3"),
        t("landing:modules.technicalSimulation.features.f4"),
        t("landing:modules.technicalSimulation.features.f5"),
      ],
    },
    {
      id: "lca",
      icon: FileText,
      title: t("landing:modules.lca.title"),
      summary: t("landing:modules.lca.summary"),
      desc: t("landing:modules.lca.desc"),
      tier: t("landing:modules.lca.tier"),
      tierColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      color: "text-blue-500",
      borderHover: "hover:border-blue-500/40",
      features: [
        t("landing:modules.lca.features.f1"),
        t("landing:modules.lca.features.f2"),
        t("landing:modules.lca.features.f3"),
        t("landing:modules.lca.features.f4"),
        t("landing:modules.lca.features.f5"),
      ],
    },
    {
      id: "projectDesign",
      icon: BarChart3,
      title: t("landing:modules.projectDesign.title"),
      summary: t("landing:modules.projectDesign.summary"),
      desc: t("landing:modules.projectDesign.desc"),
      tier: t("landing:modules.projectDesign.tier"),
      tierColor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      color: "text-purple-500",
      borderHover: "hover:border-purple-500/40",
      features: [
        t("landing:modules.projectDesign.features.f1"),
        t("landing:modules.projectDesign.features.f2"),
        t("landing:modules.projectDesign.features.f3"),
        t("landing:modules.projectDesign.features.f4"),
        t("landing:modules.projectDesign.features.f5"),
      ],
    },
    {
      id: "plantEngineering",
      icon: Building2,
      title: t("landing:modules.plantEngineering.title"),
      summary: t("landing:modules.plantEngineering.summary"),
      desc: t("landing:modules.plantEngineering.desc"),
      tier: t("landing:modules.plantEngineering.tier"),
      tierColor: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      color: "text-yellow-500",
      borderHover: "hover:border-yellow-500/40",
      features: [
        t("landing:modules.plantEngineering.features.f1"),
        t("landing:modules.plantEngineering.features.f2"),
        t("landing:modules.plantEngineering.features.f3"),
        t("landing:modules.plantEngineering.features.f4"),
        t("landing:modules.plantEngineering.features.f5"),
      ],
    },
    {
      id: "regulatory",
      icon: Scale,
      title: t("landing:modules.regulatory.title"),
      summary: t("landing:modules.regulatory.summary"),
      desc: t("landing:modules.regulatory.desc"),
      tier: t("landing:modules.regulatory.tier"),
      tierColor: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      color: "text-yellow-500",
      borderHover: "hover:border-yellow-500/40",
      features: [
        t("landing:modules.regulatory.features.f1"),
        t("landing:modules.regulatory.features.f2"),
        t("landing:modules.regulatory.features.f3"),
        t("landing:modules.regulatory.features.f4"),
        t("landing:modules.regulatory.features.f5"),
      ],
    },
    {
      id: "applications",
      icon: Map,
      title: t("landing:modules.applications.title"),
      summary: t("landing:modules.applications.summary"),
      desc: t("landing:modules.applications.desc"),
      tier: t("landing:modules.applications.tier"),
      tierColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      color: "text-blue-500",
      borderHover: "hover:border-blue-500/40",
      features: [
        t("landing:modules.applications.features.f1"),
        t("landing:modules.applications.features.f2"),
        t("landing:modules.applications.features.f3"),
        t("landing:modules.applications.features.f4"),
        t("landing:modules.applications.features.f5"),
      ],
    },
  ], [t]);

  // Demo data for landing-page charts (Pine Sawdust, 650°C, 30 min)
  const demoFs = FEEDSTOCK_DB["pine_sawdust"];
  const demoResult = useMemo(() => compute_all(650, 30, demoFs), [demoFs]);

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
            <Link href="/pricing">
              <Button variant="ghost" size="sm">{t("common:nav.pricing")}</Button>
            </Link>
            <Link href="/app">
              <Button size="sm" className="gap-1">
                {t("common:nav.tryForFree")} <ArrowRight className="w-3 h-3" />
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
                </span>,<br />
                {t("landing:hero.titleLine2")}
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl leading-relaxed">
                {t("landing:hero.subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/app">
                  <Button size="lg" className="gap-2 text-base px-8 shadow-lg shadow-primary/20">
                    <Zap className="w-4 h-4" />
                    {t("landing:hero.ctaPrimary")}
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button size="lg" variant="outline" className="gap-2 text-base px-8">
                    {t("landing:hero.ctaSecondary")}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                {t("landing:hero.noCardRequired")}
              </p>

              {/* Trust indicators */}
              <div className="mt-10 pt-8 border-t border-border/50 grid grid-cols-3 gap-6 max-w-lg">
                <div>
                  <div className="text-2xl font-bold text-primary">50+</div>
                  <div className="text-xs text-muted-foreground">{t("landing:hero.trustBiomasses")}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">BC-1</div>
                  <div className="text-xs text-muted-foreground">{t("landing:hero.trustPuro")}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">100%</div>
                  <div className="text-xs text-muted-foreground">{t("landing:hero.trustPeerReview")}</div>
                </div>
              </div>
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
                        <Radar name="Pine Sawdust" dataKey="A" stroke="rgb(34, 197, 94)" fill="rgb(34, 197, 94)" fillOpacity={0.3} />
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
                  {t("landing:preview.lcaRefCase")}
                </div>

                {/* CORCs Hero */}
                <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 mb-3">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                    CORCs Netos (Eq. 5.1)
                  </div>
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 leading-none">
                    53,946
                    <span className="text-xs font-normal text-muted-foreground ml-2">tCO₂eq / yr</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[10px]">
                    <div>
                      <span className="text-muted-foreground">Per t biochar: </span>
                      <span className="font-semibold">2.45</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Efficiency: </span>
                      <span className="font-semibold">76.9%</span>
                    </div>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="space-y-1 text-[11px] flex-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">C_stored (Eq. 6.1)</span>
                    <span className="font-mono font-semibold text-green-600 dark:text-green-400">+70,125</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">− C_baseline</span>
                    <span className="font-mono text-muted-foreground">−0</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">− C_loss <span className="text-[9px]">(PF 83.7%)</span></span>
                    <span className="font-mono text-red-500">−11,428</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">− E_project <span className="text-[9px]">(Eq. 7.1)</span></span>
                    <span className="font-mono text-red-500">−4,752</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-muted-foreground">− E_leakage <span className="text-[9px]">(Eq. 8.1)</span></span>
                    <span className="font-mono text-muted-foreground">−0</span>
                  </div>
                  <div className="border-t border-border pt-1 mt-1 flex justify-between items-baseline">
                    <span className="font-bold">= CORCs Netos</span>
                    <span className="font-mono font-bold text-green-600 dark:text-green-400">53,946</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-[10px]">
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

      {/* PROJECT JOURNEY — end-to-end pipeline with live data */}
      <ProjectJourney />

      {/* HOW IT WORKS */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">{t("landing:howItWorks.title")}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("landing:howItWorks.subtitle")}
            </p>
          </div>

          {/* Steps */}
          <div className="relative">
            {/* Connector line (desktop) */}
            <div className="hidden lg:block absolute top-16 left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-px bg-gradient-to-r from-green-500/40 via-blue-500/40 to-purple-500/40" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center group">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center group-hover:border-green-500/60 group-hover:bg-green-500/15 transition-all duration-300">
                    <Microscope className="w-7 h-7 text-green-500" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                    1
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3">{t("landing:howItWorks.step1.title")}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                  {t("landing:howItWorks.step1.desc")}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {["C%", "H:Corg", "CO₂e", "BET", "pH", "Yield"].map((tag) => (
                    <span key={tag} className="text-[11px] font-medium bg-green-500/10 text-green-500 border border-green-500/20 px-2.5 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center group">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border-2 border-blue-500/30 flex items-center justify-center group-hover:border-blue-500/60 group-hover:bg-blue-500/15 transition-all duration-300">
                    <Ruler className="w-7 h-7 text-blue-500" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                    2
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3">{t("landing:howItWorks.step2.title")}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                  {t("landing:howItWorks.step2.desc")}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {["LCA", "CAPEX", "OPEX", "IRR", "NPV", "P&ID"].map((tag) => (
                    <span key={tag} className="text-[11px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2.5 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center group">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center group-hover:border-purple-500/60 group-hover:bg-purple-500/15 transition-all duration-300">
                    <BadgeCheck className="w-7 h-7 text-purple-500" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                    3
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-3">{t("landing:howItWorks.step3.title")}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                  {t("landing:howItWorks.step3.desc")}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {["Puro.earth", "Isometric", "EBC", "VERRA", t("landing:howItWorks.tagPermits")].map((tag) => (
                    <span key={tag} className="text-[11px] font-medium bg-purple-500/10 text-purple-500 border border-purple-500/20 px-2.5 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* METHODOLOGY COVERAGE — 6 certifications with price + durability */}
      <MethodologyCoverage />

      {/* WHO USES IT — 6 verticals */}
      <section className="py-20 border-t border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
              <Briefcase className="w-3 h-3" />
              {t("landing:whoUses.badge")}
            </div>
            <h2 className="text-3xl font-bold mb-3">{t("landing:whoUses.title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("landing:whoUses.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Building2, key: "developer", color: "text-green-500" },
              { icon: Briefcase, key: "consultant", color: "text-blue-500" },
              { icon: TrendingUp, key: "trader", color: "text-purple-500" },
              { icon: Wheat, key: "agribusiness", color: "text-amber-500" },
              { icon: Code2, key: "integrator", color: "text-cyan-500" },
              { icon: GraduationCap, key: "researcher", color: "text-red-500" },
            ].map((item) => {
              const href = `/solutions/${item.key}`;
              return (
                <a
                  key={item.key}
                  href={href}
                  onClick={(e) => {
                    // Allow normal behavior for middle-click, ctrl/cmd-click
                    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
                    e.preventDefault();
                    setLocation(href);
                  }}
                  className="block bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full group no-underline text-inherit"
                >
                  <item.icon className={`w-6 h-6 ${item.color} mb-3`} />
                  <h3 className="font-semibold text-sm mb-1.5 group-hover:text-primary transition-colors">{t(`landing:whoUses.items.${item.key}.title`)}</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                    {t(`landing:whoUses.items.${item.key}.desc`)}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 italic">
                    {t(`landing:whoUses.items.${item.key}.useCase`)}
                  </p>
                  <div className="mt-3 text-[11px] text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {t("landing:whoUses.seeMore")} <ArrowRight className="w-3 h-3" />
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* PULL QUOTE — industry insight */}
      <section className="py-16 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="relative">
            <div className="text-primary text-7xl font-serif leading-none opacity-30 absolute -top-4 left-4 md:left-0">"</div>
            <blockquote className="relative">
              <p className="text-2xl md:text-3xl font-semibold leading-tight md:leading-snug mb-4 max-w-3xl mx-auto">
                {t("landing:quote.text")}
              </p>
              <footer className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{t("landing:quote.author")}</span>
                <span className="mx-2">·</span>
                <a
                  href="https://www.linkedin.com/pulse/biochar-y-las-expectativas-mal-entendidas-miguel-%C3%A1ngel-mart%C3%ADnez-hpeoe/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  {t("landing:quote.sourceLabel")}
                </a>
              </footer>
            </blockquote>
          </div>
          <div className="mt-8 max-w-2xl mx-auto text-sm text-muted-foreground leading-relaxed">
            <p>{t("landing:quote.ourTake")}</p>
          </div>
        </div>
      </section>

      {/* MARKET OPPORTUNITY — stats */}
      <section className="py-20 border-t border-border bg-gradient-to-b from-green-500/5 via-transparent to-transparent">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
              <TrendingUp className="w-3 h-3" />
              {t("landing:market.badge")}
            </div>
            <h2 className="text-3xl font-bold mb-3">{t("landing:market.title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("landing:market.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { stat: "$50B+", key: "marketSize", color: "text-green-500" },
              { stat: "2.5 Gt", key: "biocharPotential", color: "text-primary" },
              { stat: "5M+", key: "microsoft", color: "text-blue-500" },
              { stat: "<100", key: "certified", color: "text-amber-500" },
            ].map((item) => (
              <div key={item.key} className="bg-card border border-border rounded-xl p-5 text-center">
                <div className={`text-4xl font-bold ${item.color} mb-2`}>{item.stat}</div>
                <div className="text-xs font-semibold text-foreground mb-1.5">
                  {t(`landing:market.stats.${item.key}.label`)}
                </div>
                <div className="text-[10px] text-muted-foreground leading-relaxed">
                  {t(`landing:market.stats.${item.key}.source`)}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 max-w-3xl mx-auto text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("landing:market.conclusion")}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/app">
                <Button size="lg" className="gap-2">
                  <Zap className="w-4 h-4" />
                  {t("landing:market.ctaPrimary")}
                </Button>
              </Link>
              <Link href="/pricing">
                <Button size="lg" variant="outline" className="gap-2">
                  {t("landing:market.ctaSecondary")}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section data-version="accordion-v3" className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">{t("landing:modulesSection.title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("landing:modulesSection.subtitle")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {MODULES.map((mod) => (
              <div
                key={mod.id}
                className={`bg-card border border-border rounded-xl transition-all duration-200 cursor-pointer flex flex-col ${mod.borderHover} ${openModule === mod.id ? "border-primary/30 shadow-md" : ""}`}
                onClick={() => setOpenModule(prev => prev === mod.id ? null : mod.id)}
              >
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 ${mod.color}`}>
                        <mod.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-sm">{mod.title}</h3>
                          <span className={`text-[10px] font-medium border px-2 py-0.5 rounded-full shrink-0 ${mod.tierColor}`}>
                            {mod.tier}+
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{mod.summary}</p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform duration-200 ${openModule === mod.id ? "rotate-180" : ""}`}
                    />
                  </div>
                </div>
                {openModule === mod.id && (
                  <div className="border-t border-border bg-secondary/30 px-6 py-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                    <p className="text-sm text-muted-foreground leading-relaxed">{mod.desc}</p>
                    <ul className="space-y-1.5">
                      {mod.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-xs">
                          <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${mod.color}`} />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="/pricing" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" className="mt-2 text-xs gap-1">
                        {t("landing:modules.viewPlans")} <ArrowRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ))}
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

          {/* Carbon Forum special promo */}
          <div className="relative mb-8 overflow-hidden rounded-xl border-2 border-green-500/40 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent p-4 md:p-5 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <div className="inline-flex items-center gap-1 bg-green-500/20 text-green-700 dark:text-green-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {t("landing:pricingSection.carbonForumBadge")}
                  </div>
                  <div className="inline-flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <Sparkles className="w-2.5 h-2.5" />
                    {t("landing:pricingSection.limitedTime")}
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-1">
                  {t("landing:pricingSection.carbonForumTitle")} <span className="text-foreground">$100</span>
                  <span className="text-[10px] text-muted-foreground font-normal ml-1.5">
                    {t("landing:pricingSection.carbonForumOrShare")}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal ml-2">{t("landing:pricingSection.carbonForum30day")}</span>
                </h3>
                <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5 text-[11px] text-foreground mt-2">
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {t("landing:pricingSection.carbonForumFeatures.simulator")}</li>
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {t("landing:pricingSection.carbonForumFeatures.optimizer")}</li>
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {t("landing:pricingSection.carbonForumFeatures.pdf")}</li>
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {t("landing:pricingSection.carbonForumFeatures.projects")}</li>
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {t("landing:pricingSection.carbonForumFeatures.lca")}</li>
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {t("landing:pricingSection.carbonForumFeatures.aiSearch")}</li>
                </ul>
              </div>
              <div className="w-full md:w-auto flex flex-col gap-1 md:items-end">
                <CarbonForumPassButton />
                <p className="text-xs text-center md:text-right text-muted-foreground max-w-[220px] leading-snug">
                  {t("pricing:carbonForumPromo.shareHint")}
                </p>
              </div>
            </div>
          </div>

          {/* Tier cards — all 5 tiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {TIERS.map((tier) => {
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

          <p className="text-center text-xs text-muted-foreground mt-6">
            {t("landing:pricingSection.enterprisePrompt")}{" "}
            <Link href="/pricing#contact"><span className="text-primary hover:underline">{t("landing:pricingSection.enterpriseLink")}</span></Link>
          </p>
        </div>
      </section>


      {/* COMPLETE PROJECT PACKAGE */}
      <section className="py-20 border-t border-border bg-gradient-to-b from-purple-500/5 via-transparent to-transparent">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
              <Factory className="w-3 h-3" />
              {t("landing:projectPackage.badge")}
            </div>
            <h2 className="text-3xl font-bold mb-3">{t("landing:projectPackage.title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("landing:projectPackage.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: ClipboardList, titleKey: "landing:projectPackage.items.pdd.title", descKey: "landing:projectPackage.items.pdd.desc", color: "text-purple-500" },
              { icon: Factory, titleKey: "landing:projectPackage.items.equipment.title", descKey: "landing:projectPackage.items.equipment.desc", color: "text-blue-500" },
              { icon: Map, titleKey: "landing:projectPackage.items.layout.title", descKey: "landing:projectPackage.items.layout.desc", color: "text-green-500" },
              { icon: Plug, titleKey: "landing:projectPackage.items.electrical.title", descKey: "landing:projectPackage.items.electrical.desc", color: "text-amber-500" },
              { icon: Microscope, titleKey: "landing:projectPackage.items.quality.title", descKey: "landing:projectPackage.items.quality.desc", color: "text-red-500" },
              { icon: Shield, titleKey: "landing:projectPackage.items.certification.title", descKey: "landing:projectPackage.items.certification.desc", color: "text-emerald-500" },
            ].map((item) => (
              <div key={item.titleKey} className="bg-card border border-border rounded-xl p-5 hover:border-purple-500/30 transition-colors">
                <item.icon className={`w-6 h-6 ${item.color} mb-3`} />
                <h3 className="font-semibold text-sm mb-1.5">{t(item.titleKey)}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{t(item.descKey)}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/pricing">
              <Button size="lg" className="gap-2">
                {t("landing:projectPackage.cta")} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <p className="text-[11px] text-muted-foreground mt-2">
              {t("landing:projectPackage.ctaHint")}
            </p>
          </div>
        </div>
      </section>

      {/* MARKET PULSE — live biochar industry news */}
      <section className="py-20 border-t border-border">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              {t("market:sectionTitle")}
            </div>
            <h2 className="text-3xl font-bold mb-3">{t("market:sectionTitle")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("market:sectionSubtitle")}
            </p>
          </div>
          <MarketPulse limit={6} />
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
