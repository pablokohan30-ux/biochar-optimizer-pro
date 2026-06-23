import { Link } from "wouter";
import { CheckCircle, X, ArrowLeft, Send, AlertCircle, Sparkles, FileSpreadsheet, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoLink from "@/components/LogoLink";
import SiteFooter from "@/components/SiteFooter";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SubscribeButton, { type SubscribeTierId, type BillingCycle } from "@/components/SubscribeButton";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PUBLIC_TIER_BY_ID } from "@/lib/pricingCatalog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { isCorporateEmail } from "@shared/corporateEmail";

type FeatureRow = {
  label: string;
  free: boolean | string;
  analyst: boolean | string;
  developer: boolean | string;
  engineer: boolean | string;
  expert: boolean | string;
};

const SALES_EMAIL = "legal@biocharpro.io";

const FEATURES: FeatureRow[] = [
  // Free
  { label: "pricing:features.simulator",              free: true,                            analyst: true,  developer: true,  engineer: true,  expert: true },
  { label: "pricing:features.feedstockDb",            free: true,                            analyst: true,  developer: true,  engineer: true,  expert: true },
  { label: "pricing:features.aiSearch",               free: "pricing:features.aiSearchFree", analyst: true,  developer: true,  engineer: true,  expert: true },
  { label: "pricing:features.coreKpis",               free: true,                            analyst: true,  developer: true,  engineer: true,  expert: true },
  { label: "pricing:features.thermalChart",            free: true,                            analyst: true,  developer: true,  engineer: true,  expert: true },
  { label: "pricing:features.radarProfile",            free: true,                            analyst: true,  developer: true,  engineer: true,  expert: true },
  // Analyst
  { label: "pricing:features.pdfExport",               free: false, analyst: true,  developer: true,  engineer: true,  expert: true },
  { label: "pricing:features.tempOptimizer",           free: false, analyst: true,  developer: true,  engineer: true,  expert: true },
  { label: "pricing:features.projectManager",          free: false, analyst: true,  developer: true,  engineer: true,  expert: true },
  { label: "pricing:features.lcaModule",               free: false, analyst: true,  developer: true,  engineer: true,  expert: true },
  { label: "pricing:features.compliance",              free: false, analyst: true,  developer: true,  engineer: true,  expert: true },
  { label: "pricing:features.lcaTemplate",             free: false, analyst: true,  developer: true,  engineer: true,  expert: true },
  { label: "pricing:features.prioritySupport",         free: false, analyst: true,  developer: true,  engineer: true,  expert: true },
  // Developer
  { label: "pricing:features.batchProcessing",         free: false, analyst: false, developer: true,  engineer: true,  expert: true },
  { label: "pricing:features.apiAccess",               free: false, analyst: false, developer: true,  engineer: true,  expert: true },
  { label: "pricing:features.whiteLabel",              free: false, analyst: false, developer: true,  engineer: true,  expert: true },
  // Engineer
  { label: "pricing:features.aiProjectBuilder",        free: false, analyst: false, developer: false, engineer: true,  expert: true },
  { label: "pricing:features.aiProjectPackageExport",  free: false, analyst: false, developer: false, engineer: true,  expert: true },
  { label: "pricing:features.pddBuilder",              free: false, analyst: false, developer: false, engineer: true,  expert: true },
  { label: "pricing:features.equipmentLayout",         free: false, analyst: false, developer: false, engineer: true,  expert: true },
  { label: "pricing:features.electricalPackage",       free: false, analyst: false, developer: false, engineer: true,  expert: true },
  { label: "pricing:features.qualityControl",          free: false, analyst: false, developer: false, engineer: true,  expert: true },
  // Expert
  { label: "pricing:features.portfolioDashboard",      free: false, analyst: false, developer: false, engineer: false, expert: true },
  { label: "pricing:features.customLca",               free: false, analyst: false, developer: false, engineer: false, expert: true },
  { label: "pricing:features.accountManager",          free: false, analyst: false, developer: false, engineer: false, expert: true },
  // Operational pipeline (Stage 3 + 4) — Microsoft/Frontier DD demands operational evidence, not just paperwork
  { label: "pricing:features.operationalEvidence",     free: false, analyst: false, developer: false, engineer: false, expert: true },
  { label: "pricing:features.offtakeTracking",         free: false, analyst: false, developer: false, engineer: false, expert: true },
  { label: "pricing:features.communityImpact",         free: false, analyst: false, developer: false, engineer: false, expert: true },
  { label: "pricing:features.buyerReadiness",          free: false, analyst: false, developer: false, engineer: false, expert: true },
  { label: "pricing:features.buyerMatch",              free: false, analyst: false, developer: false, engineer: false, expert: true },
  { label: "pricing:features.auditPackage",            free: false, analyst: false, developer: false, engineer: false, expert: true },
];

