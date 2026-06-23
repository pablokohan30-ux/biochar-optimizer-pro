/**
 * Buyer Match — Stage 4 module 3.
 *
 * Route: /projects/:id/buyer-match (Expert tier only).
 *
 * Inverse of Buyer Readiness. "Given what my project has, who should I
 * approach first?" — the AI ranks all 4 buyers comparatively and tells the
 * operator where to start commercial conversations.
 */

import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Trophy, Loader2, AlertTriangle, Target, Clock, DollarSign,
  ArrowRight, Lock, Sparkles, AlertCircle, Zap, ClipboardCheck, Truck, Users,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import GuideLink from "@/components/GuideLink";
import PageLoader from "@/components/PageLoader";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { trpc } from "@/lib/trpc";

const TIMELINE_META: Record<string, { color: string; labelEs: string }> = {
  "ready to pitch now": { color: "bg-emerald-100 text-emerald-800 border-emerald-200", labelEs: "Listo para salir a vender" },
  "weeks to ready": { color: "bg-indigo-100 text-indigo-800 border-indigo-200", labelEs: "Semanas para quedar listo" },
  "1-3 months to ready": { color: "bg-amber-100 text-amber-800 border-amber-200", labelEs: "1 a 3 meses para quedar listo" },
  "3-6 months to ready": { color: "bg-orange-100 text-orange-800 border-orange-200", labelEs: "3 a 6 meses para quedar listo" },
  "unlikely within 6mo": { color: "bg-red-100 text-red-800 border-red-200", labelEs: "Poco probable en 6 meses" },
};

const PRICE_TIER_LABELS: Record<string, string> = {
  premium: "Precio premium",
  standard: "Precio estándar",
  discounted: "Precio descontado",
  "not viable": "No viable todavía",
};

const RANK_STYLES = [
  "bg-gradient-to-br from-amber-400 to-yellow-500 text-white",   // 1st - gold
  "bg-gradient-to-br from-slate-300 to-slate-500 text-white",    // 2nd - silver
  "bg-gradient-to-br from-orange-400 to-amber-600 text-white",   // 3rd - bronze
  "bg-muted text-foreground/90",                                  // 4th+
];

