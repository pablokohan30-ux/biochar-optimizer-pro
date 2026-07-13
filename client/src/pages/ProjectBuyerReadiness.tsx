/**
 * Buyer Readiness Checker — Stage 4 module 1.
 *
 * Route: /projects/:id/buyer-readiness (Expert tier only).
 *
 * Evaluates a project against each major corporate CDR buyer's criteria
 * (Microsoft, Frontier, Shell, Altitude) using AI + the actual operational
 * + offtake + community data logged in Stage 3. Returns a % readiness score
 * plus a prioritized gap list with specific actions.
 *
 * This is the module that tells the operator "you're 87% ready for Microsoft,
 * you need X and Y before you can sign."
 */

import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Clock, Zap, Loader2,
  Target, ExternalLink, Lock, ArrowRight, ClipboardCheck, Truck, Users,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import GuideLink from "@/components/GuideLink";
import PageLoader from "@/components/PageLoader";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { trpc } from "@/lib/trpc";

type BuyerId = "microsoft" | "frontier" | "shell" | "altitude";

const BUYER_COLORS: Record<BuyerId, { bg: string; text: string; border: string; gradient: string }> = {
  microsoft: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", gradient: "from-blue-500 to-indigo-600" },
  frontier: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", gradient: "from-purple-500 to-pink-600" },
  shell: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", gradient: "from-yellow-500 to-orange-600" },
  altitude: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", gradient: "from-teal-500 to-emerald-600" },
};

