import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  Flame, BarChart3, FileText, Beaker, Leaf, Globe,
  Zap, CheckCircle, ArrowRight, Lock, ChevronRight, ChevronDown,
  FlaskConical, Building2, Map, Scale,
  Microscope, Ruler, BadgeCheck, Sparkles
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { Button } from "@/components/ui/button";
import LogoLink from "@/components/LogoLink";
import SiteFooter from "@/components/SiteFooter";
import CarbonForumPassButton from "@/components/CarbonForumPassButton";
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

const TIERS = [
  {
    id: "free",
    name: "Explorer",
    price: 0,
    period: "",
    description: "Explore biochar's potential with no commitment.",
    color: "border-border",
    badge: null,
    cta: "Start for free",
    ctaVariant: "outline" as const,
    href: "/app",
    features: [
      "Interactive pyrolysis simulator",
      "Database of 8 calibrated feedstocks",
      "AI biomass search (3 searches/day)",
      "Core KPIs: C%, H:Corg, CO₂e, yield",
      "Thermal sensitivity chart",
      "Quality radar profile",
    ],
  },
  {
    id: "analyst",
    name: "Analyst",
    price: 299,
    period: "/mo",
    description: "For teams preparing carbon certification dossiers.",
    color: "border-green-500",
    badge: "MOST POPULAR",
    cta: "Get started",
    ctaVariant: "default" as const,
    href: "/pricing",
    features: [
      "Everything in Explorer",
      "Unlimited AI biomass search",
      "Full PDF report export",
      "Temperature / time optimizer",
      "Project Manager (multi-project + map)",
      "Adaptable LCA module (Puro.earth Ed. 2025)",
      "EBC / Puro.earth / Isometric compliance analysis",
      "Downloadable LCA Excel / Google Sheets template",
    ],
  },
];

