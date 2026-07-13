/**
 * Operational Evidence Builder — Stage 3 of the biochar journey.
 *
 * Route: /projects/:id/evidence
 *
 * For operators of RUNNING plants. They log real batch/lab/energy/shift data.
 * The backend validates against methodology thresholds and flags entries as
 * PASS / WARNING / FAIL.
 *
 * This page is the operational counterpart to the AI Builder: the AI Builder
 * drafts what the plant SHOULD do, the Evidence Builder captures what the
 * plant IS doing.
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Plus, CheckCircle2, AlertTriangle, XCircle, Clock,
  Truck, Flame, Beaker, Zap, Users, AlertCircle, X, Save, Lock,
  Sprout,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import AttachmentInput from "@/components/AttachmentInput";
import GuideLink from "@/components/GuideLink";
import PageLoader from "@/components/PageLoader";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { trpc } from "@/lib/trpc";

type DataType = "biomass_receipt" | "pyrolysis_batch" | "lab_analysis" | "energy_reading" | "shift_log" | "incident" | "soil_application_plan";

type DataTypeMeta = { labelKey: string; labelFb: string; icon: any; color: string; bgColor: string };

const DATA_TYPE_META: Record<DataType, DataTypeMeta> = {
  biomass_receipt: { labelKey: "cat_biomass_receipt", labelFb: "Recepciones de biomasa", icon: Truck, color: "text-emerald-700", bgColor: "bg-emerald-50 border-emerald-200" },
  pyrolysis_batch: { labelKey: "cat_pyrolysis_batch", labelFb: "Lotes de pirolisis", icon: Flame, color: "text-orange-700", bgColor: "bg-orange-50 border-orange-200" },
  lab_analysis: { labelKey: "cat_lab_analysis", labelFb: "Analisis de laboratorio", icon: Beaker, color: "text-indigo-700", bgColor: "bg-indigo-50 border-indigo-200" },
  energy_reading: { labelKey: "cat_energy_reading", labelFb: "Consumo energetico", icon: Zap, color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200" },
  shift_log: { labelKey: "cat_shift_log", labelFb: "Registros de turno", icon: Users, color: "text-foreground/90", bgColor: "bg-muted/40 border-border" },
  incident: { labelKey: "cat_incident", labelFb: "Incidentes", icon: AlertCircle, color: "text-red-700", bgColor: "bg-red-50 border-red-200" },
  soil_application_plan: { labelKey: "cat_soil_application_plan", labelFb: "Plan de aplicacion al suelo", icon: Sprout, color: "text-green-700", bgColor: "bg-green-50 border-green-200" },
};

export default function ProjectEvidence() {
  const { t } = useTranslation("common");
  const te = (k: string, fb: string) => t(`evidence.${k}`, { defaultValue: fb });
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, navigate] = useLocation();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();
  const hasExpert = hasAccess("expert");

  const [selectedType, setSelectedType] = useState<DataType | "all">("all");
  const [showAddForm, setShowAddForm] = useState<DataType | null>(null);

  const summaryQuery = trpc.evidence.summary.useQuery(
    { projectId },
    { enabled: isAuthenticated && hasExpert && Number.isFinite(projectId) },
  );
  const listQuery = trpc.evidence.list.useQuery(
    { projectId, dataType: selectedType === "all" ? undefined : selectedType },
    { enabled: isAuthenticated && hasExpert && Number.isFinite(projectId) },
  );
  const checklistQuery = trpc.evidence.auditChecklist.useQuery(undefined, { enabled: isAuthenticated && hasExpert });
  const deleteMutation = trpc.evidence.delete.useMutation({
    onSuccess: () => { listQuery.refetch(); summaryQuery.refetch(); },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading || tierLoading) return <PageLoader />;
  if (!isAuthenticated) return null;

  if (!Number.isFinite(projectId)) {
    return <AppLayout><div className="p-8">ID de proyecto invalido.</div></AppLayout>;
  }

  if (!hasExpert) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{te("expertGateTitle", "Constructor de evidencia operativa")}</h1>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">
            {te("expertGateDesc", "Carga datos reales de una planta en operacion: recepciones de biomasa, lotes de pirolisis, analisis de laboratorio y consumo energetico. La IA valida cada registro contra los umbrales de la metodologia y desde aqui se alimenta el paquete de auditoria.")}
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 inline-block">
            <p className="text-sm text-amber-900 mb-2">{te("expertGateRequired", "Se requiere plan Expert.")}</p>
            <button onClick={() => navigate("/pricing")} className="px-4 py-2 bg-amber-900 text-white text-sm rounded-lg">{te("seeExpertPlan", "Ver plan Expert")}</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> {te("back", "Volver al proyecto")}
        </button>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{te("title", "Evidencia operativa")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {te("subtitle", "Registra datos reales de planta. La IA los valida contra umbrales metodologicos y los convierte en insumos para tu paquete de auditoria.")}
          </p>
          <GuideLink anchor="como-operativo" label="Cómo usar el flujo operativo" className="mt-2 inline-flex" />
        </div>

        {/* Readiness + summary */}
        {summaryQuery.data && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{te("auditReadiness", "Preparacion para auditoria")}</div>
                <div className="flex items-baseline gap-3">
                  <div className="text-3xl font-bold text-foreground">{summaryQuery.data.readinessPct}%</div>
                  <div className="text-sm text-muted-foreground">
                    {summaryQuery.data.totals.pass} {te("pass", "aprobados")} · {summaryQuery.data.totals.warning} {te("warning", "advertencias")} · {summaryQuery.data.totals.fail} {te("fail", "fallas")}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                {summaryQuery.data.totals.entries} {te("totalEntries", "registros totales")}
              </div>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500" style={{ width: `${(summaryQuery.data.totals.pass / Math.max(summaryQuery.data.totals.entries, 1)) * 100}%` }} />
              <div className="h-full bg-amber-500" style={{ width: `${(summaryQuery.data.totals.warning / Math.max(summaryQuery.data.totals.entries, 1)) * 100}%` }} />
              <div className="h-full bg-red-500" style={{ width: `${(summaryQuery.data.totals.fail / Math.max(summaryQuery.data.totals.entries, 1)) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Category tiles */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {(Object.keys(DATA_TYPE_META) as DataType[]).map((dt) => {
            const meta = DATA_TYPE_META[dt];
            const Icon = meta.icon;
            const s = summaryQuery.data?.byType?.[dt];
            const total = s?.total ?? 0;
            return (
              <div
                key={dt}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedType(selectedType === dt ? "all" : dt)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" && e.key !== " ") return;
                  e.preventDefault();
                  setSelectedType(selectedType === dt ? "all" : dt);
                }}
                className={`text-left p-4 border rounded-xl transition-all ${selectedType === dt ? "border-indigo-400 ring-2 ring-indigo-100 bg-card" : "border-border bg-card hover:border-input"}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.bgColor.replace(" border-", " ")}`}>
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                  </div>
                  <div className="text-sm font-medium text-foreground">{te(meta.labelKey, meta.labelFb)}</div>
                </div>
                <div className="text-2xl font-bold text-foreground">{total}</div>
                {s && total > 0 && (
                  <div className="flex gap-1 mt-2 text-xs">
                    {s.pass > 0 && <span className="text-emerald-600">{s.pass}✓</span>}
                    {s.warning > 0 && <span className="text-amber-600">{s.warning}⚠</span>}
                    {s.fail > 0 && <span className="text-red-600">{s.fail}✗</span>}
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAddForm(dt); }}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800"
                >
                  <Plus className="w-3 h-3" /> {te("addEntry", "Agregar registro")}
                </button>
              </div>
            );
          })}
        </div>

        {/* Audit checklist (what to capture) */}
        {checklistQuery.data && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wider text-indigo-700 mb-2 font-semibold">{te("auditChecklistTitle", "Que conviene capturar para auditoria")}</div>
            <div className="space-y-1.5">
              {checklistQuery.data.map((c) => (
                <div key={c.dataType} className="text-xs text-foreground/90">
                  <span className="font-medium">{c.label}</span> · {c.cadence} · <span className="text-muted-foreground italic">{c.why}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entries list */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            {selectedType === "all" ? te("allEntries", "Todos los registros") : te(DATA_TYPE_META[selectedType].labelKey, DATA_TYPE_META[selectedType].labelFb)}
            {listQuery.data && <span className="text-sm text-muted-foreground font-normal"> ({listQuery.data.length})</span>}
          </h2>
          {listQuery.isLoading ? (
            <PageLoader />
          ) : !listQuery.data || listQuery.data.length === 0 ? (
            <div className="bg-muted/40 border border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">{te("noEntriesTitle", "Todavia no hay registros.")}</p>
              <p className="text-xs text-muted-foreground">{te("noEntriesHint", "Usa \"Agregar registro\" en cualquier categoria para empezar a documentar la operacion.")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {listQuery.data.map((e) => <EntryRow key={e.id} entry={e} onDelete={() => deleteMutation.mutate({ id: e.id })} />)}
            </div>
          )}
        </section>
      </div>

      {/* Add form modal */}
      {showAddForm && (
        <AddEntryModal
          projectId={projectId}
          dataType={showAddForm}
          onClose={() => { setShowAddForm(null); listQuery.refetch(); summaryQuery.refetch(); }}
        />
      )}
    </AppLayout>
  );
}

// ─── Entry row ────────────────────────────────────────────────────────────

function EntryRow({ entry, onDelete }: { entry: any; onDelete: () => void }) {
  const { t } = useTranslation("common");
  const te = (k: string, fb: string) => t(`evidence.${k}`, { defaultValue: fb });
  const meta = DATA_TYPE_META[entry.dataType as DataType];
  const Icon = meta.icon;
  const status = entry.validationStatus as "PASS" | "WARNING" | "FAIL" | "PENDING";
  const statusIcon = status === "PASS" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : status === "WARNING" ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : status === "FAIL" ? <XCircle className="w-4 h-4 text-red-600" /> : <Clock className="w-4 h-4 text-muted-foreground/70" />;
  const summary = summarizeContent(entry.dataType, entry.content);

  return (
    <div className="flex items-start gap-3 p-3 bg-card border border-border rounded-lg hover:border-input">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${meta.bgColor.replace(" border-", " ")}`}>
        <Icon className={`w-4 h-4 ${meta.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-medium text-foreground">{te(meta.labelKey, meta.labelFb)}</span>
          <span className="text-xs text-muted-foreground">{new Date(entry.periodStart).toLocaleString()}</span>
          <span className="inline-flex items-center gap-1 text-xs">{statusIcon} {status}</span>
        </div>
        <div className="text-xs text-foreground/90">{summary}</div>
        {entry.validationNotes && status !== "PASS" && (
          <div className={`text-xs mt-1 italic ${status === "FAIL" ? "text-red-700" : "text-amber-700"}`}>
            {entry.validationNotes}
          </div>
        )}
      </div>
      <button
        onClick={() => {
          if (confirm(te("deleteConfirm", "Eliminar este registro?"))) onDelete();
        }}
        className="p-1.5 text-muted-foreground/70 hover:text-red-600 rounded"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function summarizeContent(dataType: string, c: any): string {
  if (!c) return "—";
  if (dataType === "biomass_receipt") return `${c.supplierName}: ${c.tonnesReceived} t de ${c.biomassType}${c.moisturePct != null ? ` · ${c.moisturePct}% H2O` : ""}`;
  if (dataType === "pyrolysis_batch") return `${c.batchId}: ${c.biomassInputTonnes} t -> ${c.biocharOutputTonnes} t de biochar · ${c.peakTempC} °C durante ${c.residenceTimeMin} min`;
  if (dataType === "lab_analysis") return `${c.labName}${c.hCorgMolar != null ? ` · H/Corg=${c.hCorgMolar}` : ""}${c.organicCarbonPct != null ? ` · C=${c.organicCarbonPct}%` : ""}`;
  if (dataType === "energy_reading") return `${c.electricityKwh} kWh${c.dieselLiters ? ` + ${c.dieselLiters} L diesel` : ""}${c.naturalGasM3 ? ` + ${c.naturalGasM3} m³ GN` : ""}`;
  if (dataType === "shift_log") return `${c.shiftId}${c.operator ? ` (${c.operator})` : ""}: ${c.biocharOutputTonnes ?? 0} t producidas${c.downtimeMin ? ` · ${c.downtimeMin} min de parada` : ""}`;
  if (dataType === "incident") return `[${c.severity}] ${c.category}: ${c.description?.slice(0, 100)}`;
  if (dataType === "soil_application_plan") return `${c.planTitle} — ${c.targetCrop}, ${c.totalAreaHa} ha @ ${c.applicationRateKgPerHa} kg/ha (${c.applicationFrequency})${c.region ? ` · ${c.region}` : ""}`;
  return JSON.stringify(c).slice(0, 100);
}

// ─── Add entry modal ──────────────────────────────────────────────────────

function AddEntryModal({ projectId, dataType, onClose }: { projectId: number; dataType: DataType; onClose: () => void }) {
  const { t } = useTranslation("common");
  const te = (k: string, fb: string) => t(`evidence.${k}`, { defaultValue: fb });
  const meta = DATA_TYPE_META[dataType];
  const [periodStart, setPeriodStart] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [content, setContent] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  // After a successful create we stash the new row's id and pivot the modal
  // into "attach files" mode so the operator can drop the lab PDF / FSC cert
  // / signed remito against the record they just saved without navigating
  // away and re-opening it in edit mode.
  const [savedEntryId, setSavedEntryId] = useState<number | null>(null);
  const createMutation = trpc.evidence.create.useMutation({
    onSuccess: (result) => { setSavedEntryId(result.id); },
    onError: (e) => setError(e.message),
  });

  // Reset content on dataType change
  useEffect(() => { setContent({}); setError(null); }, [dataType]);

  const fields = getFieldsForType(dataType);

  function handleSave() {
    setError(null);
    const periodStartMs = new Date(periodStart).getTime();
    if (isNaN(periodStartMs)) { setError("Fecha invalida"); return; }
    createMutation.mutate({
      projectId,
      dataType,
      periodStartMs,
      content,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <meta.icon className={`w-5 h-5 ${meta.color}`} />
            <h2 className="text-lg font-semibold text-foreground">{te("modalAddPrefix", "Agregar")} {te(meta.labelKey, meta.labelFb).toLowerCase().replace(/s$/, "")}</h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground/70 hover:text-foreground/90 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-1.5">{te("dateTimeLabel", "Fecha y hora")}</label>
            <input
              type="datetime-local"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
            />
          </div>

          {fields.map((f) => (
            <FormField key={f.name} field={f} value={content[f.name]} onChange={(v) => setContent({ ...content, [f.name]: v })} />
          ))}

          {savedEntryId != null && (
            <div className="pt-3 mt-3 border-t border-border space-y-2">
              <div className="text-xs font-semibold text-emerald-700">
                {te("savedTitle", "✓ Registro guardado")}
              </div>
              <AttachmentInput
                relatedType="evidence"
                relatedId={savedEntryId}
                label={te("attachmentsLabel", "Archivos adjuntos (PDFs de lab, certificados, actas)")}
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
          )}
        </div>
        <div className="p-5 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-card border border-input text-foreground/90 text-sm rounded-lg hover:bg-muted/40">{savedEntryId != null ? te("close", "Cerrar") : te("cancel", "Cancelar")}</button>
          <button
            onClick={handleSave}
            disabled={createMutation.isPending || savedEntryId != null}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {savedEntryId != null ? te("saved", "Guardado") : createMutation.isPending ? te("saving", "Guardando...") : te("save", "Guardar registro")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Form field schema + renderer ────────────────────────────────────────

type FieldDef = {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "boolean";
  options?: string[];
  required?: boolean;
  unit?: string;
  hint?: string;
};

function getFieldsForType(dt: DataType): FieldDef[] {
  if (dt === "biomass_receipt") return [
    { name: "supplierName", label: "Nombre del proveedor", type: "text", required: true },
    { name: "biomassType", label: "Tipo de biomasa", type: "text", required: true, hint: "ej. aserrin de pino, chips de eucalipto" },
    { name: "tonnesReceived", label: "Toneladas recibidas", type: "number", required: true, unit: "t" },
    { name: "moisturePct", label: "Humedad", type: "number", unit: "%" },
    { name: "truckId", label: "Camion / patente", type: "text" },
    { name: "certificationRef", label: "Referencia de certificacion", type: "text", hint: "ej. FSC cert #NC-FM/COC-076703" },
    { name: "notes", label: "Notas", type: "textarea" },
  ];
  if (dt === "pyrolysis_batch") return [
    { name: "batchId", label: "ID del lote", type: "text", required: true },
    { name: "reactorId", label: "ID del reactor", type: "text", hint: "ej. PY-01" },
    { name: "biomassInputTonnes", label: "Biomasa de entrada", type: "number", required: true, unit: "t" },
    { name: "biocharOutputTonnes", label: "Biochar producido", type: "number", required: true, unit: "t" },
    { name: "peakTempC", label: "Temperatura pico", type: "number", required: true, unit: "°C" },
    { name: "avgTempC", label: "Temperatura promedio", type: "number", unit: "°C" },
    { name: "residenceTimeMin", label: "Tiempo de residencia", type: "number", required: true, unit: "min" },
    { name: "sustainedTimeAboveThresholdMin", label: "Tiempo sostenido >500 °C", type: "number", unit: "min", hint: "Clave para el cumplimiento metodologico" },
    { name: "syngasFlareEfficiencyPct", label: "Eficiencia de antorcha", type: "number", unit: "%" },
    { name: "energyKwh", label: "Energia consumida", type: "number", unit: "kWh" },
    { name: "naturalGasM3", label: "Gas natural", type: "number", unit: "m³" },
    { name: "notes", label: "Notas", type: "textarea" },
  ];
  if (dt === "lab_analysis") return [
    { name: "batchRef", label: "Referencia de lote", type: "text" },
    { name: "labName", label: "Nombre del laboratorio", type: "text", required: true },
    { name: "accreditation", label: "Acreditacion", type: "text", hint: "ej. ISO 17025 #123" },
    { name: "hCorgMolar", label: "Relacion molar H/Corg", type: "number", hint: "Objetivo: <0.4 para tier 1000 anos; <0.7 como umbral" },
    { name: "organicCarbonPct", label: "Carbono organico", type: "number", unit: "%" },
    { name: "fixedCarbonPct", label: "Carbono fijo", type: "number", unit: "%" },
    { name: "ashPct", label: "Contenido de cenizas", type: "number", unit: "%" },
    { name: "pH", label: "pH", type: "number" },
    { name: "moisturePct", label: "Humedad", type: "number", unit: "%" },
    { name: "betM2G", label: "Superficie BET", type: "number", unit: "m²/g" },
    { name: "notes", label: "Notas", type: "textarea" },
  ];
  if (dt === "energy_reading") return [
    { name: "meterId", label: "ID del medidor", type: "text" },
    { name: "electricityKwh", label: "Electricidad", type: "number", required: true, unit: "kWh" },
    { name: "naturalGasM3", label: "Gas natural", type: "number", unit: "m³" },
    { name: "dieselLiters", label: "Diesel", type: "number", unit: "L" },
    { name: "lpgKg", label: "LPG", type: "number", unit: "kg" },
    { name: "notes", label: "Notas", type: "textarea" },
  ];
  if (dt === "shift_log") return [
    { name: "shiftId", label: "ID del turno", type: "text", required: true, hint: "ej. turno dia 2026-04-23" },
    { name: "operator", label: "Operador", type: "text" },
    { name: "biomassInputTonnes", label: "Biomasa procesada", type: "number", unit: "t" },
    { name: "biocharOutputTonnes", label: "Biochar producido", type: "number", unit: "t" },
    { name: "downtimeMin", label: "Tiempo de parada", type: "number", unit: "min" },
    { name: "qualityNotes", label: "Notas de calidad", type: "textarea" },
    { name: "incidents", label: "Incidentes durante el turno", type: "textarea" },
  ];
  if (dt === "incident") return [
    { name: "category", label: "Categoria", type: "select", options: ["safety", "environmental", "operational", "community", "other"], required: true },
    { name: "severity", label: "Severidad", type: "select", options: ["LOW", "MEDIUM", "HIGH"], required: true },
    { name: "description", label: "Descripcion", type: "textarea", required: true },
    { name: "resolution", label: "Resolucion", type: "textarea" },
    { name: "reportedToAuthority", label: "Reportado a la autoridad", type: "boolean" },
    { name: "authorityName", label: "Nombre de la autoridad", type: "text", hint: "Solo si fue reportado" },
  ];
  if (dt === "soil_application_plan") return [
    { name: "planTitle", label: "Titulo del plan", type: "text", required: true, hint: "ej. plan de aplicacion 2026 — vinedo en Mendoza" },
    { name: "targetCrop", label: "Cultivo / uso objetivo", type: "text", required: true, hint: "vinedo, olivo, horticultura, pastura, viticultura..." },
    { name: "totalAreaHa", label: "Area total", type: "number", required: true, unit: "ha" },
    { name: "applicationRateKgPerHa", label: "Dosis de aplicacion", type: "number", required: true, unit: "kg/ha", hint: "Biochar tipico: 5.000-20.000 kg/ha" },
    { name: "applicationFrequency", label: "Frecuencia de aplicacion", type: "select", options: ["one_time", "annual", "biannual", "every_3_years", "every_5_years", "other"], required: true },
    { name: "startDate", label: "Fecha de inicio prevista", type: "text", hint: "AAAA-MM-DD" },
    { name: "endDate", label: "Fecha prevista de cierre", type: "text", hint: "AAAA-MM-DD — idealmente >=10 anos de permanencia" },
    { name: "region", label: "Region / ubicacion", type: "text", hint: "Provincia, distrito o campo especifico" },
    { name: "endUserOrPartner", label: "Usuario final / socio", type: "text", hint: "Campo propio, cooperativa agricola, socio agronegocio..." },
    { name: "agronomyJustification", label: "Justificacion agronomica", type: "textarea", hint: "Por que este cultivo, esta dosis y esta region: suelo, clima y referencia tecnica" },
    { name: "monitoringPlan", label: "Plan de monitoreo", type: "textarea", hint: "Como verificaras que la aplicacion ocurre segun lo previsto: muestreo, fotos, confirmacion del usuario final, etc." },
    { name: "attachmentRef", label: "Referencia de adjunto", type: "text", hint: "Link o nombre del PDF firmado" },
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
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-input rounded px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none"
        />
      )}
      {field.type === "number" && (
        <input
          type="number"
          step="any"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
          className="w-full border border-input rounded px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none"
        />
      )}
      {field.type === "textarea" && (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="w-full border border-input rounded px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none resize-none"
        />
      )}
      {field.type === "select" && (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-input rounded px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none"
        >
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