const TIERS = [
  {
    id: "free", nameKey: "pricing:tiers.explorer.name",
    monthlyPrice: PUBLIC_TIER_BY_ID.free.monthlyPriceUsd,
    quarterlyPerMonth: PUBLIC_TIER_BY_ID.free.quarterlyPerMonthUsd,
    quarterlyTotal: PUBLIC_TIER_BY_ID.free.quarterlyTotalUsd,
    savings: PUBLIC_TIER_BY_ID.free.savingsUsd,
    status: PUBLIC_TIER_BY_ID.free.status,
    color: "text-foreground", bg: "bg-secondary/30", borderColor: "border-border",
    descKey: "pricing:tiers.explorer.description",
    bestForKey: "pricing:tiers.explorer.bestFor",
    outcomeKey: "pricing:tiers.explorer.outcome",
  },
  {
    id: "analyst", nameKey: "pricing:tiers.analyst.name",
    monthlyPrice: PUBLIC_TIER_BY_ID.analyst.monthlyPriceUsd,
    quarterlyPerMonth: PUBLIC_TIER_BY_ID.analyst.quarterlyPerMonthUsd,
    quarterlyTotal: PUBLIC_TIER_BY_ID.analyst.quarterlyTotalUsd,
    savings: PUBLIC_TIER_BY_ID.analyst.savingsUsd,
    status: PUBLIC_TIER_BY_ID.analyst.status,
    color: "text-green-600 dark:text-green-400", bg: "bg-green-500/5", borderColor: "border-green-500/40", popular: true,
    descKey: "pricing:tiers.analyst.description",
    bestForKey: "pricing:tiers.analyst.bestFor",
    outcomeKey: "pricing:tiers.analyst.outcome",
  },
  {
    id: "developer", nameKey: "pricing:tiers.developer.name",
    monthlyPrice: PUBLIC_TIER_BY_ID.developer.monthlyPriceUsd,
    quarterlyPerMonth: PUBLIC_TIER_BY_ID.developer.quarterlyPerMonthUsd,
    quarterlyTotal: PUBLIC_TIER_BY_ID.developer.quarterlyTotalUsd,
    savings: PUBLIC_TIER_BY_ID.developer.savingsUsd,
    status: PUBLIC_TIER_BY_ID.developer.status,
    color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/5", borderColor: "border-blue-500/40",
    descKey: "pricing:tiers.developer.description",
    bestForKey: "pricing:tiers.developer.bestFor",
    outcomeKey: "pricing:tiers.developer.outcome",
  },
  {
    id: "engineer", nameKey: "pricing:tiers.engineer.name",
    monthlyPrice: PUBLIC_TIER_BY_ID.engineer.monthlyPriceUsd,
    quarterlyPerMonth: PUBLIC_TIER_BY_ID.engineer.quarterlyPerMonthUsd,
    quarterlyTotal: PUBLIC_TIER_BY_ID.engineer.quarterlyTotalUsd,
    savings: PUBLIC_TIER_BY_ID.engineer.savingsUsd,
    status: PUBLIC_TIER_BY_ID.engineer.status,
    color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/5", borderColor: "border-purple-500/40", comingSoon: PUBLIC_TIER_BY_ID.engineer.status === "waitlist",
    descKey: "pricing:tiers.engineer.description",
    bestForKey: "pricing:tiers.engineer.bestFor",
    outcomeKey: "pricing:tiers.engineer.outcome",
  },
  {
    id: "expert", nameKey: "pricing:tiers.expert.name",
    monthlyPrice: PUBLIC_TIER_BY_ID.expert.monthlyPriceUsd,
    quarterlyPerMonth: PUBLIC_TIER_BY_ID.expert.quarterlyPerMonthUsd,
    quarterlyTotal: PUBLIC_TIER_BY_ID.expert.quarterlyTotalUsd,
    savings: PUBLIC_TIER_BY_ID.expert.savingsUsd,
    status: PUBLIC_TIER_BY_ID.expert.status,
    color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/5", borderColor: "border-amber-500/40",
    descKey: "pricing:tiers.expert.description",
    bestForKey: "pricing:tiers.expert.bestFor",
    outcomeKey: "pricing:tiers.expert.outcome",
  },
];

