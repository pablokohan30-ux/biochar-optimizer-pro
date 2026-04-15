import { Link } from "wouter";
import { CheckCircle, X, ArrowLeft, Send, AlertCircle, Sparkles, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoLink from "@/components/LogoLink";
import SiteFooter from "@/components/SiteFooter";
import CarbonForumPassButton from "@/components/CarbonForumPassButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SubscribeButton, { type SubscribeTierId } from "@/components/SubscribeButton";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type FeatureRow = {
  label: string;
  free: boolean | string;
  analyst: boolean;
};

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

// Only what's actually shipping today. More tiers coming as we build them — we won't sell vapor.
const FEATURES: FeatureRow[] = [
  // Free
  { label: "Interactive pyrolysis simulator", free: true, analyst: true },
  { label: "Calibrated feedstock database (peer-reviewed)", free: true, analyst: true },
  { label: "AI biomass search", free: "3/day", analyst: true },
  { label: "Core KPIs (C%, H:Corg, CO₂e, yield, BET, pH)", free: true, analyst: true },
  { label: "Thermal sensitivity chart", free: true, analyst: true },
  { label: "Quality radar profile", free: true, analyst: true },
  // Analyst
  { label: "Full PDF report export", free: false, analyst: true },
  { label: "Temperature / time optimizer", free: false, analyst: true },
  { label: "Project Manager (multi-project + map + geocoding)", free: false, analyst: true },
  { label: "Adaptable LCA module (Puro.earth Ed. 2025)", free: false, analyst: true },
  { label: "EBC / Puro.earth / Isometric compliance analysis", free: false, analyst: true },
  { label: "Downloadable LCA Excel / Google Sheets template", free: false, analyst: true },
  { label: "Priority email support", free: false, analyst: true },
];

const TIERS = [
  {
    id: "free", name: "Explorer", price: 0, quarterly: 0, savings: 0,
    color: "text-foreground", bg: "bg-secondary/30",
    description: "Full access to the interactive pyrolysis simulator. Predict C%, H:Corg, yield, BET, pH and CO₂e credits for any feedstock — no account required."
  },
  {
    id: "analyst", name: "Analyst", price: 299, quarterly: 897, savings: 3 * 329 - 897,
    color: "text-green-600 dark:text-green-400", bg: "bg-green-500/5", popular: true,
    description: "For teams preparing carbon certification dossiers. Includes the Project Manager, adaptable LCA module (Puro.earth Ed. 2025), EBC / Puro.earth / Isometric compliance analysis, full PDF report export and a downloadable Excel / Google Sheets LCA template."
  },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <CheckCircle className="w-4 h-4 text-primary mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-xs text-muted-foreground">{value}</span>;
}

