/**
 * Offtake Tracker — Stage 3, module 2.
 *
 * Route: /projects/:id/offtake (Expert tier only).
 *
 * Operator side. Log each biochar shipment leaving the plant, then share a
 * confirmation link/QR with the end-user. The end-user opens /confirm/:token
 * (public, no auth) and submits their application details. That confirmation
 * is the audit evidence corporate buyers demand.
 */

import { useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft, Plus, Truck, CheckCircle2, Clock, AlertTriangle, X,
  Save, Copy, Check, QrCode, Trash2, RefreshCw, MapPin, Lock,
  MessageCircle, Mail, ClipboardCheck, Users,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import GuideLink from "@/components/GuideLink";
import PageLoader from "@/components/PageLoader";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { trpc } from "@/lib/trpc";

// i18n keys for end-use categories live under common.offtake.endUse_*
const END_USE_KEYS: Record<string, { key: string; fb: string }> = {
  agricultural_soil: { key: "endUse_agricultural_soil", fb: "Enmienda agricola de suelo" },
  horticulture: { key: "endUse_horticulture", fb: "Horticultura" },
  cement_substitute: { key: "endUse_cement_substitute", fb: "Sustituto en cemento" },
  construction_filler: { key: "endUse_construction_filler", fb: "Relleno para construccion" },
  water_filtration: { key: "endUse_water_filtration", fb: "Filtracion de agua" },
  livestock_feed: { key: "endUse_livestock_feed", fb: "Alimentacion animal" },
  other: { key: "endUse_other", fb: "Otro" },
};

const STATUS_META: Record<string, { key: string; fb: string; color: string }> = {
  draft: { key: "status_draft", fb: "Borrador", color: "bg-muted text-foreground/90 border-border" },
  dispatched: { key: "status_dispatched", fb: "Despachado", color: "bg-blue-50 text-blue-700 border-blue-200" },
  in_transit: { key: "status_in_transit", fb: "En transito", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  delivered: { key: "status_delivered", fb: "Entregado", color: "bg-amber-50 text-amber-700 border-amber-200" },
  applied: { key: "status_applied", fb: "Aplicado ✓", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { key: "status_rejected", fb: "Rechazado", color: "bg-red-50 text-red-700 border-red-200" },
  lost: { key: "status_lost", fb: "Perdido", color: "bg-red-50 text-red-700 border-red-200" },
};

export default function ProjectOfftake() {
  const { t } = useTranslation("common");
  const to = (k: string, fb: string) => t(`offtake.${k}`, { defaultValue: fb });
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const [, navigate] = useLocation();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();
  const hasExpert = hasAccess("expert");

  const [showAddForm, setShowAddForm] = useState(false);
  const [linkCopied, setLinkCopied] = useState<string | null>(null);
  const [showQrForShipment, setShowQrForShipment] = useState<number | null>(null);

  const evidenceSummaryQuery = trpc.evidence.summary.useQuery(
    { projectId },
    { enabled: isAuthenticated && hasExpert && Number.isFinite(projectId) },
  );
  const communitySummaryQuery = trpc.community.summary.useQuery(
    { projectId },
    { enabled: isAuthenticated && hasExpert && Number.isFinite(projectId) },
  );
  const summaryQuery = trpc.offtake.summary.useQuery({ projectId }, { enabled: isAuthenticated && hasExpert && Number.isFinite(projectId) });
  const listQuery = trpc.offtake.list.useQuery({ projectId }, { enabled: isAuthenticated && hasExpert && Number.isFinite(projectId) });
  const deleteMutation = trpc.offtake.delete.useMutation({
    onSuccess: () => { listQuery.refetch(); summaryQuery.refetch(); },
  });
  const regenMutation = trpc.offtake.regenerateToken.useMutation({
    onSuccess: () => listQuery.refetch(),
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
          <h1 className="text-2xl font-bold text-foreground mb-2">{to("expertGateTitle", "Trazabilidad de envios")}</h1>
          <p className="text-sm text-muted-foreground mb-6 max-w-xl mx-auto">{to("expertGateDesc", "Registra cada envio de biochar que sale de planta, comparte un enlace de confirmacion con el usuario final y construye la cadena de custodia que piden buyers corporativos y auditores.")}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 inline-block">
            <p className="text-sm text-amber-900 mb-2">{t("evidence.expertGateRequired", { defaultValue: "Se requiere plan Expert." })}</p>
            <button onClick={() => navigate("/pricing")} className="px-4 py-2 bg-amber-900 text-white text-sm rounded-lg">{t("evidence.seeExpertPlan", { defaultValue: "Ver plan Expert" })}</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const baseUrl = typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "";
  const shipmentLink = (token: string) => `${baseUrl}/confirm/${token}`;
  const handleCopyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(shipmentLink(token));
      setLinkCopied(token);
      setTimeout(() => setLinkCopied(null), 2000);
    } catch {}
  };

  const shipment = showQrForShipment ? listQuery.data?.find(s => s.id === showQrForShipment) : null;
  const evidenceCount = evidenceSummaryQuery.data?.totals.entries ?? 0;
  const soilPlanCount = evidenceSummaryQuery.data?.byType?.soil_application_plan?.total ?? 0;
  const shipmentCount = summaryQuery.data?.totalShipments ?? listQuery.data?.length ?? 0;
  const communityCount = communitySummaryQuery.data?.totals.records ?? 0;
  const hasOperationalContext = evidenceCount > 0 || shipmentCount > 0 || communityCount > 0 || soilPlanCount > 0;
  const prepItems = [
    {
      label: to("prepEvidence", "Evidencia"),
      value: evidenceCount.toLocaleString(),
      hint: to("prepEvidenceHint", "registros operativos"),
      icon: ClipboardCheck,
      accent: "text-blue-700 bg-blue-50 border-blue-200",
    },
    {
      label: to("prepShipments", "Envíos"),
      value: shipmentCount.toLocaleString(),
      hint: to("prepShipmentsHint", "trazabilidad iniciada"),
      icon: Truck,
      accent: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    {
      label: to("prepCommunity", "Comunidad"),
      value: communityCount.toLocaleString(),
      hint: to("prepCommunityHint", "registros sociales"),
      icon: Users,
      accent: "text-violet-700 bg-violet-50 border-violet-200",
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <button onClick={() => navigate(`/projects/${projectId}`)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> {to("back", "Volver al proyecto")}
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{to("title", "Trazabilidad de envios")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{to("subtitle", "Registra qué sale de planta, a dónde va y quién confirma la recepción. Así conviertes cada envío en trazabilidad verificable, no solo en narrativa comercial.")}</p>
            <GuideLink anchor="como-operativo" label="Cómo ordenar evidencia, offtake y auditoría" className="mt-2 inline-flex" />
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 sm:shrink-0"
          >
            <Plus className="w-4 h-4" /> {shipmentCount > 0 ? to("newShipment", "Nuevo envío") : to("firstShipment", "Registrar primer envío")}
          </button>
        </div>

        <section className={`rounded-xl border p-5 ${hasOperationalContext ? "bg-card border-border" : "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50"}`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${hasOperationalContext ? "bg-indigo-600/10 border-indigo-200 text-indigo-600" : "bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700/60 text-amber-700 dark:text-amber-300"}`}>
              {hasOperationalContext ? <Truck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-[10px] font-bold uppercase tracking-[0.18em] mb-1 ${hasOperationalContext ? "text-muted-foreground" : "text-amber-700 dark:text-amber-300"}`}>
                {to("prepEyebrow", "Estado de trazabilidad")}
              </div>
              <h2 className={`text-base font-semibold ${hasOperationalContext ? "text-foreground" : "text-amber-900 dark:text-amber-100"}`}>
                {shipmentCount > 0
                  ? to("prepActiveTitle", "La trazabilidad ya está en marcha")
                  : hasOperationalContext
                    ? to("prepReadyTitle", "Ya tienes base operativa para empezar offtake")
                    : to("prepEarlyTitle", "Este módulo todavía arranca casi desde cero")}
              </h2>
              <p className={`text-sm mt-1 ${hasOperationalContext ? "text-muted-foreground" : "text-amber-800 dark:text-amber-200"}`}>
                {shipmentCount > 0
                  ? to("prepActiveBody", "Buen momento para seguir ordenando confirmaciones, estados y destinos finales. Lo importante ahora es que cada envío cierre con evidencia de recepción o aplicación.")
                  : hasOperationalContext
                    ? to("prepReadyBody", "Ya hay algo de operación cargada. El siguiente paso natural es registrar el primer envío para que la trazabilidad no quede desconectada del proyecto.")
                    : to("prepEarlyBody", "Puedes registrar el primer envío aquí mismo, pero conviene acompañarlo pronto con evidencia operativa y plan de aplicación para que el trail tenga contexto real.")}
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
            <Link href={`/projects/${projectId}/evidence`}>
              <button className="px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-background">
                {to("goEvidence", "Revisar evidencia")}
              </button>
            </Link>
            <Link href={`/projects/${projectId}/community`}>
              <button className="px-3 py-2 rounded-lg bg-card border border-border text-sm font-medium text-foreground hover:bg-background">
                {to("goCommunity", "Revisar comunidad")}
              </button>
            </Link>
          </div>
        </section>

        {/* Summary KPIs */}
        {summaryQuery.data && (
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <KpiCard label={to("kpiShipments", "Envios totales")} value={summaryQuery.data.totalShipments.toLocaleString()} />
              <KpiCard label={to("kpiShipped", "Toneladas enviadas")} value={`${summaryQuery.data.totalTonnesShipped.toFixed(1)} t`} />
              <KpiCard label={to("kpiApplied", "Toneladas con aplicacion confirmada")} value={`${summaryQuery.data.totalTonnesApplied.toFixed(1)} t`} />
              <KpiCard label={to("kpiTraceability", "Trazabilidad")} value={`${summaryQuery.data.traceabilityPct}%`} accent />
            </div>
            <div className="text-xs text-muted-foreground mb-2">{to("shipmentsByStatus", "Envios por estado")}</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(summaryQuery.data.byStatus).map(([s, n]) => (
                <span key={s} className={`px-2 py-0.5 text-xs rounded border ${STATUS_META[s]?.color ?? ""}`}>
                  {STATUS_META[s] ? to(STATUS_META[s].key, STATUS_META[s].fb) : s}: {n as number}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Shipments list */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">{to("shipmentsTitle", "Envios")} {listQuery.data && <span className="text-sm text-muted-foreground font-normal">({listQuery.data.length})</span>}</h2>
          {listQuery.isLoading ? (
            <PageLoader />
          ) : !listQuery.data || listQuery.data.length === 0 ? (
            <div className="bg-muted/40 border border-border rounded-lg p-8 text-center">
              <Truck className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-2">{to("noShipmentsTitle", "Todavia no hay envios.")}</p>
              <p className="text-xs text-muted-foreground">{to("noShipmentsHint", "Empieza registrando el primer envío real. Después podrás compartir confirmación, destino y uso final para cerrar la trazabilidad.")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {listQuery.data.map((s) => (
                <div key={s.id} className="bg-card border border-border rounded-lg p-4 hover:border-input">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5 text-indigo-700" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold text-sm text-foreground">{s.shipmentCode}</span>
                          <span className={`px-1.5 py-0.5 text-xs rounded border ${STATUS_META[s.status]?.color ?? ""}`}>
                            {STATUS_META[s.status] ? to(STATUS_META[s.status].key, STATUS_META[s.status].fb) : s.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(s.shipmentDate).toLocaleDateString()} · {s.tonnes.toFixed(1)} t · {s.endUseCategory && END_USE_KEYS[s.endUseCategory] ? to(END_USE_KEYS[s.endUseCategory].key, END_USE_KEYS[s.endUseCategory].fb) : "—"}
                        </div>
                        {s.destinationName && (
                          <div className="text-xs text-foreground/90 mt-1">
                            → {s.destinationName}
                            {s.destinationCountry && ` · ${s.destinationCountry}`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setShowQrForShipment(s.id)}
                        className="p-2 text-muted-foreground/70 hover:text-indigo-700 rounded"
                        title="Mostrar QR / link de confirmacion"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCopyLink(s.confirmationToken)}
                        className="p-2 text-muted-foreground/70 hover:text-foreground/90 rounded"
                        title="Copiar link de confirmacion"
                      >
                        {linkCopied === s.confirmationToken ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(to("deleteConfirm", "Eliminar este envio? El enlace de confirmacion dejara de funcionar."))) {
                            deleteMutation.mutate({ id: s.id });
                          }
                        }}
                        className="p-2 text-muted-foreground/70 hover:text-red-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {s.status === "applied" && s.confirmedByName && (
                    <div className="mt-3 pt-3 border-t border-border/60 bg-emerald-50/30 -mx-4 -mb-4 px-4 py-2 rounded-b-lg">
                      <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {to("confirmedByLabel", "Confirmado por el usuario final")}
                      </div>
                      <div className="text-xs text-foreground/90 space-y-0.5">
                        <div>{s.confirmedByName}{s.confirmedByEmail && ` · ${s.confirmedByEmail}`}</div>
                        <div>
                          {s.confirmedTonnesApplied?.toFixed(1)} t aplicadas
                          {s.confirmedApplicationDate && ` · ${new Date(s.confirmedApplicationDate).toLocaleDateString()}`}
                          {s.confirmedApplicationType && ` · ${s.confirmedApplicationType}`}
                          {s.confirmedCropOrUseType && ` · ${s.confirmedCropOrUseType}`}
                        </div>
                        {(s.confirmedLat != null && s.confirmedLon != null) && (
                          <div className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {s.confirmedLat.toFixed(4)}, {s.confirmedLon.toFixed(4)}
                          </div>
                        )}
                        {s.confirmedNotes && <div className="italic text-muted-foreground mt-1">{s.confirmedNotes}</div>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="text-xs text-muted-foreground italic bg-muted/40 border border-border rounded-lg p-3">
          <strong>{to("whyMatters", "Por qué importa")}:</strong> {to("whyMattersBody", "La trazabilidad de offtake no reemplaza la operación real, pero sí la vuelve defendible. Si un buyer o auditor pregunta qué pasó con cada tonelada, este módulo debería permitir responder con fechas, destino y confirmación, no solo con promesas.")}
        </div>
      </div>

      {/* New shipment modal */}
      {showAddForm && (
        <NewShipmentModal
          projectId={projectId}
          onClose={() => { setShowAddForm(false); listQuery.refetch(); summaryQuery.refetch(); }}
        />
      )}

      {/* QR / link share modal */}
      {shipment && (
        <QrShareModal
          shipment={shipment}
          link={shipmentLink(shipment.confirmationToken)}
          onClose={() => setShowQrForShipment(null)}
          onRegenerate={() => {
            if (confirm(to("qrRegenConfirm", "¿Regenerar el link de confirmacion? El anterior dejara de funcionar. Úsalo si compartiste el link equivocado."))) {
              regenMutation.mutate({ id: shipment.id }, {
                onSuccess: () => {
                  listQuery.refetch();
                  setShowQrForShipment(null);
                },
              });
            }
          }}
        />
      )}
    </AppLayout>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`${accent ? "bg-indigo-50 border-indigo-200" : "bg-muted/40 border-border"} border rounded-lg p-3`}>
      <div className={`text-xs uppercase tracking-wider mb-1 ${accent ? "text-indigo-700" : "text-muted-foreground"}`}>{label}</div>
      <div className={`text-2xl font-bold ${accent ? "text-indigo-900" : "text-foreground"}`}>{value}</div>
    </div>
  );
}

// ─── New shipment modal ──────────────────────────────────────────────────

function NewShipmentModal({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const { t } = useTranslation("common");
  const toModal = (k: string, fb: string) => t(`offtake.${k}`, { defaultValue: fb });
  const [shipmentDate, setShipmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tonnes, setTonnes] = useState<number>(10);
  const [endUseCategory, setEndUseCategory] = useState<string>("agricultural_soil");
  const [destinationName, setDestinationName] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [carrierName, setCarrierName] = useState("");
  const [carrierVehicle, setCarrierVehicle] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"draft" | "dispatched" | "in_transit" | "delivered">("dispatched");
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.offtake.create.useMutation({
    onSuccess: () => onClose(),
    onError: (e) => setError(e.message),
  });

  function handleSave() {
    setError(null);
    if (!destinationName.trim()) {
      setError(toModal("modalErrDestReq", "El nombre del destino es obligatorio para el trail de auditoría."));
      return;
    }
    if (!(tonnes > 0)) {
      setError(toModal("modalErrTonnes", "Las toneladas deben ser > 0."));
      return;
    }
    createMutation.mutate({
      projectId,
      shipmentDateMs: new Date(shipmentDate).getTime(),
      tonnes,
      endUseCategory: endUseCategory as any,
      destinationName: destinationName.trim(),
      destinationAddress: destinationAddress.trim() || undefined,
      destinationCountry: destinationCountry.trim() || undefined,
      carrierName: carrierName.trim() || undefined,
      carrierVehicle: carrierVehicle.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-700" /> {toModal("modalTitle", "Nuevo envío")}
          </h2>
          <button onClick={onClose} className="p-1 text-muted-foreground/70 hover:text-foreground/90"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1">{toModal("modalShipmentDate", "Fecha de envío")}</label>
              <input type="date" value={shipmentDate} onChange={(e) => setShipmentDate(e.target.value)}
                className="w-full border border-input rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1">{toModal("modalTonnes", "Toneladas enviadas")}</label>
              <input type="number" step="0.1" value={tonnes} onChange={(e) => setTonnes(Number(e.target.value))}
                className="w-full border border-input rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-1">{toModal("modalEndUse", "Categoría de uso final")}</label>
            <select value={endUseCategory} onChange={(e) => setEndUseCategory(e.target.value)}
              className="w-full border border-input rounded px-3 py-2 text-sm">
              {Object.entries(END_USE_KEYS).map(([k, v]) => <option key={k} value={k}>{toModal(v.key, v.fb)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-1">{toModal("modalDestName", "Nombre del destino")} <span className="text-red-500">*</span></label>
            <input type="text" value={destinationName} onChange={(e) => setDestinationName(e.target.value)}
              placeholder="ej. Finca Los Álamos, planta Holcim Villa Pampa"
              className="w-full border border-input rounded px-3 py-2 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1">{toModal("modalAddress", "Dirección")}</label>
              <input type="text" value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)}
                className="w-full border border-input rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1">{toModal("modalCountry", "País")}</label>
              <input type="text" value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)}
                placeholder="ej. Argentina"
                className="w-full border border-input rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1">{toModal("modalCarrier", "Transportista")}</label>
              <input type="text" value={carrierName} onChange={(e) => setCarrierName(e.target.value)}
                placeholder="ej. Transportes Dos Santos"
                className="w-full border border-input rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-1">{toModal("modalVehicle", "Vehículo / patente")}</label>
              <input type="text" value={carrierVehicle} onChange={(e) => setCarrierVehicle(e.target.value)}
                className="w-full border border-input rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-1">{toModal("modalStatus", "Estado")}</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)}
              className="w-full border border-input rounded px-3 py-2 text-sm">
              <option value="draft">{toModal("status_draft", "Borrador")} ({toModal("draftHint", "todavía no salió")})</option>
              <option value="dispatched">{toModal("status_dispatched", "Despachado")}</option>
              <option value="in_transit">{toModal("status_in_transit", "En tránsito")}</option>
              <option value="delivered">{toModal("status_delivered", "Entregado")} ({toModal("deliveredHint", "esperando confirmación final")})</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-1">{toModal("modalNotes", "Notas internas")}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full border border-input rounded px-3 py-2 text-sm resize-none" />
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>}
        </div>
        <div className="p-5 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-card border border-input text-foreground/90 text-sm rounded-lg hover:bg-muted/40">{toModal("cancel", "Cancelar")}</button>
          <button onClick={handleSave} disabled={createMutation.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            <Save className="w-4 h-4" /> {createMutation.isPending ? toModal("modalCreating", "Creando...") : toModal("modalCreate", "Crear envío + generar link")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── QR / share modal ────────────────────────────────────────────────────

function QrShareModal({
  shipment, link, onClose, onRegenerate,
}: { shipment: any; link: string; onClose: () => void; onRegenerate: () => void }) {
  const { t } = useTranslation("common");
  const ts = (k: string, fb: string) => t(`offtake.${k}`, { defaultValue: fb });

  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  // Pre-composed share messages. No backend mail service required — opens
  // the user's native WhatsApp / email client with the message pre-filled.
  // Works on mobile + desktop and keeps us compliant (user sends from their
  // own identity, not ours).
  const shareMessage = ts(
    "shareMessage",
    "Hola. El envio de biochar {{code}} fue despachado hacia usted. Por favor confirme la recepcion y los detalles de aplicacion en este enlace: {{link}}. Gracias.",
  )
    .replace("{{code}}", shipment.shipmentCode)
    .replace("{{link}}", link);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
  const emailSubject = ts("shareEmailSubject", "Confirmacion de envio de biochar — {{code}}").replace("{{code}}", shipment.shipmentCode);
  const emailUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(shareMessage)}`;

  // Generate a QR code via Google Chart API — free, no dependencies, works for reasonable length URLs
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-xl shadow-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <QrCode className="w-5 h-5" /> {ts("qrModalTitle", "Link de confirmación")}
          </h2>
          <button onClick={onClose} className="p-1 text-muted-foreground/70 hover:text-foreground/90"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-sm text-foreground/90">
            <div className="font-mono text-xs mb-1">{shipment.shipmentCode}</div>
            <div className="text-xs text-muted-foreground">{ts("qrModalHint", "Comparte este link o QR con el end-user para que confirme la recepción.")}</div>
          </div>

          <div className="flex justify-center">
            <img src={qrUrl} alt="QR code" className="w-56 h-56 border border-border rounded" />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{ts("qrShareableLink", "Link para compartir")}</label>
            <div className="flex gap-2">
              <input type="text" value={link} readOnly
                className="flex-1 border border-input rounded px-2 py-1.5 text-xs font-mono text-foreground/90 bg-muted/40" />
              <button onClick={handleCopy}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Share via WhatsApp / Email — opens native client with message pre-filled */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{ts("shareWithEndUser", "Compartir con el usuario final")}</label>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded"
              >
                <MessageCircle className="w-3.5 h-3.5" /> {ts("shareWhatsapp", "WhatsApp")}
              </a>
              <a
                href={emailUrl}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded"
              >
                <Mail className="w-3.5 h-3.5" /> {ts("shareEmail", "Email")}
              </a>
            </div>
          </div>

          <div className="text-xs text-muted-foreground italic bg-muted/40 border border-border rounded p-2">
            {ts("shareHelp", "Compártelo por WhatsApp o email, pega el link o imprime el QR en el remito. El usuario final hace click o escanea, carga los detalles de aplicación y esa confirmación pasa a ser evidencia auditable.")}
          </div>

          <button onClick={onRegenerate}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-card border border-input text-foreground/90 text-sm rounded hover:bg-muted/40">
            <RefreshCw className="w-3.5 h-3.5" /> {ts("regenerateLink", "Regenerar link (invalida el anterior)")}
          </button>
        </div>
      </div>
    </div>
  );
}