const MODULES = [
  {
    icon: FlaskConical,
    title: "Technical Simulation",
    summary: "Empirical model calibrated with peer-reviewed pyrolysis data.",
    desc: "Predicts carbon content (C%), hydrogen-to-carbon ratio (H:Corg), mass yield, BET surface area, pH and CO₂e credits for any feedstock. Includes an AI-powered biomass search engine, thermal sensitivity charts, and a quality radar profile. Fully free — no account required.",
    tier: "Free",
    tierColor: "bg-green-500/10 text-green-500 border-green-500/20",
    color: "text-green-500",
    borderHover: "hover:border-green-500/40",
    features: ["Interactive pyrolysis simulator", "AI biomass search (3/day free)", "C%, H:Corg, CO₂e, yield, BET, pH", "Thermal sensitivity chart", "Quality radar profile"],
  },
  {
    icon: FileText,
    title: "Life Cycle Assessment (LCA)",
    summary: "Real net CO₂e credits per leading carbon certification methodologies.",
    desc: "Calculates Scope 3 emissions from biomass transport, electricity consumption, and process energy to derive net CO₂e credits. Fully adaptable to project-specific data. Aligned with Puro.earth, Isometric, EBC and VERRA methodologies. Includes a downloadable LCA report.",
    tier: "Analyst",
    tierColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    color: "text-blue-500",
    borderHover: "hover:border-blue-500/40",
    features: ["Scope 3 transport & energy emissions", "Net CO₂e credit calculation", "Puro.earth / Isometric / EBC / VERRA", "Adaptable to project data", "Downloadable LCA report"],
  },
  {
    icon: BarChart3,
    title: "Project Design",
    summary: "Reactor sizing, CAPEX/OPEX and full financial analysis.",
    desc: "Dimensions the reactor from biomass input (ton/h → thermal kW → m³), calculates mass and energy balances, estimates CAPEX and OPEX, and runs a full financial analysis including IRR, NPV and payback period with a 10-year carbon credit projection. Includes a guided technical questionnaire and a reactor supplier map.",
    tier: "Engineer",
    tierColor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    color: "text-purple-500",
    borderHover: "hover:border-purple-500/40",
    features: ["Reactor sizing (ton/h → kW → m³)", "Mass & energy balance", "CAPEX / OPEX estimation", "IRR, NPV, payback analysis", "10-year carbon credit projection"],
  },
  {
    icon: Building2,
    title: "Plant Engineering",
    summary: "Plant layout, P&ID, equipment specs and bill of materials.",
    desc: "Generates a process flow diagram (PFD) and a simplified P&ID for the biochar plant. Includes equipment specifications, bill of materials, and a technical document ready for investor due diligence. Integrates real reactor data from supported equipment models.",
    tier: "Expert",
    tierColor: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    color: "text-yellow-500",
    borderHover: "hover:border-yellow-500/40",
    features: ["Process flow diagram (PFD)", "Simplified P&ID", "Equipment specifications", "Bill of materials", "Investor-ready technical document"],
  },
  {
    icon: Scale,
    title: "Regulatory Framework",
    summary: "Interactive map of legal requirements by country.",
    desc: "Provides an interactive map of environmental permits, industrial licenses, and certification requirements by country. Includes step-by-step certification guides for Puro.earth, Isometric, EBC and VERRA, plus automated alerts when regulations change in your target markets.",
    tier: "Expert",
    tierColor: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    color: "text-yellow-500",
    borderHover: "hover:border-yellow-500/40",
    features: ["Permits & licenses by country", "Certification step-by-step guides", "Puro.earth / Isometric / EBC / VERRA", "Regulatory change alerts", "Interactive world map"],
  },
  {
    icon: Map,
    title: "Biochar Applications",
    summary: "Applications map, agronomic calculator and carbon markets by region.",
    desc: "Interactive map of biochar end-use applications: agriculture, construction, water filtration, sustainable aviation fuel (SAF), and soil remediation. Includes an agronomic value calculator by region, a carbon market platform comparator (Puro.earth vs Isometric vs Verra), and price trend analysis.",
    tier: "Developer",
    tierColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    color: "text-blue-500",
    borderHover: "hover:border-blue-500/40",
    features: ["Agriculture, construction, SAF, filtration", "Agronomic value calculator", "Carbon market comparator", "Price trend analysis", "Markets by region"],
  },
];