export default function ProjectBuyerReadiness() {
  const { t, i18n } = useTranslation("common");
  const tbr = (k: string, fb: string, vars?: Record<string, any>) => t(`buyerReadiness.${k}`, { defaultValue: fb, ...vars });
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, navigate] = useLocation();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();
  const hasExpert = hasAccess("expert");

  const [activeBuyer, setActiveBuyer] = useState<BuyerId | null>(null);
  const [reports, setReports] = useState<Record<BuyerId, any>>({} as any);
  const [loadingBuyer, setLoadingBuyer] = useState<BuyerId | null>(null);
  const [errorForBuyer, setErrorForBuyer] = useState<Partial<Record<BuyerId, string>>>({});
  const buyerDescriptions: Record<BuyerId, string> = {
    microsoft: tbr(
      "buyerDescriptionMicrosoft",
      "Mayor comprador corporativo de CDR. En biochar pide operación real, trazabilidad por lote, validación LCA, permisos y evidencia comunitaria sólida.",
    ),
    frontier: tbr(
      "buyerDescriptionFrontier",
      "Coalición con AMC de USD 1B+. Tolera mejor la etapa precomercial, pero exige adicionalidad financiera, rigor técnico y una ruta clara de escala.",
    ),
    shell: tbr(
      "buyerDescriptionShell",
      "Comprador corporativo con foco fuerte en MRV robusto, permanencia, riesgos de leakage y verificación anual por terceros.",
    ),
    altitude: tbr(
      "buyerDescriptionAltitude",
      "Financiador especializado en carbono. Flexible antes de FID, pero muy exigente con experiencia del desarrollador, biomasa asegurada y modelo financiero.",
    ),
  };
  const evidenceSummaryQuery = trpc.evidence.summary.useQuery(
    { projectId },
    { enabled: isAuthenticated && hasExpert && Number.isFinite(projectId) },
  );
  const offtakeSummaryQuery = trpc.offtake.summary.useQuery(
    { projectId },
    { enabled: isAuthenticated && hasExpert && Number.isFinite(projectId) },
  );
  const communitySummaryQuery = trpc.community.summary.useQuery(
    { projectId },
    { enabled: isAuthenticated && hasExpert && Number.isFinite(projectId) },
  );

  const buyersQuery = trpc.buyerReadiness.buyers.useQuery(undefined, { enabled: isAuthenticated && hasExpert });
  const checkMutation = trpc.buyerReadiness.check.useMutation();

  // Hydrate the last persisted report for the buyer the operator activates.
  // Skips when we already have a fresh (or previously-hydrated) report for
  // that buyer in local state so a fresh `check` never gets clobbered.
  const latestQuery = trpc.buyerReadiness.latest.useQuery(
    { projectId, buyerId: activeBuyer ?? "" },
    {
      enabled:
        isAuthenticated &&
        hasExpert &&
        Number.isFinite(projectId) &&
        !!activeBuyer &&
        !reports[activeBuyer as BuyerId],
    },
  );
  useEffect(() => {
    if (!activeBuyer) return;
    const latest = latestQuery.data;
    if (!latest?.output) return;
    if (reports[activeBuyer]) return;
    setReports((prev) => ({
      ...prev,
      [activeBuyer]: {
        ...(latest.output as Record<string, unknown>),
        _meta: {
          tokenUsage: { prompt: latest.promptTokens, completion: latest.completionTokens },
          dataPoints: latest.metadata ?? {},
          hydratedAtMs: latest.createdAt,
        },
      },
    }));
  }, [latestQuery.data, activeBuyer, reports]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading || tierLoading) return <PageLoader />;
  if (!isAuthenticated) return null;
  if (!Number.isFinite(projectId)) return <AppLayout><div className="p-8">ID de proyecto invalido.</div></AppLayout>;

  if (!hasExpert) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{tbr("expertGateTitle", "Chequeo de preparacion para buyers")}</h1>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
            {tbr("expertGateDesc", "La IA evalua tu proyecto contra criterios de compra de Microsoft, Frontier, Shell y Altitude usando evidencia operativa, trazabilidad de envios y registros comunitarios reales. Devuelve un score y una lista priorizada de brechas.")}
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 inline-block">
            <p className="text-sm text-amber-900 mb-2">{t("portfolio.expertRequired", { defaultValue: "Se requiere plan Expert" })}.</p>
            <button onClick={() => navigate("/pricing")} className="px-4 py-2 bg-amber-900 text-white text-sm rounded-lg">{t("portfolio.seeExpertPlan", { defaultValue: "Ver plan Expert" })}</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const runCheck = (buyerId: BuyerId) => {
    setErrorForBuyer({ ...errorForBuyer, [buyerId]: undefined });
    setLoadingBuyer(buyerId);
    checkMutation.mutate(
      { projectId, buyerId, lang: i18n.language },
      {
        onSuccess: (data) => {
          setReports({ ...reports, [buyerId]: { ...data.report, _meta: { tokenUsage: data.tokenUsage, dataPoints: data.dataPoints } } });
          setActiveBuyer(buyerId);
          setLoadingBuyer(null);
        },
        onError: (e) => {
          setErrorForBuyer({ ...errorForBuyer, [buyerId]: e.message });
          setLoadingBuyer(null);
        },
      },
    );
  };

  const activeReport = activeBuyer ? reports[activeBuyer] : null;
  const evidenceCount = evidenceSummaryQuery.data?.totals.entries ?? 0;
  const soilPlanCount = evidenceSummaryQuery.data?.byType?.soil_application_plan?.total ?? 0;
  const shipmentCount = offtakeSummaryQuery.data?.totalShipments ?? 0;
  const communityCount = communitySummaryQuery.data?.totals.records ?? 0;
  const canRunReadiness = evidenceCount > 0 || shipmentCount > 0 || communityCount > 0 || soilPlanCount > 0;
  const prepItems = [
    {
      label: tbr("prepEvidence", "Evidencia"),
      value: evidenceCount.toLocaleString(),
      hint: tbr("prepEvidenceHint", "registros operativos"),
      icon: ClipboardCheck,
      accent: "text-blue-700 bg-blue-50 border-blue-200",
    },
    {
      label: tbr("prepShipments", "Envios"),
      value: shipmentCount.toLocaleString(),
      hint: tbr("prepShipmentsHint", "envíos trazables"),
      icon: Truck,
      accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      label: tbr("prepCommunity", "Comunidad"),
      value: communityCount.toLocaleString(),
      hint: tbr("prepCommunityHint", "registros comunitarios"),
      icon: Users,
      accent: "text-violet-700 bg-violet-50 border-violet-200",
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <button onClick={() => navigate(`/projects/${projectId}`)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> {tbr("back", "Volver al proyecto")}
        </button>

        <div>
          <h1 className="text-2xl font-semibold text-foreground">{tbr("title", "Preparacion para buyers")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tbr("subtitle", "Compara la evidencia real de tu proyecto contra los criterios públicos de compra de cada comprador corporativo importante.")}
          </p>
          <GuideLink anchor="como-operativo" label="Cuándo conviene correr este chequeo" className="mt-2 inline-flex" />
        </div>

        <section className={`rounded-xl border p-5 ${canRunReadiness ? "bg-card border-border" : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50"}`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${canRunReadiness ? "bg-indigo-600/10 border-indigo-200 text-indigo-600" : "bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700/60 text-amber-700 dark:text-amber-300"}`}>
              {canRunReadiness ? <Target className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[10px] font-bold uppercase tracking-[0.18em] mb-1 ${canRunReadiness ? "text-muted-foreground" : "text-amber-700 dark:text-amber-300"}`}>
                {tbr("prepEyebrow", "Estado del proyecto")}
              </div>
              <h2 className={`text-base font-semibold ${canRunReadiness ? "text-foreground" : "text-amber-900 dark:text-amber-100"}`}>
                {canRunReadiness
                  ? tbr("prepReadyTitle", "Ya tienes señal suficiente para correr Buyer Readiness")
                  : tbr("prepBlockedTitle", "El chequeo de buyers todavía está temprano para este proyecto")}
              </h2>
              <p className={`text-sm mt-1 ${canRunReadiness ? "text-muted-foreground" : "text-amber-800 dark:text-amber-200"}`}>
                {canRunReadiness
                  ? tbr("prepReadyBody", "El chequeo ya puede apoyarse en algo más que el dossier inicial y te va a devolver gaps más accionables.")
                  : tbr("prepBlockedBody", "Sin operación registrada, el score se vuelve débil y la lista de gaps termina siendo demasiado genérica. Conviene cargar evidencia, offtake o comunidad antes de correrlo.")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            {prepItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={`rounded-lg border px-3 py-3 ${item.accent}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider">{item.label}</div>
                      <div className="text-2xl font-bold leading-none mt-1">{item.value}</div>
                    </div>
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>
                  <div className="text-[11px] mt-2 opacity-80">{item.hint}</div>
                </div>
              );
            })}
          </div>

          {!canRunReadiness && (
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => navigate(`/projects/${projectId}/evidence`)}
                className="px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-background"
              >
                {tbr("goEvidence", "Cargar evidencia")}
              </button>
              <button
                onClick={() => navigate(`/projects/${projectId}/offtake`)}
                className="px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-background"
              >
                {tbr("goOfftake", "Registrar offtake")}
              </button>
              <button
                onClick={() => navigate(`/projects/${projectId}/community`)}
                className="px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-background"
              >
                {tbr("goCommunity", "Registrar comunidad")}
              </button>
            </div>
          )}
        </section>

        {/* Buyer tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {buyersQuery.data?.map((b) => {
            const c = BUYER_COLORS[b.id as BuyerId];
            const report = reports[b.id as BuyerId];
            const isLoading = loadingBuyer === b.id;
            const err = errorForBuyer[b.id as BuyerId];
            return (
              <div key={b.id} className={`border rounded-xl p-5 bg-card ${activeBuyer === b.id ? `ring-2 ring-offset-1 ${c.border.replace("border-", "ring-")}` : "border-border"}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className={`inline-flex items-center gap-2 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${c.bg} ${c.text} border ${c.border} mb-2`}>
                      <Target className="w-3 h-3" /> {tbr("buyerBadge", "Comprador")}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">{b.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">
                      {buyerDescriptions[b.id as BuyerId] ?? b.description}
                    </p>
                  </div>
                  {report && (
                    <div className="text-right shrink-0 ml-3">
                      <div className={`text-3xl font-bold ${report.overallReadinessPct >= 80 ? "text-emerald-600" : report.overallReadinessPct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {report.overallReadinessPct}%
                      </div>
                      <div className="text-xs text-muted-foreground">{tbr("readinessLabel", "preparacion")}</div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span>{b.criteriaCount} {tbr("criteriaCount", "criterios")}</span>
                  <span>·</span>
                  <span>{b.dealBreakerCount} {tbr("dealBreakers", "bloqueantes")}</span>
                  <a href={b.publicUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-0.5">
                    {tbr("publicPage", "Pagina publica")} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {report && (
                  <>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`px-1.5 py-0.5 text-xs rounded border ${report.dealBreakerIssues === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                        {report.dealBreakerIssues} {report.dealBreakerIssues === 1 ? tbr("dealBreakerIssue", "bloqueante") : tbr("dealBreakerIssues", "bloqueantes")}
                      </span>
                      <span className="px-1.5 py-0.5 text-xs rounded bg-muted text-foreground/90 border border-border">
                        <Clock className="w-3 h-3 inline mr-0.5" />
                        {report.contractTimelineEstimate}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/90 mb-3 leading-snug">{report.summary}</p>
                  </>
                )}

                {err && (
                  <div className="p-2 mb-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {err}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => runCheck(b.id as BuyerId)}
                    disabled={isLoading || !canRunReadiness}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-white text-xs font-medium rounded-lg disabled:opacity-50 bg-gradient-to-r ${c.gradient} hover:brightness-110`}
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    {isLoading
                      ? tbr("analyzing", "Analizando...")
                      : !canRunReadiness
                        ? tbr("loadEvidenceFirst", "Carga evidencia para activar")
                        : report
                          ? tbr("rerun", "Volver a correr chequeo")
                          : tbr("runCheck", "Evaluar preparación")}
                  </button>
                  {report && activeBuyer !== b.id && (
                    <button
                      onClick={() => setActiveBuyer(b.id as BuyerId)}
                      className="px-3 py-2 bg-card border border-input text-foreground/90 text-xs font-medium rounded-lg hover:bg-muted/40"
                    >
                      {tbr("viewDetails", "Ver detalles")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Active buyer detailed report */}
        {activeReport && activeBuyer && (
          <section className={`border-2 rounded-xl p-6 bg-card ${BUYER_COLORS[activeBuyer].border}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className={`text-xs uppercase tracking-wider font-semibold ${BUYER_COLORS[activeBuyer].text} mb-1`}>
                  {tbr("detailBadge", "Detalle de preparación")}
                </div>
                <h2 className="text-xl font-semibold text-foreground">{activeReport.buyerName}</h2>
              </div>
              <div className="text-right">
                <div className={`text-5xl font-bold ${activeReport.overallReadinessPct >= 80 ? "text-emerald-600" : activeReport.overallReadinessPct >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {activeReport.overallReadinessPct}%
                </div>
                <div className="text-xs text-muted-foreground">{tbr("contractReady", "listo para contrato")}</div>
              </div>
            </div>

            {/* Top actions */}
            {activeReport.topActions && activeReport.topActions.length > 0 && (
              <div className="mb-5 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <div className="text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" /> {tbr("topActionsTitle", "Acciones prioritarias")}
                </div>
                <ol className="list-decimal pl-5 space-y-1 text-sm text-indigo-800">
                  {activeReport.topActions.map((a: string, i: number) => <li key={i}>{a}</li>)}
                </ol>
              </div>
            )}

            {/* Criteria breakdown */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground mb-2">{tbr("criteriaBreakdownTitle", "Desglose de criterios")}</h3>
              {activeReport.criteria?.map((c: any, i: number) => (
                <div key={i} className="border border-border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {c.status === "MEETS" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> :
                        c.status === "PARTIAL" ? <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" /> :
                        <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground">{c.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium text-foreground/90">{tbr("evidenceLabel", "Evidencia:")}</span> {c.evidence}
                        </div>
                      </div>
                    </div>
                    <span className={`shrink-0 px-1.5 py-0.5 text-xs rounded border ${c.status === "MEETS" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : c.status === "PARTIAL" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                      {c.status === "MEETS"
                        ? tbr("statusMeets", "Cumple")
                        : c.status === "PARTIAL"
                          ? tbr("statusPartial", "Parcial")
                          : tbr("statusMisses", "No cumple")}
                    </span>
                  </div>
                  {c.status !== "MEETS" && (
                    <div className="mt-2 pt-2 border-t border-border/60 text-xs">
                      <div className="text-muted-foreground mb-0.5"><span className="font-medium text-foreground/90">{tbr("gapLabel", "Brecha:")}</span> {c.gap}</div>
                      <div className="text-muted-foreground"><span className="font-medium text-foreground/90">{tbr("actionLabel", "Acción:")}</span> {c.action}</div>
                      <div className="text-muted-foreground italic mt-0.5">{tbr("priorityLabel", "Prioridad:")} {c.priority?.replace(/_/g, " ")}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Meta */}
            <div className="mt-5 pt-4 border-t border-border/60 text-xs text-muted-foreground italic">
              {tbr("aiAnalysisNote", "Análisis con IA basado en {{evidence}} registros operativos, {{shipments}} envíos y {{community}} registros comunitarios. Uso de LLM: {{tokens}} tokens.", {
                evidence: activeReport._meta?.dataPoints?.evidenceCount ?? 0,
                shipments: activeReport._meta?.dataPoints?.shipmentCount ?? 0,
                community: activeReport._meta?.dataPoints?.communityCount ?? 0,
                tokens: ((activeReport._meta?.tokenUsage?.prompt ?? 0) + (activeReport._meta?.tokenUsage?.completion ?? 0)).toLocaleString(),
              })}
            </div>
          </section>
        )}

        {!activeReport && (
          <div className="text-xs text-muted-foreground italic bg-muted/40 border border-border rounded-lg p-3">
            <strong>{tbr("howItWorks", "Cómo funciona")}:</strong>{" "}
            {canRunReadiness
              ? tbr("howItWorksBody", "La IA lee la evidencia operativa, los envíos y los registros comunitarios del proyecto, los compara contra los criterios públicos de cada comprador y devuelve un puntaje con brechas priorizadas.")
              : tbr("howItWorksBlocked", "Este módulo se vuelve realmente útil cuando ya cargaste algo de operación. Antes de eso, conviene fortalecer evidencia y trazabilidad.")}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
