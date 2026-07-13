/**
 * Audit Package — Stage 4 module 2.
 *
 * Route: /projects/:id/audit-package (Expert tier only).
 *
 * Builds a single consolidated doc with: Executive Summary (AI-generated) +
 * Operational Evidence tables + Offtake chain-of-custody + Community Impact
 * log + Buyer readiness context. Renders as a print-friendly layout the
 * operator sends to their VVB or corporate buyer (Microsoft, Frontier, etc).
 *
 * White-label branding is applied in the cover + footer.
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useReactToPrint } from "react-to-print";
import {
  ArrowLeft, Printer, Loader2, AlertTriangle, FileCheck, Sparkles,
  Truck, Users, Flame, Beaker, Zap as ZapIcon, MapPin, Lock,
  ClipboardCheck,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import GuideLink from "@/components/GuideLink";
import PageLoader from "@/components/PageLoader";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { trpc } from "@/lib/trpc";
import { BRAND_NAME, BRAND_URL, DEFAULT_EXPORT_COMPANY } from "@/lib/brand";

const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  biomass_receipt: "Recepción de biomasa",
  pyrolysis_batch: "Lote de pirólisis",
  lab_analysis: "Análisis de laboratorio",
  energy_reading: "Lectura de energía",
  shift_log: "Registro de turno",
  incident: "Incidente",
  soil_application_plan: "Plan de aplicación al suelo",
};

const COMMUNITY_TYPE_LABEL: Record<string, string> = {
  meeting: "Reunión",
  grievance: "Reclamo",
  local_hire: "Contratación local",
  local_procurement: "Compra local",
  community_investment: "Inversión comunitaria",
  benefit_share: "Distribución de beneficios",
  env_monitoring: "Monitoreo ambiental",
};

const SHIPMENT_STATUS_LABEL: Record<string, string> = {
  draft: "borrador",
  dispatched: "despachado",
  in_transit: "en tránsito",
  delivered: "entregado",
  applied: "aplicado",
  rejected: "rechazado",
  lost: "perdido",
};

const END_USE_LABEL: Record<string, string> = {
  agricultural_soil: "enmienda para suelo agrícola",
  horticulture: "horticultura",
  cement_substitute: "sustituto de cemento",
  construction_filler: "relleno de construcción",
  water_filtration: "filtración de agua",
  livestock_feed: "alimentación animal",
  other: "otro",
};

function parseDateInputMs(value: string, endOfDay = false) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return Date.now();
  return Date.UTC(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
}

function formatCalendarDate(valueMs: number | null | undefined, locale: string) {
  if (!valueMs) return "—";
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC" }).format(new Date(valueMs));
}

export default function ProjectAuditPackage() {
  const { t, i18n } = useTranslation("common");
  const tap = (k: string, fb: string, vars?: Record<string, any>) => t(`auditPackage.${k}`, { defaultValue: fb, ...vars });
  const locale = i18n.resolvedLanguage?.toLowerCase().startsWith("es")
    ? "es-AR"
    : (i18n.resolvedLanguage || "en-US");
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, navigate] = useLocation();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();
  const hasExpert = hasAccess("expert");
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

  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [buyerName, setBuyerName] = useState("");
  const [pkg, setPkg] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const utils = trpc.useUtils();
  const historyQuery = trpc.auditPackage.list.useQuery(
    { projectId },
    { enabled: isAuthenticated && hasExpert && Number.isFinite(projectId) },
  );
  const revokeMutation = trpc.auditPackage.revoke.useMutation({
    onSuccess: () => utils.auditPackage.list.invalidate({ projectId }),
  });

  const brandingQuery = trpc.branding.get.useQuery(undefined, { enabled: isAuthenticated });
  const brand = brandingQuery.data;
  const brandCompany = brand?.companyName ?? DEFAULT_EXPORT_COMPANY;
  const brandLogo = brand?.logoDataUrl ?? null;
  const brandPrimary = brand?.primaryColor ?? null;
  const brandFooter = brand?.footerText ?? null;

  const buildMutation = trpc.auditPackage.build.useMutation({
    onSuccess: (data) => {
      setPkg(data);
      setError(null);
      utils.auditPackage.list.invalidate({ projectId });
    },
    onError: (e) => {
      setError(e.message);
      setPkg(null);
    },
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: pkg ? `${pkg.packageId}_audit-package` : "audit-package",
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading || tierLoading) return <PageLoader />;
  if (!isAuthenticated) return null;
  if (!Number.isFinite(projectId)) return <AppLayout><div className="p-8">ID de proyecto inválido.</div></AppLayout>;

  if (!hasExpert) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{tap("expertGateTitle", "Exportar paquete de auditoria")}</h1>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
            {tap("expertGateDesc", "Consolida evidencia operativa, trazabilidad de envios e impacto comunitario en un PDF listo para imprimir y compartir con un VVB, auditor o buyer corporativo.")}
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 inline-block">
            <p className="text-sm text-amber-900 mb-2">{t("portfolio.expertRequired", { defaultValue: "Se requiere plan Expert" })}.</p>
            <button onClick={() => navigate("/pricing")} className="px-4 py-2 bg-amber-900 text-white text-sm rounded-lg">{t("portfolio.seeExpertPlan", { defaultValue: "Ver plan Expert" })}</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const handleBuild = () => {
    if (!canBuildPackage) return;
    setError(null);
    buildMutation.mutate({
      projectId,
      periodStartMs: parseDateInputMs(periodStart),
      periodEndMs: parseDateInputMs(periodEnd, true),
      buyerName: buyerName.trim() || undefined,
      lang: i18n.language,
    });
  };

  const evidenceCount = evidenceSummaryQuery.data?.totals.entries ?? 0;
  const shipmentCount = offtakeSummaryQuery.data?.totalShipments ?? 0;
  const communityCount = communitySummaryQuery.data?.totals.records ?? 0;
  const canBuildPackage = evidenceCount > 0 || shipmentCount > 0 || communityCount > 0;
  const prepItems = [
    {
      label: tap("prepEvidence", "Evidencia"),
      value: evidenceCount.toLocaleString(),
      hint: tap("prepEvidenceHint", "registros operativos"),
      icon: ClipboardCheck,
      accent: "text-blue-700 bg-blue-50 border-blue-200",
    },
    {
      label: tap("prepShipments", "Envios"),
      value: shipmentCount.toLocaleString(),
      hint: tap("prepShipmentsHint", "envíos trazables"),
      icon: Truck,
      accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      label: tap("prepCommunity", "Comunidad"),
      value: communityCount.toLocaleString(),
      hint: tap("prepCommunityHint", "registros comunitarios"),
      icon: Users,
      accent: "text-violet-700 bg-violet-50 border-violet-200",
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 print:hidden">
        <button onClick={() => navigate(`/projects/${projectId}`)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> {tap("back", "Volver al proyecto")}
        </button>

        <div>
          <h1 className="text-2xl font-semibold text-foreground">{tap("title", "Paquete de auditoria")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tap("subtitle", "Consolida evidencia, offtake y comunidad en un solo documento para revisión. El valor del paquete depende de la calidad de los registros que ya tenga cargado el proyecto.")}
          </p>
          <GuideLink anchor="como-operativo" label="Qué debería entrar en el paquete de auditoría" className="mt-2 inline-flex" />
        </div>

        <section className={`rounded-xl border p-5 ${canBuildPackage ? "bg-card border-border" : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50"}`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${canBuildPackage ? "bg-indigo-600/10 border-indigo-200 text-indigo-600" : "bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700/60 text-amber-700 dark:text-amber-300"}`}>
              {canBuildPackage ? <FileCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[10px] font-bold uppercase tracking-[0.18em] mb-1 ${canBuildPackage ? "text-muted-foreground" : "text-amber-700 dark:text-amber-300"}`}>
                {tap("prepEyebrow", "Estado del paquete")}
              </div>
              <h2 className={`text-base font-semibold ${canBuildPackage ? "text-foreground" : "text-amber-900 dark:text-amber-100"}`}>
                {canBuildPackage
                  ? tap("prepReadyTitle", "Ya hay base suficiente para armar un paquete útil")
                  : tap("prepEarlyTitle", "Todavía no conviene armar este paquete")}
              </h2>
              <p className={`text-sm mt-1 ${canBuildPackage ? "text-muted-foreground" : "text-amber-800 dark:text-amber-200"}`}>
                {canBuildPackage
                  ? tap("prepReadyBody", "El paquete ya puede consolidar algo real. Aún así, úsalo como salida de revisión y no como prueba automática de que el proyecto está listo para buyer o auditor.")
                  : tap("prepEarlyBody", "Si compilas un paquete de auditoría con el proyecto vacío, el resultado sale más decorativo que útil. Primero conviene cargar evidencia, envíos o registros comunitarios.")}
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

          {!canBuildPackage && (
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => navigate(`/projects/${projectId}/evidence`)}
                className="px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-background"
              >
                {tap("goEvidence", "Cargar evidencia")}
              </button>
              <button
                onClick={() => navigate(`/projects/${projectId}/offtake`)}
                className="px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-background"
              >
                {tap("goOfftake", "Registrar offtake")}
              </button>
              <button
                onClick={() => navigate(`/projects/${projectId}/community`)}
                className="px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-background"
              >
                {tap("goCommunity", "Registrar comunidad")}
              </button>
            </div>
          )}
        </section>

        {/* Form */}
        <section className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-foreground">{tap("paramsTitle", "Parametros del paquete")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1">{tap("periodStart", "Inicio del periodo")}</label>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1">{tap("periodEnd", "Fin del periodo")}</label>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1">
                {tap("buyerContext", "Contexto comercial")} <span className="text-muted-foreground/70 font-normal">{tap("optional", "(opcional)")}</span>
              </label>
              <input type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)}
                placeholder={tap("buyerContextPlaceholder", "ej. Microsoft, Frontier, Shell")}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {tap("dateInputHint", "Las fechas se guardan en formato AAAA-MM-DD, aunque tu navegador pueda mostrarlas con otro orden.")}
          </p>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <div>{error}</div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button onClick={handleBuild} disabled={buildMutation.isPending || !canBuildPackage}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {buildMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
              {buildMutation.isPending
                ? tap("building", "Armando paquete...")
                : !canBuildPackage
                  ? tap("loadDataFirst", "Carga datos para activar")
                  : pkg
                    ? tap("rebuild", "Re-armar paquete")
                    : tap("build", "Armar paquete de auditoría")}
            </button>
            {pkg && (
              <button onClick={() => handlePrint()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border border-input text-foreground/90 text-sm font-medium rounded-lg hover:bg-muted/40">
                <Printer className="w-4 h-4" /> {tap("print", "Imprimir / guardar PDF")}
              </button>
            )}
            {pkg?.shareToken && (
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/audit/${pkg.shareToken}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  } catch {
                    window.prompt(tap("shareLinkPrompt", "Copiá este link:"), url);
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
              >
                {shareCopied
                  ? tap("shareCopied", "¡Link copiado!")
                  : tap("copyShareLink", "Copiar link para el VVB")}
              </button>
            )}
            {pkg && (
              <span className="text-xs text-muted-foreground">
                {tap("packageIdLabel", "ID del paquete:")} <span className="font-mono">{pkg.packageId}</span> · {tap("generatedLabel", "Generado")} {new Date(pkg.generatedAtMs).toLocaleString(locale)}
              </span>
            )}
          </div>
        </section>

        {/* Paquetes previos — audit trail + shareable links + revoke */}
        {historyQuery.data && historyQuery.data.length > 0 && (
          <section className="mt-6 bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {tap("historyTitle", "Paquetes generados")}
            </h3>
            <ul className="divide-y divide-border">
              {historyQuery.data.map((row: {
                id: number;
                packageId: string;
                shareToken: string;
                buyerName: string | null;
                periodStartMs: number;
                periodEndMs: number;
                evidenceCount: number;
                shipmentCount: number;
                communityCount: number;
                revoked: boolean;
                createdAtMs: number;
              }) => {
                const shareUrl = `${window.location.origin}/audit/${row.shareToken}`;
                return (
                  <li key={row.id} className="py-2.5 flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono truncate">{row.packageId}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(row.createdAtMs).toLocaleDateString()} ·{" "}
                        {row.buyerName ?? tap("noBuyer", "(sin comprador)")} · e={row.evidenceCount} s={row.shipmentCount} c={row.communityCount}
                      </div>
                    </div>
                    {row.revoked ? (
                      <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-500 rounded font-semibold uppercase tracking-wider">
                        {tap("revoked", "Revocado")}
                      </span>
                    ) : (
                      <>
                        <a
                          href={shareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:text-primary/80 underline"
                        >
                          {tap("openShare", "Abrir link")}
                        </a>
                        <button
                          type="button"
                          onClick={async () => {
                            try { await navigator.clipboard.writeText(shareUrl); }
                            catch { window.prompt(tap("shareLinkPrompt", "Copiá este link:"), shareUrl); }
                          }}
                          className="text-xs text-muted-foreground hover:text-primary"
                        >
                          {tap("copyLink", "Copiar")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (revokeMutation.isPending) return;
                            if (confirm(tap("revokeConfirm", "Revocar este link para siempre?"))) {
                              revokeMutation.mutate({ id: row.id });
                            }
                          }}
                          className="text-xs text-muted-foreground hover:text-red-500"
                        >
                          {tap("revokeAction", "Revocar")}
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      {/* Print content — visible on screen AND print */}
      {pkg && (
        <div
          ref={contentRef}
          className="max-w-5xl mx-auto bg-white px-10 py-8 print:px-8 print:py-6 shadow-lg print:shadow-none text-slate-900 print:max-w-none"
        >
          {/* Cover */}
          <div
            className="pb-6 border-b-2 mb-6 page-break-after-always"
            style={{ borderColor: brandPrimary ?? undefined }}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3">
                {brandLogo && (
                  <img src={brandLogo} alt={brandCompany} className="h-12 max-w-[140px] object-contain shrink-0" />
                )}
                <div>
                  <div
                    className="text-[11px] font-bold uppercase tracking-[0.2em]"
                    style={{ color: brandPrimary ?? undefined }}
                  >
                    {brandCompany}
                  </div>
                  <h1 className="text-3xl font-bold text-slate-900 mt-1">{tap("title", "Paquete de auditoria")}</h1>
                  <p className="text-sm text-slate-600 mt-1">{tap("coverBadge", "Evidencia operativa del proyecto de remocion de carbono")}</p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div className="font-mono font-bold text-base" style={{ color: brandPrimary ?? undefined }}>{pkg.packageId}</div>
                <div className="mt-0.5">{new Date(pkg.generatedAtMs).toLocaleDateString(locale)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mt-8">
              <InfoRow label={tap("coverProject", "Proyecto")} value={pkg.project.name} />
              {pkg.project.bopId && <InfoRow label={tap("coverBopId", "BOP ID")} value={pkg.project.bopId} />}
              {pkg.project.country && <InfoRow label={tap("coverCountry", "Pais")} value={pkg.project.country} />}
              {pkg.project.location && <InfoRow label={tap("coverLocation", "Ubicacion")} value={pkg.project.location} />}
              <InfoRow label={tap("coverPeriodStart", "Inicio del periodo")} value={formatCalendarDate(pkg.period.startMs, locale)} />
              <InfoRow label={tap("coverPeriodEnd", "Fin del periodo")} value={formatCalendarDate(pkg.period.endMs, locale)} />
              {pkg.buyerName && <InfoRow label={tap("coverPreparedFor", "Preparado para")} value={pkg.buyerName} />}
            </div>

            <div className="mt-8 bg-amber-50 border-l-4 border-amber-400 p-4 rounded text-xs italic text-amber-900">
              {tap("draftWarning", "BORRADOR — paquete de auditoria asistido por IA. El resumen ejecutivo se genera a partir de las tablas de datos incluidas abajo. El operador debe validar que los registros base sean correctos. Las cifras, fechas y evidencias de las tablas son la fuente principal.")}
            </div>
          </div>

          {/* Executive summary */}
          <Section title={tap("sectionExecSummary", "Resumen ejecutivo")} icon={<Sparkles className="w-4 h-4" />} brandPrimary={brandPrimary}>
            {pkg.executiveSummary ? (
              <MarkdownBlock content={pkg.executiveSummary} />
            ) : (
              <div className="text-sm text-slate-500 italic">—</div>
            )}
          </Section>

          {/* Totals */}
          <Section title={tap("sectionKpis", "Metricas clave")} icon={<FileCheck className="w-4 h-4" />} brandPrimary={brandPrimary}>
            <div className="grid grid-cols-4 gap-3 text-xs">
              <Metric label={tap("metricEvidenceRecords", "Registros de evidencia")} value={pkg.totals.evidenceRecords.toString()} />
              <Metric label={tap("metricBiocharProduced", "Biochar producido")} value={`${pkg.totals.totalBiocharProduced.toFixed(1)} t`} />
              <Metric label={tap("metricTonnesShipped", "Toneladas enviadas")} value={`${pkg.totals.totalTonnesShipped.toFixed(1)} t`} />
              <Metric label={tap("metricTonnesApplied", "Toneladas aplicadas")} value={`${pkg.totals.totalTonnesApplied.toFixed(1)} t`} />
              <Metric label={tap("metricTraceability", "Trazabilidad de uso final")} value={`${pkg.totals.traceabilityPct}%`} />
              <Metric label={tap("metricGrievances", "Reclamos")} value={`${pkg.totals.grievances}`} hint={`${pkg.totals.grievanceResolutionPct}% resueltos`} />
              <Metric label={tap("metricLocalWorkforce", "Empleo local")} value={`${pkg.totals.localHirePct}%`} hint={`${pkg.totals.localHireCount}/${pkg.totals.localHireTotal}`} />
              <Metric label={tap("metricCommunityInvestment", "Inversion comunitaria")} value={`USD ${Math.round(pkg.totals.totalInvestmentUsd).toLocaleString()}`} hint={`${pkg.totals.totalBeneficiaries} beneficiarios`} />
            </div>
          </Section>

          {/* Operational Evidence */}
          <Section title={`${tap("sectionEvidence", "Evidencia operativa")} (${pkg.evidence.length})`} icon={<Flame className="w-4 h-4" />} brandPrimary={brandPrimary}>
            {pkg.evidence.length === 0 ? (
              <EmptyNote>{tap("emptyEvidence", "No hay evidencia operativa registrada en este periodo.")}</EmptyNote>
            ) : (
              <table className="w-full text-xs border border-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-semibold">{tap("tableDate", "Fecha")}</th>
                    <th className="text-left px-2 py-1.5 font-semibold">{tap("tableType", "Tipo")}</th>
                    <th className="text-left px-2 py-1.5 font-semibold">{tap("tableSummary", "Resumen")}</th>
                    <th className="text-left px-2 py-1.5 font-semibold">{tap("tableValidation", "Validacion")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pkg.evidence.map((e: any) => (
                    <tr key={e.id} className="border-t border-slate-100 align-top">
                      <td className="px-2 py-1.5 whitespace-nowrap text-slate-500">{formatCalendarDate(e.periodStartMs, locale)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{EVIDENCE_TYPE_LABEL[e.dataType] ?? e.dataType}</td>
                      <td className="px-2 py-1.5">{summarizeEvidence(e.dataType, e.content)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <ValidationBadge status={e.validationStatus} />
                        {e.validationNotes && <div className="text-xs italic text-slate-500 mt-0.5">{e.validationNotes}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* Offtake chain-of-custody */}
          <Section title={`${tap("sectionOfftake", "Cadena de custodia de envios")} (${pkg.shipments.length})`} icon={<Truck className="w-4 h-4" />} brandPrimary={brandPrimary}>
            {pkg.shipments.length === 0 ? (
              <EmptyNote>{tap("emptyShipments", "No hay envios registrados en este periodo.")}</EmptyNote>
            ) : (
              <table className="w-full text-xs border border-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-semibold">{tap("tableCode", "Codigo")}</th>
                    <th className="text-left px-2 py-1.5 font-semibold">{tap("tableDate", "Fecha")}</th>
                    <th className="text-right px-2 py-1.5 font-semibold">{tap("tableTonnes", "Toneladas")}</th>
                    <th className="text-left px-2 py-1.5 font-semibold">{tap("tableEndUse", "Uso final")}</th>
                    <th className="text-left px-2 py-1.5 font-semibold">{tap("tableDestination", "Destino")}</th>
                    <th className="text-left px-2 py-1.5 font-semibold">{tap("tableStatus", "Estado")}</th>
                    <th className="text-left px-2 py-1.5 font-semibold">{tap("tableEndUserConfirm", "Confirmacion del usuario final")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pkg.shipments.map((s: any) => (
                    <tr key={s.id} className="border-t border-slate-100 align-top">
                      <td className="px-2 py-1.5 font-mono whitespace-nowrap">{s.shipmentCode}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-slate-500">{formatCalendarDate(s.shipmentDateMs, locale)}</td>
                      <td className="px-2 py-1.5 text-right">{s.tonnes?.toFixed(1)}</td>
                      <td className="px-2 py-1.5">{s.endUseCategory ? (END_USE_LABEL[s.endUseCategory] ?? s.endUseCategory.replace(/_/g, " ")) : "—"}</td>
                      <td className="px-2 py-1.5">
                        <div>{s.destinationName ?? "—"}</div>
                        {s.destinationCountry && <div className="text-xs text-slate-500">{s.destinationCountry}</div>}
                      </td>
                      <td className="px-2 py-1.5">
                        <span className={`px-1.5 py-0.5 text-xs rounded ${s.status === "applied" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{SHIPMENT_STATUS_LABEL[s.status] ?? s.status}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        {s.status === "applied" && s.confirmedByName ? (
                          <div className="text-xs">
                            <div className="font-medium text-slate-900">{s.confirmedByName}</div>
                            <div className="text-slate-500">
                              {tap("tableTonnesApplied", "{{t}} t aplicadas", { t: s.confirmedTonnesApplied?.toFixed(1) })}
                              {s.confirmedApplicationType && ` · ${s.confirmedApplicationType}`}
                              {s.confirmedCropOrUseType && ` · ${s.confirmedCropOrUseType}`}
                            </div>
                            {s.confirmedLat != null && s.confirmedLon != null && (
                              <div className="text-slate-400 flex items-center gap-0.5 mt-0.5">
                                <MapPin className="w-2.5 h-2.5" /> {s.confirmedLat.toFixed(4)}, {s.confirmedLon.toFixed(4)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400">{tap("tablePending", "pendiente")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* Community Impact */}
          <Section title={`${tap("sectionCommunity", "Impacto comunitario")} (${pkg.community.length})`} icon={<Users className="w-4 h-4" />} brandPrimary={brandPrimary}>
            {pkg.community.length === 0 ? (
              <EmptyNote>{tap("emptyCommunity", "No hay registros comunitarios en este periodo.")}</EmptyNote>
            ) : (
              <table className="w-full text-xs border border-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-semibold">{tap("tableDate", "Fecha")}</th>
                    <th className="text-left px-2 py-1.5 font-semibold">{tap("tableType", "Tipo")}</th>
                    <th className="text-left px-2 py-1.5 font-semibold">{tap("tableSummary", "Resumen")}</th>
                    <th className="text-left px-2 py-1.5 font-semibold">{tap("tableStatus", "Estado")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pkg.community.map((c: any) => (
                    <tr key={c.id} className="border-t border-slate-100 align-top">
                      <td className="px-2 py-1.5 whitespace-nowrap text-slate-500">{formatCalendarDate(c.recordDateMs, locale)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{COMMUNITY_TYPE_LABEL[c.recordType] ?? c.recordType}</td>
                      <td className="px-2 py-1.5">{summarizeCommunity(c.recordType, c.content)}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {c.recordType === "grievance" && (
                          <span className={`px-1.5 py-0.5 text-xs rounded ${
                            c.status === "resolved" || c.status === "closed" ? "bg-emerald-100 text-emerald-800" :
                            c.status === "in_progress" ? "bg-amber-100 text-amber-800" :
                            "bg-red-100 text-red-800"
                          }`}>{c.status}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* Footer */}
          <div className="mt-12 pt-4 border-t-2 text-xs text-slate-500 text-center" style={{ borderColor: brandPrimary ?? undefined }}>
            {brandFooter ? (
              <>{brandFooter}</>
            ) : brandCompany !== DEFAULT_EXPORT_COMPANY ? (
              <>{tap("footerPreparedBy", "Preparado por")} {brandCompany}</>
            ) : (
              <>{tap("footerGeneratedBy", "Generado con")} <strong>{BRAND_NAME}</strong> · {BRAND_URL}</>
            )}
            <span> · {new Date(pkg.generatedAtMs).toLocaleDateString(locale)} · {tap("footerPackage", "Paquete")} {pkg.packageId}</span>
          </div>
        </div>
      )}

      {/* Print CSS */}
      <style>{`
        @media print {
          @page { size: A4; margin: 16mm 14mm; }
          .page-break-after-always { page-break-after: always; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </AppLayout>
  );
}

// ─── Small render helpers ────────────────────────────────────────────────

function Section({ title, icon, children, brandPrimary }: { title: string; icon: React.ReactNode; children: React.ReactNode; brandPrimary: string | null }) {
  return (
    <section className="mb-6">
      <div
        className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider mb-3 pb-1 border-b"
        style={{ color: brandPrimary ?? undefined, borderColor: brandPrimary ? `${brandPrimary}40` : undefined }}
      >
        {icon} {title}
      </div>
      <div>{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-slate-200 rounded px-2 py-1.5">
      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-semibold text-slate-900 mt-0.5">{value}</div>
      {hint && <div className="text-[10px] text-slate-500">{hint}</div>}
    </div>
  );
}

function ValidationBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-slate-400">—</span>;
  const color =
    status === "PASS" ? "bg-emerald-100 text-emerald-800" :
    status === "WARNING" ? "bg-amber-100 text-amber-800" :
    status === "FAIL" ? "bg-red-100 text-red-800" :
    "bg-slate-100 text-slate-700";
  return <span className={`px-1.5 py-0.5 text-xs rounded ${color}`}>{status}</span>;
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <div className="text-xs italic text-slate-500 border border-slate-200 rounded px-3 py-2 bg-slate-50">{children}</div>;
}

function summarizeEvidence(dataType: string, c: any): string {
  if (!c) return "—";
  if (dataType === "pyrolysis_batch") return `${c.batchId}: ${c.biomassInputTonnes}t→${c.biocharOutputTonnes}t @ ${c.peakTempC}°C, ${c.residenceTimeMin}min${c.sustainedTimeAboveThresholdMin ? ` (sustained >500°C: ${c.sustainedTimeAboveThresholdMin}min)` : ""}`;
  if (dataType === "lab_analysis") return `${c.labName}: H/Corg=${c.hCorgMolar ?? "—"}, C=${c.organicCarbonPct ?? "—"}%${c.ashPct ? `, ash=${c.ashPct}%` : ""}`;
  if (dataType === "biomass_receipt") return `${c.supplierName}: ${c.tonnesReceived} t de ${c.biomassType}${c.moisturePct != null ? ` · ${c.moisturePct}% H₂O` : ""}${c.certificationRef ? ` (${c.certificationRef})` : ""}`;
  if (dataType === "energy_reading") return `${c.electricityKwh} kWh${c.dieselLiters ? `, ${c.dieselLiters} L de diésel` : ""}${c.naturalGasM3 ? `, ${c.naturalGasM3} m³ GN` : ""}`;
  if (dataType === "shift_log") return `${c.shiftId}${c.operator ? ` (${c.operator})` : ""}: ${c.biocharOutputTonnes ?? 0} t producidas${c.downtimeMin ? `, ${c.downtimeMin} min de parada` : ""}`;
  if (dataType === "incident") return `[${c.severity}] ${c.category}: ${c.description?.slice(0, 120)}`;
  if (dataType === "soil_application_plan") {
    const area = c.totalAreaHa != null ? `${c.totalAreaHa} ha` : "área no informada";
    const rate = c.applicationRateKgPerHa != null ? `${c.applicationRateKgPerHa.toLocaleString("es-AR")} kg/ha` : "dosis no informada";
    const crop = c.targetCrop ? ` para ${c.targetCrop}` : "";
    const frequency = c.applicationFrequency ? ` · frecuencia: ${c.applicationFrequency}` : "";
    return `${c.planTitle ?? "Plan de aplicación"}: ${area} @ ${rate}${crop}${frequency}`;
  }
  return JSON.stringify(c).slice(0, 150);
}

function summarizeCommunity(recordType: string, c: any): string {
  if (!c) return "—";
  if (recordType === "meeting") return `${c.title} — ${c.attendeesCount ?? "?"} asistentes${c.location ? ` · ${c.location}` : ""}${c.decisions ? ` · Decisiones: ${c.decisions.slice(0, 100)}` : ""}`;
  if (recordType === "grievance") return `[${c.severity}] ${c.category} — ${c.description?.slice(0, 120)}${c.resolution ? ` → ${c.resolution.slice(0, 100)}` : ""}`;
  if (recordType === "local_hire") return `${c.personName} — ${c.role}${c.isFromLocalCommunity ? " (comunidad local)" : " (fuera de la comunidad local)"}${c.trainingProvided ? ` · capacitación: ${c.trainingProvided.slice(0, 60)}` : ""}`;
  if (recordType === "local_procurement") return `${c.supplierName}: USD ${c.amountUsd?.toLocaleString("es-AR")}${c.category ? ` (${c.category})` : ""}${c.isFromLocalCommunity ? " — proveedor local" : ""}`;
  if (recordType === "community_investment") return `${c.category}: USD ${c.amountUsd?.toLocaleString("es-AR")} — ${c.description?.slice(0, 100)}${c.beneficiariesCount ? ` (${c.beneficiariesCount} benef.)` : ""}`;
  if (recordType === "benefit_share") return `${c.type}: ${c.description?.slice(0, 100)}${c.tonnesBiochar ? ` (${c.tonnesBiochar}t)` : ""}`;
  if (recordType === "env_monitoring") return `${c.parameter} = ${c.value} ${c.unit}${c.thresholdLimit != null ? ` (límite ${c.thresholdLimit})` : ""}${c.passesThreshold != null ? (c.passesThreshold ? " ✓" : " ✗") : ""}`;
  return JSON.stringify(c).slice(0, 150);
}

// ─── Lightweight markdown renderer for the executive summary ────────────

function MarkdownBlock({ content }: { content: string }) {
  const html = content
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-5 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .split(/\n{2,}/)
    .map((block) => {
      const t = block.trim();
      if (!t) return "";
      if (/^<(h[1-6])/.test(t)) return t;
      return `<p class="text-sm text-slate-700 my-2 leading-relaxed">${t.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
  return <div className="prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}
