/**
 * Public verification page — `/verify/:bopId`
 *
 * Anyone can land here with a BOP project ID (stamped on every PDF export)
 * and confirm the project was registered on biocharpro.io.
 *
 * What's shown depends on the project's `publicVisibility` setting:
 *   - `private` → 404
 *   - `summary` (default) → name, country, status, methodology, dates, annual estimates
 *   - `full` → above + city-level location + pyrolysis snapshot
 *
 * Lab data, exact coordinates, and userId are NEVER exposed.
 *
 * NO authentication required. This is the public-facing trust layer for
 * certifiers / partners receiving our PDFs in the wild.
 */

import { Link, useParams } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck, AlertTriangle, ArrowRight, MapPin,
  Calendar, FileCheck, Beaker, Layers, Flame, Clock,
  ExternalLink, Building2, Factory, Cpu, Leaf,
  TrendingUp, CheckCircle2, XCircle, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LogoLink from "@/components/LogoLink";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import SiteFooter from "@/components/SiteFooter";
import { trpc } from "@/lib/trpc";
import { METHODOLOGIES, type MethodologyId } from "@/lib/methodologies";

const STATUS_CONFIG: Record<string, { color: string; bg: string }> = {
  draft:     { color: "text-gray-600 dark:text-gray-300", bg: "bg-gray-500/10 border-gray-500/30" },
  submitted: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  approved:  { color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10 border-green-500/30" },
  rejected:  { color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10 border-red-500/30" },
};

export default function Verify() {
  const params = useParams<{ bopId: string }>();
  const { t, i18n } = useTranslation(["verify", "common"]);
  const bopId = params.bopId ?? "";

  const query = trpc.projects.verifyByBopId.useQuery(
    { bopId },
    {
      enabled: bopId.length > 0,
      retry: false,
      staleTime: 60_000,
    }
  );

  const project = query.data;
  const isLoading = query.isLoading;
  const isNotFound = !isLoading && (project === null || project === undefined);

  // Methodology meta
  const methId = (project?.methodology ?? "puro-earth") as MethodologyId;
  const methodology = METHODOLOGIES[methId] ?? METHODOLOGIES["puro-earth"];

  const statusKey = project?.status ?? "draft";
  const statusStyle = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.draft;

  const fmtDate = (d: Date | string | null | undefined): string => {
    if (!d) return "—";
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toLocaleDateString(i18n.language === "es" ? "es-AR" : "en-US", {
      year: "numeric", month: "long", day: "numeric"
    });
  };

  const fmtNumber = (n: number | null | undefined, decimals = 0): string => {
    if (n === null || n === undefined) return "—";
    return n.toLocaleString(i18n.language === "es" ? "es-AR" : "en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
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
              <Button size="sm">{t("common:nav.tryForFree")}</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 md:py-16">
        {/* HEADER — verification stamp */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3" />
            {t("verify:verificationBadge")}
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
            {t("verify:title")}
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl">
            {t("verify:subtitle")}
          </p>
        </div>

        {/* LOADING */}
        {isLoading && (
          <div className="border border-border rounded-lg p-12 text-center">
            <div className="inline-block animate-pulse">
              <ShieldCheck className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              {t("verify:loading")}
            </p>
          </div>
        )}

        {/* NOT FOUND */}
        {isNotFound && (
          <div className="border border-red-500/30 bg-red-500/5 rounded-lg p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">{t("verify:notFoundTitle")}</h2>
            <p className="text-sm text-muted-foreground mb-2">
              {t("verify:notFoundBody", { bopId: bopId || "—" })}
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              {t("verify:notFoundHint")}
            </p>
            <Link href="/">
              <Button variant="outline" size="sm">
                {t("verify:goHome")} <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        {/* FOUND */}
        {project && (
          <>
            {/* Project ID + name card */}
            <div className="border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card rounded-lg p-6 md:p-8 mb-6">
              <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                    {t("verify:projectId")}
                  </div>
                  <div className="font-mono text-2xl md:text-3xl font-bold text-primary mb-3 break-all">
                    {project.bopId}
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold mb-2 break-words">
                    {project.name}
                  </h2>
                  {project.country && (
                    <div className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {project.location || project.country}
                    </div>
                  )}
                </div>
                <div className={`inline-flex items-center gap-1.5 ${statusStyle.bg} ${statusStyle.color} border text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider flex-shrink-0`}>
                  <FileCheck className="w-3 h-3" />
                  {t(`verify:status.${statusKey}`)}
                </div>
              </div>
            </div>

            {/* NEW: Developer + project identity (if any) */}
            {(project.developer || project.projectType || project.technology || project.commissioningDate || project.feedstockCategory) && (
              <div className="border border-border rounded-lg p-5 bg-card mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("verify:projectIdentity")}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {project.developer && (
                    <IdentityRow icon={Building2} label={t("verify:developer")} value={project.developer} />
                  )}
                  {project.projectType && (
                    <IdentityRow icon={Factory} label={t("verify:projectType")} value={project.projectType} />
                  )}
                  {project.technology && (
                    <IdentityRow icon={Cpu} label={t("verify:technology")} value={project.technology} />
                  )}
                  {project.commissioningDate && (
                    <IdentityRow icon={Calendar} label={t("verify:commissioning")} value={project.commissioningDate} />
                  )}
                  {project.feedstockCategory && (
                    <IdentityRow icon={Leaf} label={t("verify:feedstockCategory")} value={project.feedstockCategory} />
                  )}
                  {project.feedstockOrigin && (
                    <IdentityRow icon={MapPin} label={t("verify:feedstockOrigin")} value={project.feedstockOrigin} />
                  )}
                </div>
              </div>
            )}

            {/* NEW: Annual estimates (when we have capacity + pyrolysis data) */}
            {project.annualCO2Removals !== null && project.annualCO2Removals !== undefined && (
              <div className="border border-border rounded-lg p-5 bg-gradient-to-br from-card to-primary/5 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("verify:annualEstimatesTitle")}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <AnnualCard
                    label={t("verify:annualCO2")}
                    value={fmtNumber((project.annualCO2Removals ?? 0) / 1000, 1)}
                    unit={t("verify:annualCO2Unit")}
                    highlight
                  />
                  <AnnualCard
                    label={t("verify:annualBiochar")}
                    value={fmtNumber((project.annualBiocharOutput ?? 0) / 1000, 1)}
                    unit={t("verify:annualBiocharUnit")}
                  />
                  <AnnualCard
                    label={t("verify:annualFeedstock")}
                    value={fmtNumber((project.annualFeedstock ?? 0) / 1000, 1)}
                    unit={t("verify:annualFeedstockUnit")}
                  />
                  {project.annualRevenuePotential !== null && project.annualRevenuePotential !== undefined && (
                    <AnnualCard
                      label={t("verify:annualRevenue")}
                      value={fmtNumber((project.annualRevenuePotential ?? 0) / 1000, 0)}
                      unit={t("verify:annualRevenueUnit")}
                    />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
                  {t("verify:annualEstimatesHint")}
                </p>
              </div>
            )}

            {/* Methodology + registered date grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Methodology */}
              <div className="border border-border rounded-lg p-5 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="w-4 h-4 text-muted-foreground" />
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("verify:methodology")}
                  </div>
                </div>
                <div className={`text-lg font-bold ${methodology.color}`}>
                  {methodology.shortName}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {methodology.tagline}
                </div>
              </div>

              {/* Created date */}
              <div className="border border-border rounded-lg p-5 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("verify:registered")}
                  </div>
                </div>
                <div className="text-base font-semibold">{fmtDate(project.createdAt)}</div>
                {project.updatedAt && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {t("verify:lastUpdated")}: {fmtDate(project.updatedAt)}
                  </div>
                )}
              </div>
            </div>

            {/* NEW: Trust signals — auto-checks that pass */}
            {project.autoChecksSummary && project.autoChecksSummary.total > 0 && (
              <div className="border border-border rounded-lg p-5 bg-card mb-6">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("verify:trustSignalsTitle", { methodology: project.autoChecksSummary.methodologyShortName })}
                    </div>
                  </div>
                  <div className="text-xs font-mono">
                    <span className={project.autoChecksSummary.passed === project.autoChecksSummary.total ? "text-green-600 font-bold" : "text-foreground"}>
                      {project.autoChecksSummary.passed}
                    </span>
                    <span className="text-muted-foreground"> / {project.autoChecksSummary.total} {t("verify:autoChecksPassing")}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {project.autoChecksSummary.checks.map((check) => (
                    <div key={check.id} className="flex items-start gap-2 text-sm">
                      {check.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium">
                          {t(`methodologies:${methId}.checks.${check.id}.label`, { defaultValue: check.id })}
                          {check.critical && (
                            <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 font-bold uppercase tracking-wider">
                              {t("verify:criticalTag")}
                            </span>
                          )}
                        </div>
                        {check.detail && (
                          <div className="text-[10px] font-mono text-muted-foreground">{check.detail}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed border-t border-border pt-3">
                  {t("verify:trustSignalsDisclaimer")}
                </p>
              </div>
            )}

            {/* Pyrolysis snapshot — only in "full" visibility */}
            {project.visibility === "full" && (project.temperature || project.residenceTime || project.plantCapacityTph) && (
              <div className="border border-border rounded-lg p-5 bg-card mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Beaker className="w-4 h-4 text-muted-foreground" />
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("verify:processSnapshot")}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {project.temperature && (
                    <div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Flame className="w-3 h-3" /> {t("verify:temperature")}
                      </div>
                      <div className="text-base font-semibold mt-0.5">{project.temperature}°C</div>
                    </div>
                  )}
                  {project.residenceTime && (
                    <div>
                      <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {t("verify:residenceTime")}
                      </div>
                      <div className="text-base font-semibold mt-0.5">{project.residenceTime} min</div>
                    </div>
                  )}
                  {project.plantCapacityTph && (
                    <div>
                      <div className="text-xs text-muted-foreground">{t("verify:capacity")}</div>
                      <div className="text-base font-semibold mt-0.5">{project.plantCapacityTph} t/h</div>
                    </div>
                  )}
                  {project.qualityGoal && (
                    <div>
                      <div className="text-xs text-muted-foreground">{t("verify:goal")}</div>
                      <div className="text-base font-semibold mt-0.5">{project.qualityGoal}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* "What does this mean?" explainer */}
            <div className="border border-border rounded-lg p-5 bg-muted/20 mb-8">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {t("verify:whatThisMeans")}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t("verify:explainer", { bopId: project.bopId })}
              </p>
            </div>

            {/* CTA — for certifiers / partners */}
            <div className="border border-primary/20 bg-primary/5 rounded-lg p-6 text-center">
              <h3 className="text-lg font-bold mb-2">{t("verify:ctaTitle")}</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xl mx-auto">
                {t("verify:ctaBody")}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/app">
                  <Button size="sm">
                    {t("verify:ctaPrimary")} <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
                <Link href="/company/about">
                  <Button variant="outline" size="sm">
                    {t("verify:ctaSecondary")} <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function IdentityRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-sm font-medium break-words">{value}</div>
      </div>
    </div>
  );
}

function AnnualCard({ label, value, unit, highlight = false }: { label: string; value: string; unit: string; highlight?: boolean }) {
  return (
    <div className={highlight ? "bg-primary/10 border border-primary/30 rounded-lg p-3" : "bg-card border border-border rounded-lg p-3"}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className={`text-xl font-mono font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
      <div className="text-[9px] text-muted-foreground mt-0.5">{unit}</div>
    </div>
  );
}