function Cell({ value, translated }: { value: boolean | string; translated?: string }) {
  if (value === true) return <CheckCircle className="w-4 h-4 text-primary mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-xs text-muted-foreground">{translated ?? value}</span>;
}

function EnterpriseContact() {
  const { t } = useTranslation("pricing");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [emailError, setEmailError] = useState("");
  const submitInquiry = trpc.launch.submitInquiry.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setForm({ name: "", email: "", company: "", message: "" });
      setEmailError("");
    },
    onError: (error) => {
      toast.error(error.message || t("enterprise.submitError"));
    },
  });

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
    const trimmedEmail = form.email.trim();
    if (!isCorporateEmail(trimmedEmail)) {
      setEmailError(t("enterprise.corporateOnly"));
      return;
    }
    try {
      await submitInquiry.mutateAsync({
        name: form.name.trim(),
        email: trimmedEmail,
        company: form.company.trim(),
        message: form.message.trim(),
      });
    } catch {
      // Toast handled in mutation onError.
    }
  };

  return (
    <div id="contact" className="mt-10 bg-primary/5 border border-primary/20 rounded-xl p-8 scroll-mt-24">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold mb-2">{t("enterprise.title")}</h3>
          <p className="text-muted-foreground text-sm">
            {t("enterprise.subtitle")}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {t("enterprise.orEmail", { defaultValue: "O escríbenos directamente a" })}{" "}
            <a href={`mailto:${SALES_EMAIL}`} className="text-primary hover:underline">{SALES_EMAIL}</a>
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
              <Button type="submit" disabled={submitInquiry.isPending || !!emailError} className="gap-2">
                {submitInquiry.isPending ? t("enterprise.sending") : (<><Send className="w-4 h-4" /> {t("enterprise.send")}</>)}
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
  const [comingSoonAlert, setComingSoonAlert] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("quarterly");

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
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-1">{t("pricing:title")}</h1>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            {t("pricing:subtitle")}
          </p>

          {/* Billing cycle toggle */}
          <div className="mt-4 inline-flex items-center gap-1 bg-secondary/50 border border-border rounded-full p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("pricing:billing.monthly")}
            </button>
            <button
              onClick={() => setBillingCycle("quarterly")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                billingCycle === "quarterly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("pricing:billing.quarterly")}
              <span className="bg-green-500/15 text-green-600 dark:text-green-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                -20%
              </span>
            </button>
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 max-w-5xl mx-auto">
          {TIERS.map((tier) => {
            const isComingSoon = !!(tier as any).comingSoon;
            const localizedName = t(tier.nameKey);
            const localizedDesc = t(tier.descKey);
            const localizedBestFor = t((tier as any).bestForKey);
            const localizedOutcome = t((tier as any).outcomeKey);
            const isQuarterly = billingCycle === "quarterly";
            const isPaid = tier.monthlyPrice > 0;
            const tierStatus = (tier as any).status as "available" | "rollout" | "waitlist";
            const showStatusBadge = tierStatus !== "available";

            return (
            <div key={tier.id} className={`${tier.bg} border ${tier.borderColor} rounded-xl p-5 relative ${(tier as any).popular ? "ring-2 ring-green-500/30" : ""}`}>
              {(tier as any).popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                  {t("pricing:tiers.analyst.mostPopular")}
                </div>
              )}
              <div className="text-center">
                <div className={`font-bold text-base mb-1 ${tier.color}`}>{localizedName}</div>
                {showStatusBadge && (
                  <div className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] mb-2 ${
                    tierStatus === "waitlist"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      : "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                  }`}>
                    {t(`pricing:status.${tierStatus}`)}
                  </div>
                )}
                <div className="text-3xl font-bold mb-0.5">
                  {!isPaid ? t("pricing:tiers.analyst.free") : `$${tier.monthlyPrice}`}
                </div>
                {isPaid && (
                  <>
                    <div className="text-xs text-muted-foreground">{t("pricing:tiers.analyst.perMonth")}</div>
                    {isQuarterly ? (
                      <>
                        <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {t("pricing:billing.quarterlyDetail", { total: tier.quarterlyTotal })}
                        </div>
                        <div className="inline-flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5">
                          <span>🏷</span>
                          {t("pricing:billing.saveVsMonthly", { amount: tier.savings })}
                        </div>
                      </>
                    ) : (
                      <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                        {t("pricing:billing.billedMonthly")}
                      </div>
                    )}
                  </>
                )}
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed mt-3 mb-3 text-left">
                {localizedDesc}
              </p>
              <div className="space-y-2 mb-3 text-left">
                <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {t("pricing:bestForLabel")}
                  </div>
                  <div className="text-xs text-foreground mt-0.5">{localizedBestFor}</div>
                </div>
                <div className="rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {t("pricing:outcomeLabel")}
                  </div>
                  <div className="text-xs text-foreground mt-0.5">{localizedOutcome}</div>
                </div>
              </div>
              {!isPaid ? (
                <Link href="/app">
                  <Button size="sm" variant="outline" className="w-full text-xs">
                    {t("common:cta.getStarted")}
                  </Button>
                </Link>
              ) : isComingSoon ? (
                <Button
                  size="sm"
                  variant="default"
                  className="w-full text-xs"
                  onClick={() => {
                    setComingSoonAlert(localizedName);
                    setTimeout(() => setComingSoonAlert(null), 3000);
                  }}
                >
                  {t("pricing:status.waitlistCta")}
                </Button>
              ) : (
                <SubscribeButton
                  tierId={tier.id as SubscribeTierId}
                  billingCycle={billingCycle}
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

        {/* Coming soon toast */}
        {comingSoonAlert && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-xl rounded-xl px-5 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
            <Clock className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm font-semibold">{comingSoonAlert} — {t("pricing:comingSoon")}</p>
              <p className="text-xs text-muted-foreground">{t("pricing:comingSoonDetail", { defaultValue: "Estamos construyendo este plan. Escríbenos si quieres acceso anticipado." })}</p>
            </div>
          </div>
        )}

        {/* Feature comparison table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden max-w-5xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-3 py-3 font-medium text-muted-foreground text-xs">{t("pricing:featureTableHeader")}</th>
                  {TIERS.map((tier) => (
                    <th key={tier.id} className={`px-2 py-3 font-bold text-center text-[11px] ${tier.color} w-20`}>{t(tier.nameKey)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {FEATURES.map((feat) => (
                  <tr key={feat.label} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-3 py-2 text-xs">{t(feat.label)}</td>
                    <td className="px-2 py-2 text-center"><Cell value={feat.free} translated={typeof feat.free === "string" ? t(feat.free) : undefined} /></td>
                    <td className="px-2 py-2 text-center"><Cell value={feat.analyst} translated={typeof feat.analyst === "string" ? t(feat.analyst) : undefined} /></td>
                    <td className="px-2 py-2 text-center"><Cell value={feat.developer} translated={typeof feat.developer === "string" ? t(feat.developer) : undefined} /></td>
                    <td className="px-2 py-2 text-center"><Cell value={feat.engineer} translated={typeof feat.engineer === "string" ? t(feat.engineer) : undefined} /></td>
                    <td className="px-2 py-2 text-center"><Cell value={feat.expert} translated={typeof feat.expert === "string" ? t(feat.expert) : undefined} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* LCA Excel alternative note */}
        <div className="mt-4 max-w-5xl mx-auto bg-green-500/5 border border-green-500/20 rounded-lg px-4 py-3 flex items-start gap-3">
          <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{t("pricing:prefer.title")}</span>{" "}
            {t("pricing:prefer.body")}
          </div>
        </div>

        {/* Build-in-public note */}
        <div className="mt-3 max-w-5xl mx-auto text-center">
          <p className="text-[11px] text-muted-foreground">
            <Sparkles className="w-3 h-3 inline-block align-text-bottom text-amber-500" /> {t("pricing:buildInPublic")}
          </p>
        </div>

        {/* Enterprise */}
        <EnterpriseContact />

        {/* FAQ */}
        <div className="mt-12 max-w-5xl mx-auto">
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
                {t("pricing:faq.a3Before")}<span className="font-semibold text-foreground">{t("pricing:faq.a3Button")}</span>{t("pricing:faq.a3Middle")}
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
