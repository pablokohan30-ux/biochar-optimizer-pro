/**
 * Community Impact Tracker — Stage 3, module 3.
 *
 * Route: /projects/:id/community (Expert tier only).
 *
 * Auditable live registry of community meetings, grievances, local hires,
 * local procurement, community investments, biochar donations, and
 * environmental monitoring. Plus an AI-generated Impact Report export.
 *
 * Closes the 3rd dealbreaker from the Microsoft DD conversation:
 * "community & social impact must be real, not decoration."
 */

import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Plus, Users, AlertCircle, Briefcase, ShoppingCart, HandHeart,
  Gift, Activity, Lock, X, Save, Download, FileText, Loader2, CheckCircle2,
  AlertTriangle, ClipboardCheck, Truck,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import GuideLink from "@/components/GuideLink";
import PageLoader from "@/components/PageLoader";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { trpc } from "@/lib/trpc";

type RecordType = "meeting" | "grievance" | "local_hire" | "local_procurement" | "community_investment" | "benefit_share" | "env_monitoring";

type TypeMeta = { labelKey: string; labelFb: string; icon: any; color: string; bg: string };

const TYPE_META: Record<RecordType, TypeMeta> = {
  meeting: { labelKey: "cat_meeting", labelFb: "Reuniones", icon: Users, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  grievance: { labelKey: "cat_grievance", labelFb: "Reclamos", icon: AlertCircle, color: "text-red-700", bg: "bg-red-50 border-red-200" },
  local_hire: { labelKey: "cat_local_hire", labelFb: "Contrataciones locales", icon: Briefcase, color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  local_procurement: { labelKey: "cat_local_procurement", labelFb: "Compras locales", icon: ShoppingCart, color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200" },
  community_investment: { labelKey: "cat_community_investment", labelFb: "Inversion comunitaria", icon: HandHeart, color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  benefit_share: { labelKey: "cat_benefit_share", labelFb: "Distribucion de beneficios", icon: Gift, color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  env_monitoring: { labelKey: "cat_env_monitoring", labelFb: "Monitoreo ambiental", icon: Activity, color: "text-teal-700", bg: "bg-teal-50 border-teal-200" },
};

export default function ProjectCommunity() {
  const { t } = useTranslation("common");
  const tc = (k: string, fb: string, vars?: Record<string, any>) => t(`community.${k}`, { defaultValue: fb, ...vars });
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, navigate] = useLocation();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();
  const hasExpert = hasAccess("expert");

  const [selectedType, setSelectedType] = useState<RecordType | "all">("all");
  const [showAddForm, setShowAddForm] = useState<RecordType | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const evidenceSummaryQuery = trpc.evidence.summary.useQuery(
    { projectId },
    { enabled: isAuthenticated && hasExpert && Number.isFinite(projectId) },
  );
  const offtakeSummaryQuery = trpc.offtake.summary.useQuery(
    { projectId },
    { enabled: isAuthenticated && hasExpert && Number.isFinite(projectId) },
  );
  const summaryQuery = trpc.community.summary.useQuery({ projectId }, { enabled: isAuthenticated && hasExpert && Number.isFinite(projectId) });
  const listQuery = trpc.community.list.useQuery(
    { projectId, recordType: selectedType === "all" ? undefined : selectedType },
    { enabled: isAuthenticated && hasExpert && Number.isFinite(projectId) },
  );
  const deleteMutation = trpc.community.delete.useMutation({
    onSuccess: () => { listQuery.refetch(); summaryQuery.refetch(); },
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
          <h1 className="text-2xl font-bold text-foreground mb-2">{tc("expertGateTitle", "Seguimiento de impacto comunitario")}</h1>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">{tc("expertGateDesc", "Registra reuniones, reclamos, contrataciones locales, inversiones comunitarias y mediciones ambientales. La IA genera un borrador de reporte de impacto para buyers y auditores.")}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 inline-block">
            <p className="text-sm text-amber-900 mb-2">{t("evidence.expertGateRequired", { defaultValue: "Se requiere plan Expert." })}</p>
            <button onClick={() => navigate("/pricing")} className="px-4 py-2 bg-amber-900 text-white text-sm rounded-lg">{t("evidence.seeExpertPlan", { defaultValue: "Ver plan Expert" })}</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const communityCount = summaryQuery.data?.totals.records ?? 0;
  const evidenceCount = evidenceSummaryQuery.data?.totals.entries ?? 0;
  const shipmentCount = offtakeSummaryQuery.data?.totalShipments ?? 0;
  const canGenerateReport = communityCount > 0;
  const prepItems = [
    {
      label: tc("prepEvidence", "Evidencia"),
      value: evidenceCount.toLocaleString(),
      hint: tc("prepEvidenceHint", "registros operativos"),
      icon: ClipboardCheck,
      accent: "text-blue-700 bg-blue-50 border-blue-200",
    },
    {
      label: tc("prepShipments", "Envios"),
      value: shipmentCount.toLocaleString(),
      hint: tc("prepShipmentsHint", "envíos trazables"),
      icon: Truck,
      accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      label: tc("prepCommunity", "Comunidad"),
      value: communityCount.toLocaleString(),
      hint: tc("prepCommunityHint", "registros comunitarios"),
      icon: Users,
      accent: "text-violet-700 bg-violet-50 border-violet-200",
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <button onClick={() => navigate(`/projects/${projectId}`)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> {tc("back", "Volver al proyecto")}
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{tc("title", "Impacto comunitario")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{tc("subtitle", "Registra reuniones, reclamos, contrataciones e impactos alrededor de la planta. Luego puedes convertir ese historial en un borrador útil para auditoría o due diligence.")}</p>
            <GuideLink anchor="como-operativo" label="Qué espera ver un buyer en comunidad" className="mt-2 inline-flex" />
          </div>
          <button
            onClick={() => {
              if (canGenerateReport) setShowReportModal(true);
              else setShowAddForm("meeting");
            }}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-card border border-indigo-300 text-indigo-700 text-sm font-medium rounded-lg hover:bg-indigo-50 sm:shrink-0"
          >
            <FileText className="w-4 h-4" /> {canGenerateReport ? tc("generateDraft", "Generar borrador con IA") : tc("loadRecordsFirst", "Cargar registros primero")}
          </button>
        </div>

        <section className={`rounded-xl border p-5 ${canGenerateReport ? "bg-card border-border" : "bg-amber-50/70 border-amber-200"}`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${canGenerateReport ? "bg-indigo-600/10 border-indigo-200 text-indigo-600" : "bg-amber-100 border-amber-200 text-amber-700"}`}>
              {canGenerateReport ? <Users className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1">
                {tc("prepEyebrow", "Estado comunitario")}
              </div>
              <h2 className="text-base font-semibold text-foreground">
                {canGenerateReport
                  ? tc("prepReadyTitle", "Ya tienes base suficiente para un borrador comunitario")
                  : tc("prepEarlyTitle", "Todavia no hay base suficiente para pedir un reporte con IA")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {canGenerateReport
                  ? tc("prepReadyBody", "El reporte con IA ya puede resumir algo real. Aun asi, conviene revisarlo como borrador y no como evidencia final automatica.")
                  : tc("prepEarlyBody", "Sin reuniones, reclamos, contrataciones o mediciones cargadas, un reporte de impacto sale ornamental. Primero conviene registrar hechos, luego resumirlos.")}
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

          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setShowAddForm("meeting")}
              className="px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-background"
            >
              {tc("addMeeting", "Agregar reunión")}
            </button>
            <button
              onClick={() => setShowAddForm("grievance")}
              className="px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-background"
            >
              {tc("addGrievance", "Agregar reclamo")}
            </button>
          </div>
        </section>

        {/* KPI cards */}
        {summaryQuery.data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label={tc("kpiMeetings", "Reuniones")} value={summaryQuery.data.totals.meetings.toLocaleString()} />
            <KpiCard
              label={tc("kpiResolution", "Resolucion de reclamos")}
              value={`${summaryQuery.data.grievances.resolutionPct}%`}
              accent={summaryQuery.data.grievances.resolutionPct >= 90 ? "green" : summaryQuery.data.grievances.resolutionPct >= 70 ? "amber" : "red"}
              hint={`${summaryQuery.data.grievances.open} abiertos / ${summaryQuery.data.grievances.resolved} cerrados`}
            />
            <KpiCard
              label={tc("kpiLocalWorkforce", "Empleo local")}
              value={`${summaryQuery.data.workforce.localPct}%`}
              accent={summaryQuery.data.workforce.localPct >= 60 ? "green" : "amber"}
              hint={`${summaryQuery.data.workforce.localHires}/${summaryQuery.data.workforce.totalHires}`}
            />
            <KpiCard
              label={tc("kpiLocalProcurement", "Compra local")}
              value={`${summaryQuery.data.procurement.localPct}%`}
              accent={summaryQuery.data.procurement.localPct >= 40 ? "green" : "amber"}
              hint={`USD ${Math.round(summaryQuery.data.procurement.localUsd).toLocaleString()} / ${Math.round(summaryQuery.data.procurement.totalUsd).toLocaleString()}`}
            />
            <KpiCard
              label={tc("kpiInvestment", "Inversion comunitaria")}
              value={`USD ${Math.round(summaryQuery.data.investment.totalUsd).toLocaleString()}`}
              hint={`${summaryQuery.data.investment.beneficiariesReached.toLocaleString()} beneficiarios`}
            />
            <KpiCard
              label={tc("kpiBiochar", "Biochar donado")}
              value={`${summaryQuery.data.benefits.tonnesBiocharDonated.toFixed(1)} t`}
            />
            <KpiCard
              label={tc("kpiEnvMeasurements", "Mediciones ambientales")}
              value={summaryQuery.data.envMonitoring.measurements.toString()}
              hint={summaryQuery.data.envMonitoring.passPct != null ? tc("hintWithinThreshold", `${summaryQuery.data.envMonitoring.passPct}% dentro de umbral`, { pct: summaryQuery.data.envMonitoring.passPct }) : "—"}
            />
            <KpiCard label={tc("kpiTotalRecords", "Total de registros")} value={summaryQuery.data.totals.records.toString()} />
          </div>
        )}

        {/* Category tiles with add buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {(Object.keys(TYPE_META) as RecordType[]).map((rt) => {
            const meta = TYPE_META[rt];
            const Icon = meta.icon;
            const count = (summaryQuery.data?.totals as any)?.[rt === "meeting" ? "meetings" : rt === "grievance" ? "grievances" : rt === "local_hire" ? "localHires" : rt === "local_procurement" ? "localProc" : rt === "community_investment" ? "investments" : rt === "benefit_share" ? "benefits" : "envMonitoring"] ?? 0;
            const isSelected = selectedType === rt;
            return (
              <div
                key={rt}
                onClick={() => setSelectedType(isSelected ? "all" : rt)}
                className={`cursor-pointer p-3 border rounded-lg transition-all ${isSelected ? "border-indigo-400 ring-2 ring-indigo-100 bg-card" : "bg-card border-border hover:border-input"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded flex items-center justify-center ${meta.bg.replace(" border-", " ")}`}>
                    <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                  </div>
                  <span className="text-xs font-medium text-foreground truncate">{tc(meta.labelKey, meta.labelFb)}</span>
                </div>
                <div className="text-xl font-bold text-foreground">{count}</div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAddForm(rt); }}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                >
                  <Plus className="w-3 h-3" /> {tc("add", "Agregar")}
                </button>
              </div>
            );
          })}
        </div>

        {/* Entries list */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            {selectedType === "all" ? tc("allRecords", "Todos los registros") : tc(TYPE_META[selectedType].labelKey, TYPE_META[selectedType].labelFb)}
            {listQuery.data && <span className="text-sm text-muted-foreground font-normal"> ({listQuery.data.length})</span>}
          </h2>
          {listQuery.isLoading ? (
            <PageLoader />
          ) : !listQuery.data || listQuery.data.length === 0 ? (
            <div className="bg-muted/40 border border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground mb-1">{tc("noRecordsTitle", "Todavia no hay registros.")}</p>
              <p className="text-xs text-muted-foreground">{tc("noRecordsHint", "Empieza con una reunión, un reclamo o una medición concreta. Lo importante aquí es registrar hechos verificables, no llenar el módulo por cumplir.")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {listQuery.data.map((r) => <RecordRow key={r.id} record={r} onDelete={() => deleteMutation.mutate({ id: r.id })} />)}
            </div>
          )}
        </section>

        {/* Footer note */}
        <div className="text-xs text-muted-foreground italic bg-muted/40 border border-border rounded-lg p-3">
          <strong>{tc("whyMatters", "Por que importa")}:</strong> {tc("whyMattersBody", "El impacto comunitario sirve cuando deja huella verificable: reuniones, respuestas, contrataciones y mediciones. El reporte con IA puede ayudar a ordenar el relato, pero la fortaleza del modulo sigue estando en los registros que cargas aqui.")}
        </div>
      </div>

      {showAddForm && (
        <AddRecordModal
          projectId={projectId}
          recordType={showAddForm}
          onClose={() => { setShowAddForm(null); listQuery.refetch(); summaryQuery.refetch(); }}
        />
      )}

      {showReportModal && (
        <ImpactReportModal
          projectId={projectId}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </AppLayout>
  );
}

function KpiCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: "green" | "amber" | "red" }) {
  const accentClass =
    accent === "green" ? "text-emerald-700" :
    accent === "amber" ? "text-amber-700" :
    accent === "red" ? "text-red-700" :
    "text-foreground";
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1 truncate">{label}</div>
      <div className={`text-2xl font-bold ${accentClass}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5 truncate">{hint}</div>}
    </div>
  );
}

function RecordRow({ record, onDelete }: { record: any; onDelete: () => void }) {
  const { t } = useTranslation("common");
  const tc = (k: string, fb: string) => t(`community.${k}`, { defaultValue: fb });
  const meta = TYPE_META[record.recordType as RecordType];
  const Icon = meta.icon;
  const summary = summarizeContent(record.recordType, record.content);

  return (
    <div className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg hover:border-input">
      <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 mt-0.5 ${meta.bg.replace(" border-", " ")}`}>
        <Icon className={`w-4 h-4 ${meta.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-sm font-medium text-foreground">{tc(meta.labelKey, meta.labelFb)}</span>
          <span className="text-xs text-muted-foreground">{new Date(record.recordDate).toLocaleDateString()}</span>
          {record.recordType === "grievance" && (
            <span className={`px-1.5 py-0.5 text-xs rounded border ${
              record.status === "resolved" || record.status === "closed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
              record.status === "in_progress" ? "bg-amber-50 text-amber-700 border-amber-200" :
              "bg-red-50 text-red-700 border-red-200"
            }`}>{record.status}</span>
          )}
        </div>
        <div className="text-xs text-foreground/90">{summary}</div>
      </div>
      <button onClick={() => { if (confirm(tc("deleteConfirm", "¿Eliminar este registro?"))) onDelete(); }}
        className="p-1.5 text-muted-foreground/70 hover:text-red-600 rounded">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function summarizeContent(recordType: string, c: any): string {
  if (!c) return "—";
  if (recordType === "meeting") return `${c.title} · ${c.attendeesCount ?? "?"} asistentes${c.location ? ` · ${c.location}` : ""}`;
  if (recordType === "grievance") return `[${c.severity}] ${c.category}: ${c.description?.slice(0, 120)}`;
  if (recordType === "local_hire") return `${c.personName} — ${c.role}${c.isFromLocalCommunity ? " (local)" : " (no local)"}`;
  if (recordType === "local_procurement") return `${c.supplierName}: USD ${c.amountUsd?.toLocaleString()}${c.category ? ` (${c.category})` : ""}${c.isFromLocalCommunity ? " — local" : ""}`;
  if (recordType === "community_investment") return `${c.category}: USD ${c.amountUsd?.toLocaleString()}${c.beneficiariesCount ? ` — ${c.beneficiariesCount} beneficiarios` : ""}`;
  if (recordType === "benefit_share") return `${c.type}: ${c.description?.slice(0, 100)}${c.tonnesBiochar ? ` (${c.tonnesBiochar}t)` : ""}`;
  if (recordType === "env_monitoring") return `${c.parameter} = ${c.value} ${c.unit}${c.passesThreshold != null ? (c.passesThreshold ? " ✓" : " ✗") : ""}`;
  return JSON.stringify(c).slice(0, 100);
}

// ─── Add record modal ────────────────────────────────────────────────────

function AddRecordModal({ projectId, recordType, onClose }: { projectId: number; recordType: RecordType; onClose: () => void }) {
  const { t } = useTranslation("common");
  const tc = (k: string, fb: string) => t(`community.${k}`, { defaultValue: fb });
  const meta = TYPE_META[recordType];
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.community.create.useMutation({
    onSuccess: () => onClose(),
    onError: (e) => setError(e.message),
  });

  const fields = getFieldsForType(recordType);

  function handleSave() {
    setError(null);
    createMutation.mutate({
      projectId,
      recordType,
      recordDateMs: new Date(recordDate).getTime(),
      content,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <meta.icon className={`w-5 h-5 ${meta.color}`} /> {tc("add", "Agregar")} {tc(meta.labelKey, meta.labelFb).toLowerCase().replace(/s$/, "")}
          </h2>
          <button onClick={onClose} className="p-1 text-muted-foreground/70 hover:text-foreground/90"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-1">{tc("modalDate", "Fecha")}</label>
            <input type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm" />
          </div>

          {fields.map((f) => (
            <FormField key={f.name} field={f} value={content[f.name]} onChange={(v) => setContent({ ...content, [f.name]: v })} />
          ))}

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start gap-2"><AlertTriangle className="w-4 h-4 mt-0.5" /><div>{error}</div></div>}
        </div>
        <div className="p-5 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-card border border-input text-foreground/90 text-sm rounded-lg hover:bg-muted/40">{tc("cancel", "Cancelar")}</button>
          <button onClick={handleSave} disabled={createMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> {createMutation.isPending ? tc("saving", "Guardando...") : tc("save", "Guardar")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Field definitions per type ──────────────────────────────────────────

type FieldDef = {
  name: string;
  label: string;
  type: "text" | "number" | "textarea" | "select" | "boolean";
  options?: string[];
  required?: boolean;
  hint?: string;
  unit?: string;
};

function getFieldsForType(rt: RecordType): FieldDef[] {
  if (rt === "meeting") return [
    { name: "title", label: "Titulo de la reunion", type: "text", required: true, hint: "ej. consulta comunitaria trimestral" },
    { name: "location", label: "Ubicacion", type: "text" },
    { name: "attendeesCount", label: "Asistentes (cantidad)", type: "number", required: true },
    { name: "attendeesNotes", label: "Asistentes (quienes — orgs, representantes)", type: "textarea" },
    { name: "agenda", label: "Agenda", type: "textarea" },
    { name: "decisions", label: "Decisiones / resultados", type: "textarea" },
    { name: "minutesRef", label: "Referencia de acta (link o ID)", type: "text" },
  ];
  if (rt === "grievance") return [
    { name: "reportedBy", label: "Reportado por", type: "text", required: true, hint: "Persona u organizacion" },
    { name: "category", label: "Categoria", type: "select", options: ["noise", "dust", "water", "traffic", "labor", "land", "other"], required: true },
    { name: "severity", label: "Severidad", type: "select", options: ["LOW", "MEDIUM", "HIGH"], required: true },
    { name: "description", label: "Descripcion", type: "textarea", required: true },
    { name: "resolution", label: "Resolucion", type: "textarea", hint: "Dejalo vacio si sigue abierto" },
    { name: "reportedToAuthority", label: "Reportado a la autoridad", type: "boolean" },
    { name: "authorityName", label: "Nombre de la autoridad", type: "text", hint: "Solo si fue reportado" },
  ];
  if (rt === "local_hire") return [
    { name: "personName", label: "Nombre de la persona", type: "text", required: true },
    { name: "role", label: "Rol / puesto", type: "text", required: true },
    { name: "homeLocation", label: "Lugar de residencia (ciudad/pueblo)", type: "text" },
    { name: "isFromLocalCommunity", label: "Pertenece a la comunidad local (20-50 km de planta)", type: "boolean" },
    { name: "trainingProvided", label: "Capacitacion / onboarding brindado", type: "textarea" },
    { name: "hourlyWageUsd", label: "Pago por hora", type: "number", unit: "USD/h" },
  ];
  if (rt === "local_procurement") return [
    { name: "supplierName", label: "Nombre del proveedor", type: "text", required: true },
    { name: "supplierLocation", label: "Ubicacion del proveedor", type: "text" },
    { name: "amountUsd", label: "Monto pagado", type: "number", required: true, unit: "USD" },
    { name: "category", label: "Categoria (materiales, servicios, etc.)", type: "text" },
    { name: "isFromLocalCommunity", label: "Es de la comunidad local", type: "boolean" },
    { name: "invoiceRef", label: "Referencia de factura", type: "text" },
  ];
  if (rt === "community_investment") return [
    { name: "category", label: "Categoria", type: "select", options: ["education", "infrastructure", "health", "environment", "social", "other"], required: true },
    { name: "amountUsd", label: "Monto invertido", type: "number", required: true, unit: "USD" },
    { name: "description", label: "Descripcion", type: "textarea", required: true },
    { name: "beneficiariesCount", label: "Beneficiarios (cantidad)", type: "number" },
    { name: "beneficiariesNotes", label: "Beneficiarios (quienes)", type: "textarea" },
    { name: "partnerOrg", label: "Organizacion socia", type: "text" },
  ];
  if (rt === "benefit_share") return [
    { name: "type", label: "Tipo", type: "select", options: ["biochar_donation", "training_program", "crop_improvement", "infrastructure_use", "other"], required: true },
    { name: "description", label: "Descripcion", type: "textarea", required: true },
    { name: "tonnesBiochar", label: "Toneladas de biochar", type: "number", unit: "t", hint: "Solo para donaciones de biochar" },
    { name: "beneficiariesCount", label: "Beneficiarios (cantidad)", type: "number" },
    { name: "beneficiariesNotes", label: "Beneficiarios (quienes)", type: "textarea" },
    { name: "measuredOutcome", label: "Resultado medido", type: "textarea", hint: "ej. '12% de mejora de rendimiento', '24 tecnicos egresados'" },
  ];
  if (rt === "env_monitoring") return [
    { name: "parameter", label: "Parametro", type: "select", options: ["air_pm10", "air_pm25", "air_no2", "air_so2", "air_co", "noise", "water_ph", "water_turbidity", "water_cod", "soil", "other"], required: true },
    { name: "measurementLocation", label: "Lugar de medicion", type: "text" },
    { name: "value", label: "Valor medido", type: "number", required: true },
    { name: "unit", label: "Unidad", type: "text", required: true, hint: "ej. µg/m³, dB, mg/L" },
    { name: "thresholdLimit", label: "Limite regulatorio", type: "number", hint: "Umbral legal para este parametro" },
    { name: "passesThreshold", label: "Cumple el umbral", type: "boolean" },
    { name: "labOrInstrument", label: "Laboratorio / instrumento usado", type: "text" },
    { name: "notes", label: "Notas", type: "textarea" },
  ];
  return [];
}

function FormField({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground/90 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
        {field.unit && <span className="text-muted-foreground/70 font-normal ml-1">({field.unit})</span>}
      </label>
      {field.type === "text" && (
        <input type="text" value={value ?? ""} onChange={(e) => onChange(e.target.value)}
          className="w-full border border-input rounded px-3 py-2 text-sm focus:border-indigo-400 outline-none" />
      )}
      {field.type === "number" && (
        <input type="number" step="any" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className="w-full border border-input rounded px-3 py-2 text-sm focus:border-indigo-400 outline-none" />
      )}
      {field.type === "textarea" && (
        <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={2}
          className="w-full border border-input rounded px-3 py-2 text-sm focus:border-indigo-400 outline-none resize-none" />
      )}
      {field.type === "select" && (
        <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}
          className="w-full border border-input rounded px-3 py-2 text-sm focus:border-indigo-400 outline-none">
          <option value="">Seleccionar...</option>
          {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
      {field.type === "boolean" && (
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          <span className="text-sm text-foreground/90">Si</span>
        </label>
      )}
      {field.hint && <p className="text-xs text-muted-foreground mt-0.5 italic">{field.hint}</p>}
    </div>
  );
}

// ─── AI Impact Report modal ──────────────────────────────────────────────

function ImpactReportModal({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const { t, i18n } = useTranslation("common");
  const tc = (k: string, fb: string, opts?: Record<string, unknown>) => t(`community.${k}`, { defaultValue: fb, ...(opts ?? {}) });
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<string | null>(null);
  const [recordsAnalyzed, setRecordsAnalyzed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateMutation = trpc.community.generateImpactReport.useMutation({
    onSuccess: (data) => {
      setReport(data.content);
      setRecordsAnalyzed(data.recordsAnalyzed);
    },
    onError: (e) => setError(e.message),
  });

  const handleGenerate = () => {
    setError(null); setReport(null); setRecordsAnalyzed(null);
    generateMutation.mutate({
      projectId,
      periodStartMs: new Date(periodStart).getTime(),
      periodEndMs: new Date(periodEnd).getTime(),
      lang: i18n.language,
    });
  };

  const handleCopy = async () => {
    if (!report) return;
    try { await navigator.clipboard.writeText(report); } catch {}
  };

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `community-impact-report_${periodStart}_${periodEnd}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-700" /> {tc("reportTitle", "Reporte comunitario asistido por IA")}
          </h2>
          <button onClick={onClose} className="p-1 text-muted-foreground/70 hover:text-foreground/90"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <p className="text-sm text-muted-foreground">{tc("reportIntro", "La IA analiza cada registro del periodo seleccionado y redacta un reporte estructurado alineado con estandares IFC Performance Standards, marco ODS y practicas de participacion comunitaria. Sirve para ordenar evidencia antes de compartirla con buyers o VVBs.")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1">{tc("reportPeriodStart", "Inicio del periodo")}</label>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full border border-input rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1">{tc("reportPeriodEnd", "Fin del periodo")}</label>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full border border-input rounded px-3 py-2 text-sm" />
            </div>
          </div>

          {!report && (
            <button onClick={handleGenerate} disabled={generateMutation.isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {generateMutation.isPending ? tc("reportGenerating", "Generando reporte...") : tc("reportGenerate", "Generar reporte")}
            </button>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" /><div>{error}</div>
            </div>
          )}

          {report && (
            <>
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {tc("reportDone", `Generado a partir de ${recordsAnalyzed} registros. Revísalo, edítalo y compártelo con tu buyer o VVB si corresponde.`, { count: recordsAnalyzed })}
              </div>
              <div className="border border-border rounded-lg p-4 bg-muted/40 text-xs text-slate-800 whitespace-pre-wrap font-mono max-h-[50vh] overflow-y-auto">
                {report}
              </div>
            </>
          )}
        </div>
        {report && (
          <div className="p-5 border-t border-border flex justify-end gap-2">
            <button onClick={handleCopy} className="px-4 py-2 bg-card border border-input text-foreground/90 text-sm rounded-lg hover:bg-muted/40">{tc("reportCopy", "Copiar")}</button>
            <button onClick={handleDownload} className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
              <Download className="w-4 h-4" /> {tc("reportDownload", "Descargar .md")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
