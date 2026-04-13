import { Link } from "wouter";
import { Flame, CheckCircle, X, ArrowLeft, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.es", "yahoo.fr",
  "hotmail.com", "hotmail.co.uk", "hotmail.es", "hotmail.fr", "outlook.com",
  "live.com", "msn.com", "icloud.com", "me.com", "mac.com",
  "aol.com", "protonmail.com", "proton.me", "tutanota.com", "tutamail.com",
  "mail.com", "gmx.com", "gmx.net", "yandex.com", "yandex.ru",
  "zoho.com", "inbox.com", "fastmail.com", "hey.com",
];

function isCorporateEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  return !PERSONAL_EMAIL_DOMAINS.includes(domain);
}

const FEATURES = [
  // Free + all tiers
  { label: "Interactive pyrolysis simulator", free: true, analyst: true, developer: true, engineer: true, expert: true },
  { label: "Calibrated feedstock database (peer-reviewed)", free: true, analyst: true, developer: true, engineer: true, expert: true },
  { label: "AI biomass search", free: "3/day", analyst: true, developer: true, engineer: true, expert: true },
  { label: "Core KPIs (C%, H:Corg, CO₂e, yield, BET, pH)", free: true, analyst: true, developer: true, engineer: true, expert: true },
  { label: "Thermal sensitivity chart", free: true, analyst: true, developer: true, engineer: true, expert: true },
  { label: "Quality radar profile", free: true, analyst: true, developer: true, engineer: true, expert: true },
  // Analyst+
  { label: "Full PDF report export", free: false, analyst: true, developer: true, engineer: true, expert: true },
  { label: "Temperature/time optimizer", free: false, analyst: true, developer: true, engineer: true, expert: true },
  { label: "Adaptable LCA module (Life Cycle Assessment)", free: false, analyst: true, developer: true, engineer: true, expert: true },
  { label: "EBC / Puro.earth / Isometric compliance analysis", free: false, analyst: true, developer: true, engineer: true, expert: true },
  { label: "Scenario comparator (up to 5)", free: false, analyst: true, developer: true, engineer: true, expert: true },
  // Developer+
  { label: "Carbon market module (platform comparator)", free: false, analyst: false, developer: true, engineer: true, expert: true },
  { label: "Interactive biochar applications map", free: false, analyst: false, developer: true, engineer: true, expert: true },
  { label: "Agronomic value calculator by region", free: false, analyst: false, developer: true, engineer: true, expert: true },
  { label: "Priority technical support", free: false, analyst: false, developer: true, engineer: true, expert: true },
  // Engineer+
  { label: "Reactor sizing (ton/h → kW → m³)", free: false, analyst: false, developer: false, engineer: true, expert: true },
  { label: "CAPEX / OPEX estimation", free: false, analyst: false, developer: false, engineer: true, expert: true },
  { label: "Financial analysis (IRR, NPV, payback)", free: false, analyst: false, developer: false, engineer: true, expert: true },
  { label: "10-year carbon credit projection", free: false, analyst: false, developer: false, engineer: true, expert: true },
  { label: "Reactor supplier map", free: false, analyst: false, developer: false, engineer: true, expert: true },
  // Expert only
  { label: "Plant layout (process flow diagram, P&ID)", free: false, analyst: false, developer: false, engineer: false, expert: true },
  { label: "Equipment specs and bill of materials", free: false, analyst: false, developer: false, engineer: false, expert: true },
  { label: "Regulatory framework by country (permits, licenses)", free: false, analyst: false, developer: false, engineer: false, expert: true },
  { label: "Certification guides (Puro.earth, Isometric, EBC, VERRA)", free: false, analyst: false, developer: false, engineer: false, expert: true },
  { label: "Technical document for investors", free: false, analyst: false, developer: false, engineer: false, expert: true },
];

const TIERS = [
  {
    id: "free", name: "Explorer", price: 0, quarterly: 0, savings: 0,
    color: "text-foreground", bg: "bg-secondary/30",
    description: "Full access to the interactive pyrolysis simulator. Predict C%, H:Corg, yield, BET, pH and CO₂e credits for any feedstock — no account required."
  },
  {
    id: "analyst", name: "Analyst", price: 299, quarterly: 897, savings: 3 * 329 - 897,
    color: "text-green-600 dark:text-green-400", bg: "bg-green-500/5",
    description: "For teams preparing carbon certification dossiers. Includes LCA module, EBC / Puro.earth / Isometric compliance analysis, scenario comparator and full PDF report export."
  },
  {
    id: "developer", name: "Developer", price: 499, quarterly: 1497, savings: 3 * 549 - 1497,
    color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/5",
    description: "For teams exploring carbon markets and biochar applications. Adds carbon market platform comparator, interactive applications map, agronomic value calculator by region and priority support."
  },
  {
    id: "engineer", name: "Engineer", price: 799, quarterly: 2397, savings: 3 * 879 - 2397,
    color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/5", popular: true,
    description: "For project developers who need full financial viability analysis. Reactor sizing (ton/h → kW → m³), CAPEX/OPEX estimation, IRR/NPV/payback, 10-year carbon credit projection and reactor supplier map."
  },
  {
    id: "expert", name: "Expert", price: 999, quarterly: 2997, savings: 3 * 1099 - 2997,
    color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/5",
    description: "For projects moving to execution. Plant layout with P&ID, equipment specs and bill of materials, regulatory framework by country, certification guides (Puro.earth, Isometric, EBC, VERRA) and technical document for investors."
  },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <CheckCircle className="w-4 h-4 text-primary mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-xs text-muted-foreground">{value}</span>;
}