function EnterpriseContact() {
  const { t } = useTranslation("pricing");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, email: val }));
    if (val.includes("@") && !isCorporateEmail(val)) {
      setEmailError(t("enterprise.corporateOnly"));
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCorporateEmail(form.email)) {
      setEmailError(t("enterprise.corporateOnly"));
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
          <h3 className="text-xl font-bold mb-2">{t("enterprise.title")}</h3>
          <p className="text-muted-foreground text-sm">
            {t("enterprise.subtitle")}
          </p>
        </div>
        {submitted ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6 text-primary" />
            </div>
            <h4 className="font-semibold mb-1">{t("enterprise.sent")}</h4>
            <p className="text-sm text-muted-foreground">{t("enterprise.sentDetail")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("enterprise.name")} *</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("enterprise.namePlaceholder")}
                className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("enterprise.corporateEmail")} *
              </label>
              <input
                required
                type="email"
                value={form.email}
                onChange={handleEmailChange}
                placeholder={t("enterprise.emailPlaceholder")}
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
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("enterprise.company")} *</label>
              <input
                required
                type="text"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder={t("enterprise.companyPlaceholder")}
                className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("enterprise.projectDescription")} *</label>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder={t("enterprise.projectPlaceholder")}
                className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={loading || !!emailError} className="gap-2">
                {loading ? t("enterprise.sending") : (<><Send className="w-4 h-4" /> {t("enterprise.send")}</>)}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Pricing() {
  const { t } = useTranslation(["pricing", "common"]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <LogoLink variant="compact" iconType="flame" showSubtitle={false} />
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/app">
              <Button size="sm">{t("common:nav.tryForFree")}</Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground -ml-2">
              <ArrowLeft className="w-3 h-3" /> {t("common:cta.back")}
            </Button>
          </Link>
          <div className="hidden sm:inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] font-medium px-2.5 py-1 rounded-full">
            <AlertCircle className="w-3 h-3" />
            {t("pricing:billedQuarterly")}
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-1">{t("pricing:title")}</h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            {t("pricing:subtitle")}
          </p>
        </div>

        {/* Carbon Forum special promo */}
        <div className="relative mb-6 overflow-hidden rounded-xl border-2 border-green-500/40 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent p-4 md:p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <div className="inline-flex items-center gap-1 bg-green-500/20 text-green-700 dark:text-green-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {t("pricing:carbonForumPromo.badge")}
                </div>
                <div className="inline-flex items-center gap-1 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <Sparkles className="w-2.5 h-2.5" />
                  {t("pricing:carbonForumPromo.limitedTime")}
                </div>
              </div>
              <h2 className="text-xl md:text-2xl font-bold mb-1">
                {t("pricing:carbonForumPromo.title")} <span className="text-green-600 dark:text-green-400">$50</span>
                <span className="text-xs text-muted-foreground font-normal ml-2">{t("pricing:carbonForumPromo.access30days")}</span>
              </h2>
              <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0.5 text-[11px] text-foreground mt-2">
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {t("pricing:carbonForumPromo.features.simulator")}</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {t("pricing:carbonForumPromo.features.optimizer")}</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {t("pricing:carbonForumPromo.features.pdf")}</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {t("pricing:carbonForumPromo.features.projects")}</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {t("pricing:carbonForumPromo.features.lca")}</li>
                <li className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> {t("pricing:carbonForumPromo.features.aiSearch")}</li>
              </ul>
            </div>
            <div className="w-full md:w-auto flex flex-col gap-1 md:items-end">
              <CarbonForumPassButton />
              <p className="text-[10px] text-center md:text-right text-muted-foreground">
                {t("pricing:carbonForumPromo.codeLabel")} <span className="font-mono font-bold">CARBONFORUM50</span>
              </p>
            </div>
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-w-3xl mx-auto">
          {TIERS.map((tier) => {
            const localized =
              tier.id === "free"
                ? {
                    description: t("pricing:tiers.explorer.description"),
                  }
                : {
                    description: t("pricing:tiers.analyst.description"),
                  };
            return (
            <div key={tier.id} className={`${tier.bg} border border-border rounded-xl p-5 relative ${(tier as any).popular ? "ring-2 ring-primary/30" : ""}`}>
              {(tier as any).popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                  {t("pricing:tiers.analyst.mostPopular")}
                </div>
              )}
              <div className="text-center">
                <div className={`font-bold text-base mb-1 ${tier.color}`}>{tier.name}</div>
                <div className="text-3xl font-bold mb-0.5">
                  {tier.price === 0 ? t("pricing:tiers.analyst.free") : `$${tier.price}`}
                </div>
                {tier.price > 0 && (
                  <>
                    <div className="text-xs text-muted-foreground">{t("pricing:tiers.analyst.perMonth")}</div>
                    <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                      {t("pricing:tiers.analyst.billedQuarterlyAmount", { amount: tier.quarterly })}
                    </div>
                    {tier.savings > 0 && (
                      <div className="inline-flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5">
                        <span>🏷</span>
                        {t("pricing:tiers.analyst.save", { amount: tier.savings })}
                      </div>
                    )}
                  </>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed mt-3 mb-3 text-left">
                {localized.description}
              </p>
              {tier.price === 0 ? (
                <Link href="/app">
                  <Button size="sm" variant="outline" className="w-full text-xs">
                    {t("common:cta.getStarted")}
                  </Button>
                </Link>
              ) : (
                <SubscribeButton
                  tierId={tier.id as SubscribeTierId}
                  size="sm"
                  variant="default"
                  className="w-full text-xs"
                >
                  {t("pricing:tiers.analyst.subscribe")}
                </SubscribeButton>
              )}
            </div>
            );
          })}
        </div>

        {/* Feature comparison table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden max-w-3xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Feature</th>
                  {TIERS.map((t) => (
                    <th key={t.id} className={`px-4 py-3 font-bold text-center text-xs ${t.color} w-28`}>{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {FEATURES.map((feat) => (
                  <tr key={feat.label} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-2.5 text-sm">{feat.label}</td>
                    <td className="px-4 py-2.5 text-center"><Cell value={feat.free} /></td>
                    <td className="px-4 py-2.5 text-center"><Cell value={feat.analyst} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* LCA Excel alternative note */}
        <div className="mt-4 max-w-3xl mx-auto bg-green-500/5 border border-green-500/20 rounded-lg px-4 py-3 flex items-start gap-3">
          <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{t("pricing:prefer.title")}</span>{" "}
            {t("pricing:prefer.body")}
          </div>
        </div>

        {/* Build-in-public note */}
        <div className="mt-3 max-w-3xl mx-auto text-center">
          <p className="text-[11px] text-muted-foreground">
            <Sparkles className="w-3 h-3 inline-block align-text-bottom text-amber-500" /> {t("pricing:buildInPublic")}
          </p>
        </div>

        {/* Enterprise */}
        <EnterpriseContact />

        {/* FAQ */}
        <div className="mt-12 max-w-3xl mx-auto">
          <h3 className="text-lg font-bold text-center mb-5">{t("pricing:faq.title")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm font-semibold mb-1.5">{t("pricing:faq.q1")}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("pricing:faq.a1")}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm font-semibold mb-1.5">{t("pricing:faq.q2")}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("pricing:faq.a2")}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm font-semibold mb-1.5">{t("pricing:faq.q3")}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("pricing:faq.a3Before")}<span className="font-semibold text-foreground">{t("pricing:faq.a3Button")}</span>{t("pricing:faq.a3Middle")}<span className="font-mono font-semibold text-foreground">{t("pricing:faq.a3Code")}</span>{t("pricing:faq.a3After")}
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm font-semibold mb-1.5">{t("pricing:faq.q4")}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t("pricing:faq.a4Before")}<Link href="/legal/privacy"><span className="text-primary hover:underline">{t("pricing:faq.a4Link")}</span></Link>{t("pricing:faq.a4After")}
              </p>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