export default function ProjectBuyerMatch() {
  const { t, i18n } = useTranslation("common");
  const tbm = (k: string, fb: string, vars?: Record<string, any>) => t(`buyerMatch.${k}`, { defaultValue: fb, ...vars });
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, navigate] = useLocation();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();
  const hasExpert = hasAccess("expert");
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const recommendMutation = trpc.buyerMatch.recommend.useMutation({
    onSuccess: (data) => { setResult(data); setError(null); },
    onError: (e) => { setError(e.message); setResult(null); },
  });

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
          <h1 className="text-2xl font-bold text-foreground mb-2">{tbm("expertGateTitle", "Priorización de compradores")}</h1>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
            {tbm("expertGateDesc", "La IA ordena Microsoft, Frontier, Shell y Altitude segun la probabilidad de avanzar hacia un contrato en los proximos 6 meses, usando los datos reales del proyecto. Te dice a quien conviene contactar primero.")}
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 inline-block">
            <p className="text-sm text-amber-900 mb-2">{t("portfolio.expertRequired", { defaultValue: "Se requiere plan Expert" })}.</p>
            <button onClick={() => navigate("/pricing")} className="px-4 py-2 bg-amber-900 text-white text-sm rounded-lg">{t("portfolio.seeExpertPlan", { defaultValue: "Ver plan Expert" })}</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const runMatch = () => {
    setError(null);
    recommendMutation.mutate({ projectId, lang: i18n.language });
  };

  const match = result?.result;
  const evidenceCount = evidenceSummaryQuery.data?.totals.entries ?? 0;
  const soilPlanCount = evidenceSummaryQuery.data?.byType?.soil_application_plan?.total ?? 0;
  const shipmentCount = offtakeSummaryQuery.data?.totalShipments ?? 0;
  const communityCount = communitySummaryQuery.data?.totals.records ?? 0;
  const canRunMatch = evidenceCount > 0 || shipmentCount > 0 || communityCount > 0 || soilPlanCount > 0;
  const prepItems = [
    {
      label: tbm("prepEvidence", "Evidencia"),
      value: evidenceCount.toLocaleString(),
      hint: tbm("prepEvidenceHint", "registros operativos cargados"),
      icon: ClipboardCheck,
      accent: "text-blue-700 bg-blue-50 border-blue-200",
    },
    {
      label: tbm("prepShipments", "Envios"),
      value: shipmentCount.toLocaleString(),
      hint: tbm("prepShipmentsHint", "envíos trazables"),
      icon: Truck,
      accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      label: tbm("prepCommunity", "Comunidad"),
      value: communityCount.toLocaleString(),
      hint: tbm("prepCommunityHint", "registros comunitarios"),
      icon: Users,
      accent: "text-violet-700 bg-violet-50 border-violet-200",
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <button onClick={() => navigate(`/projects/${projectId}`)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> {tbm("back", "Volver al proyecto")}
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" /> {tbm("title", "Priorización de compradores")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tbm("subtitle", "Te ayuda a priorizar a qué buyer corporativo conviene acercarte primero, usando la señal real que ya tiene cargada tu operación.")}
            </p>
            <GuideLink anchor="como-operativo" label="Cómo convertir operación en salida comercial" className="mt-2 inline-flex" />
          </div>
          {canRunMatch ? (
            <button
              onClick={runMatch}
              disabled={recommendMutation.isPending}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:brightness-110 disabled:opacity-50 sm:shrink-0"
            >
              {recommendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {recommendMutation.isPending ? tbm("matching", "Buscando encaje...") : result ? tbm("rerun", "Volver a priorizar") : tbm("runMatch", "Priorizar compradores")}
            </button>
          ) : (
            <button
              onClick={() => navigate(`/projects/${projectId}/evidence`)}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-card border border-amber-300 text-amber-800 text-sm font-medium rounded-lg hover:bg-amber-50 sm:shrink-0"
            >
              <ClipboardCheck className="w-4 h-4" />
              {tbm("loadEvidence", "Cargar evidencia primero")}
            </button>
          )}
        </div>

        <section className={`rounded-xl border p-5 ${canRunMatch ? "bg-card border-border" : "bg-amber-50/70 border-amber-200"}`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${canRunMatch ? "bg-indigo-600/10 border-indigo-200 text-indigo-600" : "bg-amber-100 border-amber-200 text-amber-700"}`}>
              {canRunMatch ? <Target className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
                {tbm("prepEyebrow", "Estado del proyecto")}
              </div>
              <h2 className="text-base font-semibold text-foreground">
                {canRunMatch
                  ? tbm("prepReadyTitle", "Ya tienes señales mínimas para priorizar compradores")
                  : tbm("prepBlockedTitle", "Todavía es temprano para priorizar compradores")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {canRunMatch
                  ? tbm("prepReadyBody", "El ranking ya puede apoyarse en algo más que el dossier: registros operativos, trazabilidad u operación comunitaria.")
                  : tbm("prepBlockedBody", "Sin evidencia, envíos ni registros comunitarios, el ranking queda demasiado apoyado en inferencias. Conviene cargar operación real antes de salir a vender esto como buyer-ready.")}
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

          {!canRunMatch && (
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => navigate(`/projects/${projectId}/evidence`)}
                className="px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-background"
              >
                {tbm("goEvidence", "Cargar evidencia")}
              </button>
              <button
                onClick={() => navigate(`/projects/${projectId}/offtake`)}
                className="px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-background"
              >
                {tbm("goOfftake", "Registrar offtake")}
              </button>
              <button
                onClick={() => navigate(`/projects/${projectId}/community`)}
                className="px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-background"
              >
                {tbm("goCommunity", "Registrar comunidad")}
              </button>
            </div>
          )}
        </section>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <div>{error}</div>
          </div>
        )}

        {!result && !recommendMutation.isPending && (
          canRunMatch ? (
            <div className="bg-muted/40 border border-border rounded-lg p-8 text-center">
              <Target className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">{tbm("emptyTitle", "Aún no corriste un match.")}</p>
              <p className="text-xs text-muted-foreground">{tbm("emptyHint", "Corre esta evaluación para ver qué comprador conviene priorizar con la información real que ya tiene cargada tu operación.")}</p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-700 mx-auto mb-2" />
              <p className="text-sm text-amber-900 mb-1">{tbm("blockedTitle", "Primero carga algo de operación real.")}</p>
              <p className="text-xs text-amber-800">{tbm("blockedHint", "Con el proyecto vacío, la priorización comercial te va a devolver más narrativa que señal útil.")}</p>
            </div>
          )
        )}

        {match && (
          <>
            {/* Project summary + fatal issues */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{tbm("profileLabel", "Perfil comercial")}</div>
              <p className="text-sm text-foreground">{match.projectSummary}</p>

              {match.fatalIssues && match.fatalIssues.length > 0 && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded p-3">
                  <div className="text-xs font-semibold text-red-800 mb-1 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> {tbm("fatalIssuesTitle", "Problemas críticos que bloquean a todos los compradores")}
                  </div>
                  <ul className="list-disc pl-5 text-xs text-red-800 space-y-0.5">
                    {match.fatalIssues.map((f: string, i: number) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Commercial narrative */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
              <div className="text-xs font-semibold text-indigo-700 uppercase tracking-wider mb-1">{tbm("strategyTitle", "Estrategia comercial")}</div>
              <p className="text-sm text-indigo-900">{match.commercialNarrative}</p>
            </div>

            {/* Ranked buyers */}
            <div className="space-y-3">
              {(match.ranking ?? []).map((r: any, i: number) => {
                const rankStyle = RANK_STYLES[Math.min(i, RANK_STYLES.length - 1)];
                const timelineKey = String(r.timeline ?? "").trim().toLowerCase();
                const timelineMeta = TIMELINE_META[timelineKey];
                const timelineClass = timelineMeta?.color ?? "bg-muted text-foreground/90 border-border";
                const timelineLabel = timelineMeta?.labelEs ?? r.timeline;
                const priceTierKey = String(r.priceTier ?? "").trim().toLowerCase();
                const priceTierLabel = PRICE_TIER_LABELS[priceTierKey] ?? r.priceTier;
                return (
                  <div key={r.buyerId} className="bg-card border border-border rounded-xl p-5 hover:border-input">
                    <div className="flex items-start gap-4 mb-3">
                      <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${rankStyle}`}>
                        #{r.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground">{r.buyerName}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`px-2 py-0.5 text-xs rounded border ${timelineClass}`}>
                            <Clock className="w-3 h-3 inline mr-0.5" /> {timelineLabel}
                          </span>
                          {r.priceTier && (
                            <span className="px-2 py-0.5 text-xs rounded bg-muted text-foreground/90 border border-border">
                              <DollarSign className="w-3 h-3 inline mr-0.5" /> {priceTierLabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-3xl font-bold ${r.fitScore >= 70 ? "text-emerald-600" : r.fitScore >= 40 ? "text-amber-600" : "text-red-600"}`}>
                          {r.fitScore}%
                        </div>
                        <div className="text-xs text-muted-foreground">{tbm("fitLabel", "encaje")}</div>
                      </div>
                    </div>

                    {/* Strengths + gaps */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
                        <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1.5">{tbm("strengthsTitle", "Fortalezas")}</div>
                        <ul className="list-disc pl-5 text-xs text-emerald-900 space-y-0.5">
                          {(r.strengths ?? []).map((s: string, j: number) => <li key={j}>{s}</li>)}
                        </ul>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded p-3">
                        <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1.5">{tbm("gapsTitle", "Brechas")}</div>
                        <ul className="list-disc pl-5 text-xs text-amber-900 space-y-0.5">
                          {(r.gaps ?? []).map((g: string, j: number) => <li key={j}>{g}</li>)}
                        </ul>
                      </div>
                    </div>

                    {/* Next step */}
                    {r.nextStep && (
                      <div className="mt-3 pt-3 border-t border-border/60 flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                        <div className="text-sm text-foreground">
                          <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{tbm("firstStepLabel", "Primer paso")}</span>
                          {r.nextStep}
                        </div>
                      </div>
                    )}

                    {/* CTA to run detailed buyer readiness */}
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => navigate(`/projects/${projectId}/buyer-readiness`)}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        <Zap className="w-3 h-3" /> {tbm("runDetailedReadiness", "Correr chequeo detallado para {{buyer}}", { buyer: r.buyerName })}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Meta */}
            <div className="text-xs text-muted-foreground italic bg-muted/40 border border-border rounded-lg p-3">
              {tbm("metaNote", "Analisis con IA basado en {{evidence}} registros operativos + {{shipments}} envios + {{community}} registros comunitarios. Uso LLM: {{tokens}} tokens (~USD ${{cost}}).", {
                evidence: result.dataPoints.evidence,
                shipments: result.dataPoints.shipments,
                community: result.dataPoints.community,
                tokens: ((result.tokenUsage.prompt ?? 0) + (result.tokenUsage.completion ?? 0)).toLocaleString(),
                cost: ((result.tokenUsage.prompt/1e6)*0.075 + (result.tokenUsage.completion/1e6)*0.30).toFixed(4),
              })}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