function EnterpriseContact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, email: val }));
    if (val.includes("@") && !isCorporateEmail(val)) {
      setEmailError("Please use a corporate email address. Personal email providers (Gmail, Hotmail, Yahoo, etc.) are not accepted.");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCorporateEmail(form.email)) {
      setEmailError("Please use a corporate email address. Personal email providers (Gmail, Hotmail, Yahoo, etc.) are not accepted.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="mt-10 bg-primary/5 border border-primary/20 rounded-xl p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold mb-2">Need more? Let's talk.</h3>
          <p className="text-muted-foreground text-sm">
            For detailed engineering, certification support, technical due diligence for investors,
            or full plant implementation — we work with you outside the platform.
          </p>
        </div>
        {submitted ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-primary" />
            </div>
            <h4 className="font-semibold mb-1">Message sent!</h4>
            <p className="text-sm text-muted-foreground">We'll get back to you within 24 hours.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name *</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Your name"
                className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Corporate Email *
              </label>
              <input
                required
                type="email"
                value={form.email}
                onChange={handleEmailChange}
                placeholder="you@yourcompany.com"
                className={`bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
                  emailError ? "border-red-500 focus:ring-red-500" : "border-border"
                }`}
              />
              {emailError && (
                <p className="text-xs text-red-500 flex items-start gap-1 mt-0.5">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  {emailError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Company / Organization *</label>
              <input
                required
                type="text"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="Company name"
                className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tell us about your project *</label>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Describe your project: biomass type, scale, location, goals..."
                className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={loading || !!emailError} className="gap-2">
                {loading ? "Sending..." : (<><Send className="w-4 h-4" /> Send message</>)}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Flame className="w-4 h-4 text-primary" />
              </div>
              <span className="font-bold text-primary tracking-wider text-sm">BIOCHAR OPTIMIZER PRO</span>
            </div>
          </Link>
          <Link href="/app">
            <Button size="sm">Try for free</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1 mb-6 text-muted-foreground">
            <ArrowLeft className="w-3 h-3" /> Back
          </Button>
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">Plans & Pricing</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Start for free and scale when your project requires it.
            All paid plans are billed quarterly — minimum 3-month commitment.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium px-4 py-2 rounded-full">
            <AlertCircle className="w-3.5 h-3.5" />
            Minimum subscription: 3 months (billed quarterly)
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
          {TIERS.map((tier) => (
            <div key={tier.id} className={`${tier.bg} border border-border rounded-xl p-4 text-center relative ${(tier as any).popular ? "ring-2 ring-primary/30" : ""}`}>
              {(tier as any).popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                  MOST POPULAR
                </div>
              )}
              <div className={`font-bold text-sm mb-1 ${tier.color}`}>{tier.name}</div>
              <div className="text-2xl font-bold mb-0.5">
                {tier.price === 0 ? "Free" : `$${tier.price}`}
              </div>
              {tier.price > 0 && (
                <>
                  <div className="text-xs text-muted-foreground">/mo</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                    ${tier.quarterly} billed quarterly
                  </div>
                  {tier.savings > 0 && (
                    <div className="inline-flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5 mb-1">
                      <span>🏷</span>
                      Save ${tier.savings} vs monthly
                    </div>
                  )}
                </>
              )}
              {(tier as any).description && (
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-2 mb-3 text-left">
                  {(tier as any).description}
                </p>
              )}
              {!((tier as any).description) && <div className="mb-3" />}
              <Link href={tier.price === 0 ? "/app" : "/app"}>
                <Button size="sm" variant={tier.price === 0 ? "outline" : "default"} className="w-full text-xs">
                  {tier.price === 0 ? "Get started" : "Subscribe"}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* Billing notice */}
        <p className="text-center text-xs text-muted-foreground mb-8">
          All paid plans require a minimum 3-month commitment and are billed as a single quarterly payment.
          After the initial period, subscriptions renew quarterly unless cancelled before the renewal date.
        </p>

        {/* Feature comparison table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-1/2">Feature</th>
                  {TIERS.map((t) => (
                    <th key={t.id} className={`px-3 py-3 font-bold text-center text-xs ${t.color}`}>{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {FEATURES.map((feat) => (
                  <tr key={feat.label} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-2.5 text-sm">{feat.label}</td>
                    <td className="px-3 py-2.5 text-center"><Cell value={feat.free} /></td>
                    <td className="px-3 py-2.5 text-center"><Cell value={feat.analyst} /></td>
                    <td className="px-3 py-2.5 text-center"><Cell value={feat.developer} /></td>
                    <td className="px-3 py-2.5 text-center"><Cell value={feat.engineer} /></td>
                    <td className="px-3 py-2.5 text-center"><Cell value={feat.expert} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Enterprise */}
        <EnterpriseContact />
      </div>
    </div>
  );
}
