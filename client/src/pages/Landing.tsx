import { useState } from "react";
import { Link } from "wouter";
import { 
  Flame, BarChart3, FileText, Beaker, Leaf, Globe, 
  Zap, CheckCircle, ArrowRight, Lock, ChevronRight, ChevronDown,
  FlaskConical, Building2, Map, Scale,
  Microscope, Ruler, BadgeCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";



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
      "Database of 7 calibrated feedstocks",
      "AI biomass search (3 searches/day)",
      "Core KPIs: C%, H:Corg, CO₂e, yield",
      "Thermal sensitivity chart",
      "Quality radar profile",
    ],
    locked: [],
  },
  {
    id: "analyst",
    name: "Analyst",
    price: 299,
    period: "/mo",
    description: "For consultants assessing technical feasibility.",
    color: "border-green-500",
    badge: null,
    cta: "Get started",
    ctaVariant: "default" as const,
    href: "/pricing",
    features: [
      "Everything in Explorer",
      "Unlimited AI biomass search",
      "Full PDF report export",
      "EBC / Puro.earth / Isometric compliance analysis",
      "Scenario comparator (up to 5)",
      "Syngas energy balance",
      "Adaptable LCA module (Life Cycle Assessment)",
    ],
    locked: [],
  },
  {
    id: "developer",
    name: "Developer",
    price: 499,
    period: "/mo",
    description: "For teams exploring carbon markets and biochar applications.",
    color: "border-blue-500",
    badge: null,
    cta: "Get started",
    ctaVariant: "default" as const,
    href: "/pricing",
    features: [
      "Everything in Analyst",
      "Carbon market module (platform comparator)",
      "Interactive biochar applications map",
      "Agronomic value calculator by region",
      "Priority technical support",
    ],
    locked: [],
  },
  {
    id: "engineer",
    name: "Engineer",
    price: 799,
    period: "/mo",
    description: "For projects requiring full technical and financial engineering.",
    color: "border-purple-500",
    badge: "MOST POPULAR",
    cta: "Get started",
    ctaVariant: "default" as const,
    href: "/pricing",
    features: [
      "Everything in Developer",
      "Reactor sizing (ton/h → kW → m³)",
      "CAPEX / OPEX estimation",
      "Financial analysis (IRR, NPV, payback)",
      "10-year carbon credit projection",
      "Reactor supplier map",
    ],
    locked: [],
  },
  {
    id: "expert",
    name: "Expert",
    price: 999,
    period: "/mo",
    description: "For operating plants and investment funds.",
    color: "border-yellow-500",
    badge: "MAXIMUM VALUE",
    cta: "Get started",
    ctaVariant: "default" as const,
    href: "/pricing",
    features: [
      "Everything in Engineer",
      "Plant layout (process flow diagram, P&ID)",
      "Equipment specs and bill of materials",
      "Regulatory framework by country (permits, licenses)",
      "Certification guides (Puro.earth, Isometric, EBC, VERRA)",
      "Technical document for investors",
    ],
    locked: [],
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
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Flame className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-primary tracking-wider text-sm">BIOCHAR OPTIMIZER PRO</span>
          </div>
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-3 py-1 rounded-full mb-6">
              <Leaf className="w-3 h-3" />
              Biochar project development platform
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
              From biomass to<br />
              <span className="text-primary">carbon credit</span>,<br />
              step by step.
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl leading-relaxed">
              The only platform that accompanies the full lifecycle of a biochar project: 
              from technical simulation to complete plant design, LCA, 
              regulatory permits, and access to carbon markets.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/app">
                <Button size="lg" className="gap-2 text-base px-8">
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
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Plans & Pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Start for free and scale when your project requires it. 
              All plans include access to the technical simulator.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`relative bg-card rounded-xl border-2 ${tier.color} p-5 flex flex-col ${tier.badge ? "ring-2 ring-primary/20" : ""}`}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                    {tier.badge}
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="font-bold text-sm mb-1">{tier.name}</h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-2xl font-bold">{tier.price === 0 ? "Free" : `$${tier.price}`}</span>
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
                <Link href={tier.href}>
                  <Button variant={tier.ctaVariant} size="sm" className="w-full text-xs">
                    {tier.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            Need detailed engineering, certification support or technical due diligence for investors?{" "}
            <a href="mailto:info@biocharpro.com" className="text-primary hover:underline">Contact us for an Enterprise plan</a>
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
      <footer className="border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm text-primary">BIOCHAR OPTIMIZER PRO</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Empirical model calibrated with peer-reviewed pyrolysis literature data.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/app" className="hover:text-foreground transition-colors">Simulator</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
