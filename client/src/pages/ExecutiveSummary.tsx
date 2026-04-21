/**
 * Executive Summary — `/projects/:id/summary`
 *
 * Print-optimized 2-page board-ready summary of a project. Designed for CFO /
 * investor / partner audiences who want a one-pager (or two), not the full
 * operational dashboard.
 *
 * Layout:
 *   Page 1 — Identity + key metrics (BOP ID, name, location, methodology, score, KPIs)
 *   Page 2 — Process snapshot, multi-methodology comparison, verify URL, disclaimer
 *
 * Auto-triggers `window.print()` on mount when `?autoprint=1` is set, so the
 * "Export Executive Summary" button on ProjectDetail can deep-link straight
 * to the print dialog.
 */

import { useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "wouter";
import { useTranslation } from "react-i18next";
import { useReactToPrint } from "react-to-print";
import {
  ArrowLeft, Printer, Loader2, MapPin, Beaker, Flame, Clock,
  Target, Award, ShieldCheck, Trophy, AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import {
  compute_all, FEEDSTOCK_DB, type Feedstock,
} from "@/lib/biocharModel";
import { getFeedstockName } from "@/lib/feedstockI18n";
import {
  ACTIVE_METHODOLOGIES, METHODOLOGIES, type MethodologyId,
} from "@/lib/methodologies";
import { calculateScore } from "@/lib/biocharScore";
import PageLoader from "@/components/PageLoader";

type QualityGoal = "MAX_CARBON" | "AGRONOMY" | "BALANCED";

export default function ExecutiveSummary() {
  const { t } = useTranslation(["projectDetail", "feedstocks", "methodologies"]);
  const { t: tFs } = useTranslation("feedstocks");
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();

  const projectQuery = trpc.projects.get.useQuery(
    { id: projectId },
    { enabled: !!user && hasAccess("analyst") && !Number.isNaN(projectId) }
  );
  const project = projectQuery.data;

  const feedstock: Feedstock = useMemo(() => {
    if (!project) return FEEDSTOCK_DB["pine_sawdust"];
    if (project.feedstockData) {
      try { return JSON.parse(project.feedstockData) as Feedstock; } catch {}
    }
    if (project.feedstockId && FEEDSTOCK_DB[project.feedstockId]) {
      return FEEDSTOCK_DB[project.feedstockId];
    }
    return FEEDSTOCK_DB["pine_sawdust"];
  }, [project]);

  const T = project?.temperature ?? 650;
  const resTime = project?.residenceTime ?? 30;
  const goal: QualityGoal = (project?.qualityGoal as QualityGoal) ?? "BALANCED";

  const result = useMemo(
    () => compute_all(T, resTime, feedstock),
    [T, resTime, feedstock]
  );

  // Compute scores against ALL active methodologies (no manual states — auto checks only)
  const scoredMethodologies = useMemo(() => {
    return ACTIVE_METHODOLOGIES.map((id) => {
      const m = METHODOLOGIES[id];
      const score = calculateScore(m, {
        result,
        feedstock,
        temperature: T,
        residenceTime: resTime,
        plantCapacityTph: project?.plantCapacityTph ?? null,
        country: project?.country ?? null,
        manualStates: {},
      });
      return { methodology: m, score };
    });
  }, [result, feedstock, T, resTime, project]);

  const recommended = useMemo(
    () => [...scoredMethodologies].sort((a, b) => b.score.value - a.score.value)[0],
    [scoredMethodologies]
  );

  // Print plumbing
  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: project ? `BiocharPro_ExecutiveSummary_${project.bopId ?? `proj-${project.id}`}` : "BiocharPro_ExecutiveSummary",
  });

  // Auto-trigger print when ?autoprint=1
  useEffect(() => {
    if (!project) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("autoprint") === "1") {
      // Slight delay to let layout settle
      setTimeout(() => handlePrint?.(), 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  // Annual CO2 estimate.
  // NOTE: `result.credits.net` is t CO2e per tonne of BIOCHAR (not feedstock).
  // Correct formula: annualBiochar × credits.net = (feedstock × yield/100) × credits.net.
  const annualHours = 8000;
  const annualCO2 = useMemo(() => {
    if (!project?.plantCapacityTph) return null;
    const annualFeedstock = project.plantCapacityTph * annualHours;
    const annualBiochar = annualFeedstock * (result.yield_ / 100);
    return annualBiochar * result.credits.net;
  }, [project, result]);
  const netCO2PerTFeedstock = result.credits.net * (result.yield_ / 100);

  if (authLoading || tierLoading) return <PageLoader />;
  if (!user || !hasAccess("analyst")) {
    if (typeof window !== "undefined") window.location.href = "/projects";
    return null;
  }
  if (projectQuery.isLoading) return <PageLoader label={t("loadingProject")} />;
  if (!project) return <PageLoader label={t("notFound")} />;

  const verifyUrl = project.bopId
    ? `https://biocharpro.io/verify/${project.bopId}`
    : null;

  const fmtNumber = (n: number, decimals = 1) =>
    n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* SCREEN-ONLY toolbar — hidden on print */}
      <div className="print:hidden border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={`/projects/${project.id}`}>
            <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> {t("backToProject", { defaultValue: "Back to project" })}
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              {t("summary.toolbarHint", { defaultValue: "Use your browser's PDF export to save this summary." })}
            </span>
            <button
              onClick={() => handlePrint?.()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              {t("summary.printButton", { defaultValue: "Print / Save as PDF" })}
            </button>
          </div>
        </div>
      </div>

      {/* PRINTABLE CONTENT — also visible on screen so user can preview */}
      <div ref={contentRef} className="max-w-5xl mx-auto px-6 py-8 print:p-10 print:max-w-none print:bg-white print:text-black">
        {/* ─── PAGE 1 ─────────────────────────────────────────────────────── */}
        <div className="print:break-after-page">
          {/* Brand bar */}
          <div className="flex items-start justify-between border-b-2 border-primary pb-4 mb-6 print:border-black">
            <div>
              <div className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] print:text-black">
                {t("summary.brandPrefix", { defaultValue: "Biochar Optimizer Pro" })}
              </div>
              <h1 className="text-3xl font-bold mt-1 leading-tight">
                {t("summary.title", { defaultValue: "Project Executive Summary" })}
              </h1>
            </div>
            <div className="text-right text-xs text-muted-foreground print:text-black">
              <div className="font-mono font-bold text-base text-primary print:text-black">{project.bopId ?? "—"}</div>
              <div className="text-[10px] mt-0.5">
                {t("summary.generatedOn", { defaultValue: "Generated" })}: {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Project identity */}
          <section className="mb-6">
            <h2 className="text-2xl font-bold mb-2">{project.name}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground print:text-black">
              {(project.location || project.country) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {project.location || project.country}
                </span>
              )}
              {project.plantCapacityTph && (
                <span className="inline-flex items-center gap-1.5">
                  <Beaker className="w-3.5 h-3.5" />
                  {project.plantCapacityTph} t/h {t("summary.capacity", { defaultValue: "capacity" })}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                {getFeedstockName(project.feedstockId, feedstock.name, tFs)}
              </span>
            </div>
            {project.description && (
              <p className="mt-3 text-sm leading-relaxed">{project.description}</p>
            )}
          </section>

          {/* Hero: Recommended methodology + score */}
          {recommended && (
            <section className="border-2 border-primary rounded-lg p-5 mb-6 print:border-black print:rounded-none">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-black mb-1 flex items-center gap-1.5">
                    <Trophy className="w-3 h-3" />
                    {t("summary.recommendedMethodology", { defaultValue: "Recommended target methodology" })}
                  </div>
                  <div className="text-2xl font-bold">{recommended.methodology.shortName}</div>
                  <p className="text-xs text-muted-foreground print:text-black mt-1 max-w-md">
                    {recommended.methodology.tagline}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-black mb-1">
                    BiocharPro Score
                  </div>
                  <div className="text-5xl font-mono font-bold leading-none">{recommended.score.value}</div>
                  <div className="text-xs text-muted-foreground print:text-black">/ 100</div>
                  {recommended.score.criticalFailure && (
                    <div className="text-[10px] text-red-600 font-semibold mt-1 inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {t("summary.criticalCheck", { defaultValue: "Critical check pending" })}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* KPIs grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KPICard label={t("summary.kpi.yield", { defaultValue: "Biochar yield" })} value={`${fmtNumber(result.yield_)}%`} unit={t("summary.kpi.yieldUnit", { defaultValue: "of feedstock dry mass" })} />
            <KPICard label={t("summary.kpi.carbonContent", { defaultValue: "Fixed carbon" })} value={`${fmtNumber(result.C)}%`} unit={t("summary.kpi.carbonUnit", { defaultValue: "of biochar mass" })} />
            <KPICard label={t("summary.kpi.netRemoval", { defaultValue: "Net CO₂ removal" })} value={fmtNumber(netCO2PerTFeedstock, 2)} unit={t("summary.kpi.tCO2eUnit", { defaultValue: "t CO₂e per t feedstock" })} />
            <KPICard label="H:Corg" value={fmtNumber(result.H_Corg, 3)} unit={t("summary.kpi.stabilityUnit", { defaultValue: "stability indicator" })} />
          </section>

          {/* Annual estimate */}
          {annualCO2 !== null && project.plantCapacityTph && (
            <section className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 print:border-black print:bg-white print:rounded-none">
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary print:text-black mb-1">
                {t("summary.annualEstimate.title", { defaultValue: "Annual estimate" })}
              </div>
              <div className="grid grid-cols-2 gap-6 mt-2">
                <div>
                  <div className="text-2xl font-bold">{fmtNumber(annualCO2, 0)} t CO₂e</div>
                  <div className="text-xs text-muted-foreground print:text-black">{t("summary.annualEstimate.removalsPerYear", { defaultValue: "Estimated removals per year" })}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{fmtNumber(project.plantCapacityTph * annualHours, 0)} t</div>
                  <div className="text-xs text-muted-foreground print:text-black">{t("summary.annualEstimate.feedstockProcessed", { defaultValue: "Feedstock processed per year" })}</div>
                </div>
              </div>
              <div className="text-[9px] text-muted-foreground print:text-black mt-3">
                {t("summary.annualEstimate.assumption", { defaultValue: "Assumes {{hours}} operating hours/year. Net CO₂e includes pyrolysis + transport + soil-incorporation factors per the simulation model." }).replace("{{hours}}", annualHours.toLocaleString())}
              </div>
            </section>
          )}

          {/* Footer page 1 */}
          <div className="mt-auto pt-4 border-t border-border text-[9px] text-muted-foreground print:border-black print:text-black flex justify-between">
            <span>biocharpro.io · {project.bopId ?? "—"}</span>
            <span>{t("summary.page", { defaultValue: "Page 1 of 2" })}</span>
          </div>
        </div>

        {/* ─── PAGE 2 ─────────────────────────────────────────────────────── */}
        <div className="pt-8">
          {/* Process snapshot */}
          <section className="mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary print:text-black mb-3 flex items-center gap-2">
              <Beaker className="w-4 h-4" /> {t("summary.processSnapshot", { defaultValue: "Process snapshot" })}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <ProcessRow icon={Flame} label={t("summary.process.temperature", { defaultValue: "Pyrolysis T" })} value={`${T} °C`} />
              <ProcessRow icon={Clock}  label={t("summary.process.residenceTime", { defaultValue: "Residence time" })} value={`${resTime} min`} />
              <ProcessRow icon={Target} label={t("summary.process.qualityGoal", { defaultValue: "Quality goal" })} value={goal} />
            </div>
          </section>

          {/* Multi-methodology comparison table */}
          <section className="mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary print:text-black mb-3 flex items-center gap-2">
              <Award className="w-4 h-4" /> {t("summary.methodologyComparison", { defaultValue: "Cross-methodology readiness" })}
            </h3>
            <div className="overflow-hidden border border-border rounded-lg print:border-black print:rounded-none">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 print:bg-white">
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground print:text-black">
                    <th className="text-left px-3 py-2">{t("summary.tableMethodology", { defaultValue: "Methodology" })}</th>
                    <th className="text-left px-3 py-2">{t("summary.tableType", { defaultValue: "Type" })}</th>
                    <th className="text-right px-3 py-2">{t("summary.tableScore", { defaultValue: "Score" })}</th>
                    <th className="text-right px-3 py-2">{t("summary.tableAuto", { defaultValue: "Auto checks" })}</th>
                    <th className="text-right px-3 py-2">{t("summary.tableStatus", { defaultValue: "Status" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {scoredMethodologies.map(({ methodology, score }) => {
                    const isReco = recommended?.methodology.id === methodology.id;
                    const autoChecks = score.results.filter((r) => r.check.type === "auto");
                    const autoPassed = autoChecks.filter((r) => r.status === "pass").length;
                    return (
                      <tr key={methodology.id} className="border-t border-border print:border-black">
                        <td className="px-3 py-2 font-semibold">
                          {methodology.shortName}
                          {isReco && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold print:bg-white print:text-black print:border print:border-black">
                              <Trophy className="w-2.5 h-2.5" /> {t("summary.bestFitTag", { defaultValue: "Best fit" })}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground print:text-black">
                          {methodology.credits ? t("summary.creditIssuing", { defaultValue: "Credit-issuing" }) : t("summary.qualityOnly", { defaultValue: "Quality" })}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold">
                          {score.value}<span className="text-xs text-muted-foreground print:text-black">/100</span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs">
                          {autoPassed}/{autoChecks.length}
                        </td>
                        <td className="px-3 py-2 text-right text-xs">
                          {score.tier === "ready" ? (
                            <span className="text-green-600 font-semibold">{t("summary.tierReady", { defaultValue: "Ready" })}</span>
                          ) : score.tier === "close" ? (
                            <span className="text-yellow-600 font-semibold">{t("summary.tierClose", { defaultValue: "Close" })}</span>
                          ) : (
                            <span className="text-red-600 font-semibold">{t("summary.tierNotReady", { defaultValue: "Not ready" })}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Verify URL */}
          {verifyUrl && (
            <section className="border border-border rounded-lg p-4 mb-6 print:border-black print:rounded-none">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary print:text-black flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-black mb-1">
                    {t("summary.verifyTitle", { defaultValue: "Verify this project" })}
                  </div>
                  <div className="font-mono text-sm font-semibold break-all">{verifyUrl}</div>
                  <p className="text-xs text-muted-foreground print:text-black mt-1.5 leading-relaxed">
                    {t("summary.verifyHint", { defaultValue: "Anyone with this link can confirm the project is registered on Biochar Optimizer Pro. The owner controls what's shown — lab data and exact coordinates are never exposed." })}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Disclaimer */}
          <section className="text-[9px] text-muted-foreground print:text-black leading-relaxed mb-6">
            <strong>{t("summary.disclaimer.title", { defaultValue: "About these numbers" })}: </strong>
            {t("summary.disclaimer.body", {
              defaultValue: "Yields, carbon content, BET surface area, and CO₂e estimates come from an empirical pyrolysis model calibrated against peer-reviewed literature (CINDECA/CONICET 2018-2024 and others). Predictions carry ±5–8% uncertainty for feedstocks within the calibration range. Auto-check scores reflect simulation outputs only; certification readiness also requires lab analysis and methodology-specific manual confirmations not shown in this summary.",
            })}
          </section>

          {/* Footer page 2 */}
          <div className="mt-8 pt-4 border-t border-border text-[9px] text-muted-foreground print:border-black print:text-black flex justify-between">
            <span>{t("summary.brandedFooter", { defaultValue: "Generated with Biochar Optimizer Pro · biocharpro.io" })}</span>
            <span>{t("summary.page2", { defaultValue: "Page 2 of 2" })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KPICard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-card print:border-black print:bg-white print:rounded-none">
      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground print:text-black mb-1">{label}</div>
      <div className="text-xl font-mono font-bold">{value}</div>
      <div className="text-[9px] text-muted-foreground print:text-black mt-0.5">{unit}</div>
    </div>
  );
}

function ProcessRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-card print:border-black print:bg-white print:rounded-none flex items-center gap-3">
      <Icon className="w-4 h-4 text-primary print:text-black flex-shrink-0" />
      <div>
        <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground print:text-black">{label}</div>
        <div className="text-base font-mono font-bold">{value}</div>
      </div>
    </div>
  );
}
