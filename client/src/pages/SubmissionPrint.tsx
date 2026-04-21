/**
 * Submission package — printable PDF view.
 *
 * Route: `/projects/:id/submission/:methodologyId`
 *
 * Renders the structured submission payload (same data as the JSON export)
 * as a print-optimized multi-page PDF. Opened from the "Export ▾" dropdown
 * in ProjectDetail with `?autoprint=1` — browser print dialog fires on mount
 * so the user can save as PDF or hit Print.
 *
 * Unlike the Executive Summary (board-ready, 2 pages, marketing-oriented),
 * this is the TECHNICAL auditor-ready variant: every field the certifier
 * needs, no KPI fluff, structured compliance evidence.
 */

import { useEffect, useRef } from "react";
import { Link, useParams } from "wouter";
import { useTranslation } from "react-i18next";
import { useReactToPrint } from "react-to-print";
import {
  ArrowLeft, Printer, ShieldCheck, CheckCircle2, XCircle,
  AlertCircle, FileCheck,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import PageLoader from "@/components/PageLoader";

type MethodologyId = "puro-earth" | "isometric" | "ebc" | "ibi";

export default function SubmissionPrint() {
  const { t, i18n } = useTranslation(["projectDetail", "common", "methodologies"]);
  const params = useParams<{ id: string; methodologyId: string }>();
  const projectId = Number(params.id);
  const methodologyId = (params.methodologyId ?? "puro-earth") as MethodologyId;
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();

  const query = trpc.projects.exportSubmission.useQuery(
    { id: projectId, methodologyId },
    {
      enabled: !!user && hasAccess("developer") && !Number.isNaN(projectId),
      staleTime: 60_000,
      retry: false,
    }
  );

  const payload = query.data;

  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: payload
      ? `${payload.bop_id ?? `project-${projectId}`}__${methodologyId}__submission`
      : "submission",
  });

  // Auto-print on ?autoprint=1
  useEffect(() => {
    if (!payload) return;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("autoprint") === "1") {
      setTimeout(() => handlePrint?.(), 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  if (authLoading || tierLoading) return <PageLoader />;
  if (!user || !hasAccess("developer")) {
    if (typeof window !== "undefined") window.location.href = "/pricing";
    return null;
  }
  if (query.isLoading) return <PageLoader label={t("export.generating", { defaultValue: "Generating submission package..." })} />;
  if (query.isError || !payload) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">{query.error?.message ?? "Submission not available."}</p>
          <Link href={`/projects/${projectId}`}>
            <button className="text-xs text-primary hover:underline">← Back to project</button>
          </Link>
        </div>
      </div>
    );
  }

  const fmtNumber = (n: number | null | undefined, decimals = 1): string => {
    if (n === null || n === undefined) return "—";
    return n.toLocaleString(i18n.language === "es" ? "es-AR" : "en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const fmtDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString(i18n.language === "es" ? "es-AR" : "en-US", {
        year: "numeric", month: "long", day: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* SCREEN-ONLY toolbar */}
      <div className="print:hidden border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href={`/projects/${projectId}`}>
            <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> {t("export.backToProject", { defaultValue: "Back to project" })}
            </button>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              {t("export.printHint", { defaultValue: "Use your browser to save as PDF." })}
            </span>
            <button
              onClick={() => handlePrint?.()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              {t("export.printSave", { defaultValue: "Print / Save as PDF" })}
            </button>
          </div>
        </div>
      </div>

      {/* PRINTABLE CONTENT */}
      <div
        ref={contentRef}
        className="max-w-5xl mx-auto px-6 py-8 print:p-10 print:max-w-none print:bg-white print:text-black"
      >
        {/* ─── PAGE 1 — Cover + identity + feedstock + pyrolysis ───────── */}
        <div className="print:break-after-page">
          {/* Brand bar */}
          <div className="flex items-start justify-between border-b-2 border-primary pb-4 mb-6 print:border-black">
            <div>
              <div className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] print:text-black">
                Biochar Optimizer Pro
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mt-1 leading-tight">
                {t("export.coverTitle", { defaultValue: "Submission Package" })}
              </h1>
              <div className="text-sm text-muted-foreground print:text-black mt-1">
                {payload.methodology.name}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground print:text-black">
              <div className="font-mono font-bold text-base text-primary print:text-black">{payload.bop_id ?? "—"}</div>
              <div className="text-[10px] mt-0.5">{fmtDate(payload.generated_at)}</div>
            </div>
          </div>

          {/* Project identity */}
          <Section title={t("export.projectIdentity", { defaultValue: "Project identity" })}>
            <h2 className="text-xl font-bold mb-2">{payload.project.name}</h2>
            {payload.project.description && (
              <p className="text-sm leading-relaxed text-muted-foreground print:text-black mb-3">
                {payload.project.description}
              </p>
            )}
            <KVGrid rows={[
              [t("export.location", { defaultValue: "Location" }), payload.project.location ?? payload.project.country ?? "—"],
              [t("export.country", { defaultValue: "Country" }), payload.project.country ?? "—"],
              [t("export.status", { defaultValue: "Status" }), payload.project.status.toUpperCase()],
              [t("export.createdAt", { defaultValue: "Created" }), fmtDate(payload.project.created_at)],
              [t("export.updatedAt", { defaultValue: "Last updated" }), fmtDate(payload.project.updated_at)],
            ]} />
          </Section>

          {/* Methodology target */}
          <Section title={t("export.targetMethodology", { defaultValue: "Target methodology" })}>
            <KVGrid rows={[
              [t("export.methodologyName", { defaultValue: "Name" }), payload.methodology.name],
              [t("export.marketPriceRef", { defaultValue: "Market price (ref.)" }), payload.methodology.reference_market_price_usd ?? "—"],
              [t("export.durability", { defaultValue: "Durability claim" }), payload.methodology.durability_claim ?? "—"],
            ]} />
          </Section>

          {/* Feedstock */}
          <Section title={t("export.feedstockSection", { defaultValue: "Feedstock" })}>
            <KVGrid rows={[
              [t("export.feedstockName", { defaultValue: "Name" }), payload.feedstock.name],
              [t("export.feedstockId", { defaultValue: "ID" }), payload.feedstock.id ?? "—"],
              [t("export.feedstockCategory", { defaultValue: "Category" }), payload.feedstock.category ?? "—"],
            ]} />
            <div className="mt-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-black mb-1">
                {t("export.elementalComposition", { defaultValue: "Elemental composition (%)" })}
              </div>
              <div className="grid grid-cols-5 gap-2 text-sm">
                {(["C", "H", "N", "S", "O"] as const).map((el) => {
                  const keys: Record<typeof el, keyof typeof payload.feedstock.elemental_composition> = {
                    C: "C_pct", H: "H_pct", N: "N_pct", S: "S_pct", O: "O_pct",
                  };
                  const val = payload.feedstock.elemental_composition[keys[el]];
                  return (
                    <div key={el} className="border border-border print:border-black rounded p-2 print:rounded-none">
                      <div className="text-[9px] text-muted-foreground print:text-black">{el}</div>
                      <div className="font-mono font-bold">{val !== null ? fmtNumber(val, 1) : "—"}</div>
                    </div>
                  );
                })}
              </div>
              {payload.feedstock.ash_pct !== null || payload.feedstock.moisture_pct !== null ? (
                <div className="mt-2 text-xs text-muted-foreground print:text-black">
                  {payload.feedstock.ash_pct !== null && <>Ash: <b>{fmtNumber(payload.feedstock.ash_pct, 1)}%</b> · </>}
                  {payload.feedstock.moisture_pct !== null && <>Moisture: <b>{fmtNumber(payload.feedstock.moisture_pct, 1)}%</b></>}
                </div>
              ) : null}
            </div>
          </Section>

          {/* Pyrolysis parameters */}
          <Section title={t("export.pyrolysisParams", { defaultValue: "Pyrolysis parameters" })}>
            <KVGrid rows={[
              [t("export.plantCapacity", { defaultValue: "Plant capacity" }), payload.pyrolysis.plant_capacity_tph ? `${payload.pyrolysis.plant_capacity_tph} t/h` : "—"],
              [t("export.annualHours", { defaultValue: "Annual operating hours" }), `${payload.pyrolysis.annual_operating_hours} h`],
              [t("export.temperature", { defaultValue: "Temperature" }), payload.pyrolysis.temperature_c ? `${payload.pyrolysis.temperature_c} °C` : "—"],
              [t("export.residenceTime", { defaultValue: "Residence time" }), payload.pyrolysis.residence_time_min ? `${payload.pyrolysis.residence_time_min} min` : "—"],
              [t("export.qualityGoal", { defaultValue: "Quality goal" }), payload.pyrolysis.quality_goal ?? "—"],
            ]} />
          </Section>

          <PageFooter page={1} total={2} bopId={payload.bop_id} />
        </div>

        {/* ─── PAGE 2 — Characteristics + compliance + disclaimer ──────── */}
        <div className="pt-8">
          {/* Biochar characteristics */}
          <Section title={t("export.biocharChars", { defaultValue: "Biochar characteristics (model output)" })}>
            <KVGrid rows={[
              [t("export.yield", { defaultValue: "Yield" }), `${fmtNumber(payload.biochar_characteristics.yield_pct, 2)}%`],
              [t("export.carbonPct", { defaultValue: "Carbon (%)" }), `${fmtNumber(payload.biochar_characteristics.carbon_pct, 2)}%`],
              [t("export.hydrogenPct", { defaultValue: "Hydrogen (%)" }), `${fmtNumber(payload.biochar_characteristics.hydrogen_pct, 3)}%`],
              [t("export.hCorg", { defaultValue: "H:Corg molar ratio" }), fmtNumber(payload.biochar_characteristics.h_corg_molar_ratio, 4)],
              [t("export.oCorg", { defaultValue: "O:Corg molar ratio" }), fmtNumber(payload.biochar_characteristics.o_corg_molar_ratio, 4)],
              [t("export.bet", { defaultValue: "BET surface (m²/g)" }), fmtNumber(payload.biochar_characteristics.bet_surface_area_m2_g, 0)],
              [t("export.ph", { defaultValue: "pH" }), fmtNumber(payload.biochar_characteristics.ph, 2)],
            ]} />
          </Section>

          {/* Annual estimates */}
          {payload.annual_estimates.net_co2_removals_t !== null && (
            <Section title={t("export.annualEstimates", { defaultValue: "Annual estimates (design capacity)" })}>
              <KVGrid rows={[
                [t("export.feedstockProcessed", { defaultValue: "Feedstock processed" }), `${fmtNumber((payload.annual_estimates.feedstock_processed_t ?? 0) / 1000, 1)} kt/year`],
                [t("export.biocharOutput", { defaultValue: "Biochar output" }), `${fmtNumber((payload.annual_estimates.biochar_output_t ?? 0) / 1000, 1)} kt/year`],
                [t("export.netCO2Annual", { defaultValue: "Net CO₂ removals" }), `${fmtNumber((payload.annual_estimates.net_co2_removals_t ?? 0) / 1000, 1)} kt CO₂e/year`],
                [t("export.corcRevenue", { defaultValue: "CORC revenue (ref. USD 150/tCO₂e)" }), `USD ${fmtNumber((payload.annual_estimates.corc_revenue_potential_usd ?? 0) / 1000, 0)}k/year`],
              ]} />
            </Section>
          )}

          {/* CORC breakdown */}
          <Section title={t("export.corcBreakdown", { defaultValue: "CORC breakdown (per tonne of biochar)" })}>
            <KVGrid rows={[
              [t("export.durabilityClass", { defaultValue: "Durability class" }), payload.corc_breakdown_per_t_biochar.durability_class],
              [t("export.stabilityFactor", { defaultValue: "Stability factor" }), fmtNumber(payload.corc_breakdown_per_t_biochar.stability_factor, 3)],
              [t("export.corcGross", { defaultValue: "Gross removal" }), `${fmtNumber(payload.corc_breakdown_per_t_biochar.gross, 4)} t CO₂e / t biochar`],
              [t("export.corcNet", { defaultValue: "Net removal" }), `${fmtNumber(payload.corc_breakdown_per_t_biochar.net, 4)} t CO₂e / t biochar`],
            ]} />
          </Section>

          {/* Auto-checks */}
          <Section title={t("export.autoChecks", { defaultValue: "Auto-verifiable compliance checks" })}>
            <div className="mb-3 text-xs text-muted-foreground print:text-black">
              <span className="font-mono font-bold">{payload.methodology_compliance.auto_passed_count}</span>
              {" / "}
              <span className="font-mono">{payload.methodology_compliance.auto_total_count}</span>
              {" "}
              {t("export.checksPassing", { defaultValue: "automated checks passing" })}
            </div>
            <div className="space-y-1.5">
              {payload.methodology_compliance.auto_checks.map((check) => (
                <div key={check.id} className="flex items-start gap-2 text-sm border-b border-border print:border-black last:border-b-0 pb-1.5">
                  {check.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5 print:text-black" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5 print:text-black" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">
                      {t(check.label_key, { defaultValue: check.id })}
                      {check.critical && (
                        <span className="ml-2 text-[9px] px-1 py-0.5 rounded border border-red-500 text-red-600 dark:text-red-400 font-bold uppercase tracking-wider print:border-black print:text-black">
                          {t("export.critical", { defaultValue: "CRITICAL" })}
                        </span>
                      )}
                    </div>
                    {check.detail && (
                      <div className="text-[10px] font-mono text-muted-foreground print:text-black">{check.detail}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Manual checks pending */}
          {payload.methodology_compliance.manual_checks_pending.length > 0 && (
            <Section title={t("export.manualChecks", { defaultValue: "Manual confirmations required (not in this package)" })}>
              <div className="text-xs text-muted-foreground print:text-black mb-2">
                {t("export.manualChecksHint", { defaultValue: "The following items require lab testing and/or external documentation. They must be provided separately during the official certifier review." })}
              </div>
              <div className="space-y-1">
                {payload.methodology_compliance.manual_checks_pending.map((check) => (
                  <div key={check.id} className="flex items-start gap-2 text-xs">
                    <FileCheck className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5 print:text-black" />
                    <div>
                      <span className="font-medium">{t(check.label_key, { defaultValue: check.id })}</span>
                      {check.critical && (
                        <span className="ml-2 text-[9px] px-1 py-0.5 rounded border border-red-500 text-red-600 dark:text-red-400 font-bold uppercase tracking-wider print:border-black print:text-black">
                          {t("export.critical", { defaultValue: "CRITICAL" })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Methodology-specific */}
          {payload.methodology_specific && Object.keys(payload.methodology_specific).length > 0 && (
            <Section title={t("export.methodologySpecific", { defaultValue: "Methodology-specific fields" })}>
              <div className="text-xs font-mono space-y-0.5">
                {Object.entries(payload.methodology_specific).map(([key, value]) => (
                  <div key={key} className="flex gap-3 border-b border-border print:border-black py-1 last:border-b-0">
                    <div className="text-muted-foreground print:text-black">{key}</div>
                    <div className="ml-auto font-semibold">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Verify URL */}
          {payload.verification_url && (
            <div className="border-2 border-primary rounded-lg p-4 mb-5 print:border-black print:rounded-none">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5 print:text-black" />
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-black">
                    {t("export.verifyTitle", { defaultValue: "Verify this project" })}
                  </div>
                  <div className="font-mono text-sm font-semibold break-all mt-0.5">{payload.verification_url}</div>
                  <p className="text-[10px] text-muted-foreground print:text-black mt-1.5 leading-relaxed">
                    {t("export.verifyHint", { defaultValue: "Scan or visit this URL to confirm the project is registered on Biochar Optimizer Pro." })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submission guidance */}
          <div className="bg-muted/30 border border-border rounded-lg p-4 mb-5 print:bg-white print:border-black print:rounded-none">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-black mb-1">
              {t("export.guidance", { defaultValue: "Submission guidance" })}
            </div>
            <p className="text-xs leading-relaxed">{payload.submission_guidance}</p>
          </div>

          {/* Disclaimer */}
          <div className="text-[9px] text-muted-foreground print:text-black leading-relaxed mb-6 italic">
            {payload.disclaimer}
          </div>

          <PageFooter page={2} total={2} bopId={payload.bop_id} />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-primary print:text-black mb-2 pb-1 border-b border-border print:border-black">
        {title}
      </h3>
      {children}
    </section>
  );
}

function KVGrid({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex justify-between gap-4 border-b border-border/50 print:border-black/30 py-1">
          <div className="text-muted-foreground print:text-black">{k}</div>
          <div className="font-mono font-semibold text-right break-all">{v}</div>
        </div>
      ))}
    </div>
  );
}

function PageFooter({ page, total, bopId }: { page: number; total: number; bopId: string | null }) {
  return (
    <div className="mt-6 pt-3 border-t border-border print:border-black text-[9px] text-muted-foreground print:text-black flex justify-between">
      <span>biocharpro.io · {bopId ?? "—"}</span>
      <span>Page {page} of {total}</span>
    </div>
  );
}