export default function Landing() {
  const [openModule, setOpenModule] = useState<string | null>(null);

  // Demo data for landing-page charts (Pine Sawdust, 650°C, 30 min)
  const demoFs = FEEDSTOCK_DB["pine_sawdust"];
  const demoResult = useMemo(() => compute_all(650, 30, demoFs), [demoFs]);

  const sensitivityData = useMemo(() => {
    const data = [];
    for (let T = 400; T <= 750; T += 10) {
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
            <Link href="/pricing">
              <Button variant="ghost" size="sm">Pricing</Button>
            </Link>
            <Link href="/app">
              <Button size="sm" className="gap-1">
                Try for free <ArrowRight className="w-3 h-3" />
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
                Biochar project development platform
              </div>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
                From biomass to<br />
                <span className="bg-gradient-to-r from-primary to-green-400 bg-clip-text text-transparent">
                  carbon credit
                </span>,<br />
                step by step.
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl leading-relaxed">
                The only platform that accompanies the full lifecycle of a biochar project:
                from technical simulation to complete plant design, LCA,
                regulatory permits, and access to carbon markets.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/app">
                  <Button size="lg" className="gap-2 text-base px-8 shadow-lg shadow-primary/20">
                    <Zap className="w-4 h-4" />
                    Start for free
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button size="lg" variant="outline" className="gap-2 text-base px-8">
                    View plans & pricing
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                No credit card required · Full simulator free · Upgrade when your project needs it
              </p>

              {/* Trust indicators */}
              <div className="mt-10 pt-8 border-t border-border/50 grid grid-cols-3 gap-6 max-w-lg">
                <div>
                  <div className="text-2xl font-bold text-primary">50+</div>
                  <div className="text-xs text-muted-foreground">Biomass types</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">BC-1</div>
                  <div className="text-xs text-muted-foreground">Puro.earth ready</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">100%</div>
                  <div className="text-xs text-muted-foreground">Peer-reviewed</div>
                </div>
              </div>
            </div>

            {/* Right: Visual KPI mockup (clickable → /app) */}
            <div className="lg:col-span-5 hidden lg:block">
              <Link href="/app">
                <div className="relative cursor-pointer group">
                  {/* Glow */}
                  <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-2xl group-hover:bg-primary/20 transition-colors" />

                  <div className="relative bg-card border border-border group-hover:border-primary/40 rounded-2xl p-6 shadow-2xl transition-all group-hover:scale-[1.01]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Live Simulation
                      </div>
                      <span className="text-[10px] text-muted-foreground">650°C / 30 min</span>
                    </div>

                    <div className="text-xs text-muted-foreground mb-3">{demoFs.name}</div>

                    {/* KPI Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-background border border-border border-l-2 border-l-primary rounded-lg p-3">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Total Carbon</div>
                        <div className="text-2xl font-mono font-bold text-primary mt-0.5">{demoResult.C.toFixed(1)}</div>
                        <div className="text-[10px] text-muted-foreground">% dry mass</div>
                      </div>
                      <div className="bg-background border border-border border-l-2 border-l-primary rounded-lg p-3">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">H:Corg</div>
                        <div className="text-2xl font-mono font-bold mt-0.5">{demoResult.H_Corg.toFixed(3)}</div>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-green-500/10 text-green-500 border border-green-500/20 px-1.5 py-0.5 rounded-full">
                          {demoResult.H_Corg < 0.4 ? "BC-1" : demoResult.H_Corg < 0.7 ? "BC-2" : "FAIL"}
                        </span>
                      </div>
                      <div className="bg-background border border-border border-l-2 border-l-primary rounded-lg p-3">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Net CO₂e</div>
                        <div className="text-2xl font-mono font-bold mt-0.5">{demoResult.credits.net.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">t/t biochar</div>
                      </div>
                      <div className="bg-background border border-border border-l-2 border-l-cyan-500 rounded-lg p-3">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Yield</div>
                        <div className="text-2xl font-mono font-bold text-cyan-500 mt-0.5">{demoResult.yield_.toFixed(1)}</div>
                        <div className="text-[10px] text-muted-foreground">% dry mass</div>
                      </div>
                    </div>

                    {/* Real mini chart */}
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] text-muted-foreground uppercase font-bold">Thermal Sensitivity</div>
                        <div className="text-[10px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          Open simulator <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                      <div className="h-14">
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
      <section className="py-12 border-t border-border bg-gradient-to-b from-background to-card/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-3 py-1 rounded-full mb-3">
              <Zap className="w-3 h-3" />
              Live preview
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">See it in action</h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Real output from our pyrolysis model running on Pine Sawdust at 650°C, and an LCA on the MAF Corrientes reference case.
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
                      <BarChart3 className="w-3.5 h-3.5" /> Thermal Sensitivity
                    </h3>
                    <div className="text-[10px] text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Try in simulator <ArrowRight className="w-3 h-3" />
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
                      <Beaker className="w-3.5 h-3.5" /> Quality Profile
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
            <Link href="/lca?preview=1" className="block">
              <div className="relative bg-card border border-border hover:border-green-500/50 rounded-xl p-4 cursor-pointer group transition-all h-[516px] flex flex-col">
                <div className="absolute top-3 right-3 inline-flex items-center gap-1 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Analyst
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-3.5 h-3.5 text-green-500" />
                  <h3 className="text-xs font-bold text-muted-foreground">LCA — Puro.earth Ed. 2025</h3>
                </div>
                <div className="text-[10px] text-muted-foreground mb-3">
                  Reference case: <span className="font-semibold text-foreground">MAF Corrientes</span> · 74,880 t/yr forestry residues · 650°C pyrolysis
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
                  <div className="text-muted-foreground">6 automatic validations · All OK</div>
                  <div className="text-primary font-medium opacity-70 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Open full LCA <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="text-center mt-8">
            <Link href="/app">
              <Button size="lg" className="gap-2 shadow-lg shadow-primary/20">
                <Zap className="w-4 h-4" />
                Open the simulator
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>


      {/* HOW IT WORKS */}
      <section className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">How it works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Three stages, one platform. Each step builds on the previous one
              as your project matures from idea to operating plant.
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
                <h3 className="text-xl font-bold mb-3">Simulate</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                  Input your biomass and pyrolysis conditions. The model predicts
                  carbon content, H:Corg ratio, yield, BET surface area, pH and
                  CO₂e credits — instantly, for any feedstock.
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
                <h3 className="text-xl font-bold mb-3">Design</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                  Size your reactor, run mass and energy balances, estimate
                  CAPEX/OPEX, and generate a full financial model with IRR,
                  NPV and a 10-year carbon credit projection.
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
                <h3 className="text-xl font-bold mb-3">Certify</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                  Navigate environmental permits, industrial licenses and
                  carbon certification requirements by country. Step-by-step
                  guides for Puro.earth, Isometric, EBC and VERRA.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {["Puro.earth", "Isometric", "EBC", "VERRA", "Permits"].map((tag) => (
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

      {/* MODULES */}
      <section data-version="accordion-v3" className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">A platform that grows with your project</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each module solves the problem of the moment. Start with technical simulation 
              and unlock layers as your project progresses.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {MODULES.map((mod) => (
              <div
                key={mod.title}
                className={`bg-card border border-border rounded-xl transition-all duration-200 cursor-pointer flex flex-col ${mod.borderHover} ${openModule === mod.title ? "border-primary/30 shadow-md" : ""}`}
                onClick={() => setOpenModule(prev => prev === mod.title ? null : mod.title)}
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
                      className={`w-4 h-4 text-muted-foreground shrink-0 mt-1 transition-transform duration-200 ${openModule === mod.title ? "rotate-180" : ""}`}
                    />
                  </div>
                </div>
                {openModule === mod.title && (
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
                        View plans <ArrowRight className="w-3 h-3" />
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
            <h2 className="text-3xl font-bold mb-3">Plans & Pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Start for free and scale when your project requires it.
              All plans include access to the technical simulator.
            </p>
          </div>

          {/* Carbon Forum special promo */}
          <div className="relative mb-8 overflow-hidden rounded-xl border-2 border-green-500/40 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent p-4 md:p-5 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <div className="inline-flex items-center gap-1 bg-green-500/20 text-green-700 dark:text-green-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Carbon Forum Colombia 2026
                  </div>
                  <div className="inline-flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <Sparkles className="w-2.5 h-2.5" />
                    Limited time
                  </div>
                </div>
                <h3 className="text-xl md:text-2xl font-bold mb-1">
                  Carbon Forum Pass — <span className="text-green-600 dark:text-green-400">$50</span>
                  <span className="text-xs text-muted-foreground font-normal ml-2">30-day full Analyst access</span>
                </h3>
                <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5 text-[11px] text-foreground mt-2">
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> Pyrolysis simulator</li>
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> T°/time optimizer</li>
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> PDF export</li>
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> Project Manager</li>
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> LCA (Puro.earth)</li>
                  <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> AI biomass search</li>
                </ul>
              </div>
              <div className="w-full md:w-auto flex flex-col gap-1 md:items-end">
                <CarbonForumPassButton />
                <p className="text-[10px] text-center md:text-right text-muted-foreground">
                  Code <span className="font-mono font-bold">CARBONFORUM50</span>
                </p>
              </div>
            </div>
          </div>

          {/* Tier cards — Free + Analyst */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`relative bg-card rounded-xl border-2 ${tier.color} p-6 flex flex-col ${tier.badge ? "ring-2 ring-primary/20" : ""}`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                    {tier.badge}
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="font-bold text-base mb-1">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold">{tier.price === 0 ? "Free" : `$${tier.price}`}</span>
                    {tier.period && <span className="text-xs text-muted-foreground">{tier.period}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tier.description}</p>
                </div>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs">
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
            ))}
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-6">
            <Sparkles className="w-3 h-3 inline-block align-text-bottom text-amber-500" /> More advanced tiers (Developer · Engineer · Expert) are on the way as we build them. We won't charge for vapor.
          </p>
          <p className="text-center text-xs text-muted-foreground mt-2">
            Need detailed engineering, certification support or technical due diligence for investors?{" "}
            <Link href="/pricing"><span className="text-primary hover:underline">Contact us for an Enterprise plan</span></Link>
          </p>
        </div>
      </section>


      {/* FAQ */}
      <section className="py-20 border-t border-border">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Frequently asked questions</h2>
            <p className="text-muted-foreground">Everything you need to know before getting started.</p>
          </div>
          <div className="space-y-2">
            {[
              {
                q: "How accurate is the pyrolysis model?",
                a: "The empirical model predicts carbon content (C%), H:Corg ratio, biochar yield, BET surface area, pH, and CO₂e credits. Predictions are calibrated against peer-reviewed pyrolysis literature data and validated across a range of feedstocks. For most woody and agricultural residue feedstocks, C% and H:Corg predictions fall within ±5–8% of reported lab values. Accuracy decreases for highly heterogeneous or exotic feedstocks — in those cases, we recommend using the AI biomass search to obtain literature-sourced proximate/ultimate analysis data."
              },
              {
                q: "Which certification standards does the platform cover?",
                a: "The current simulator is calibrated against the EBC (European Biochar Certificate) and Puro.earth methodology requirements, specifically the H:Corg ≤ 0.7 threshold for permanence classification and the BC-1/BC-2/BC-3 quality tiers. Isometric and Verra VM0044 coverage is planned for the Developer tier in an upcoming release."
              },
              {
                q: "Can I use my own lab data to calibrate the model?",
                a: "Not yet directly, but the \"Custom Biomass\" feature in the simulator lets you input your own proximate/ultimate analysis values (C, H, O, N, S, ash, moisture) as anchor points. This gives you model predictions based on your specific feedstock composition rather than the built-in database. Full lab-data calibration is planned as a feature for the Engineer tier."
              },
              {
                q: "What feedstocks are included in the database?",
                a: "The built-in database includes 8 common feedstocks: pine sawdust, eucalyptus wood, rice husk, corn stover, sugarcane bagasse, wheat straw, sewage sludge, and olive pomace. The AI biomass search extends this to virtually any feedstock by querying peer-reviewed literature data in real time. Free plan users are limited to 3 AI searches per day; paid plans have unlimited searches."
              },
              {
                q: "What does the CO₂e credit calculation include?",
                a: "The CO₂e calculation follows the Puro.earth methodology: it converts the stable carbon fraction (based on C% and H:Corg) to CO₂ equivalents, applies a permanence factor based on the H:Corg ratio, and subtracts a default Scope 3 emission factor for transport and energy. The result is expressed as net tonnes of CO₂e per tonne of dry biochar. For a full LCA with site-specific Scope 3 data, the LCA module is available in the Analyst plan."
              },
              {
                q: "Can I cancel my subscription at any time?",
                a: "Yes. All plans are billed monthly and can be cancelled at any time from your account settings. You retain access to your plan features until the end of the current billing period. There are no cancellation fees or long-term commitments."
              },
              {
                q: "Is my data private?",
                a: "Yes. Your simulation inputs, saved scenarios, and AI biomass searches are private to your account and are never shared with third parties. We do not use your project data to train models or for any purpose other than delivering the platform features to you."
              },
            ].map((item, i) => (
              <FaqItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <SiteFooter />
    </div>
  );
}
