/**
 * Public biochar shipment confirmation page.
 *
 * Route: /confirm/:token (public — no auth required).
 *
 * The end-user (farmer, cement plant, horticulture co-op) opens this link
 * from the QR or email the operator sent. They see the shipment details,
 * fill in their side (name, tonnes applied, application date, crop, GPS if
 * they choose to share), and submit. Status flips from "delivered" to
 * "applied" and the confirmation becomes audit evidence.
 *
 * Intentionally minimal — the end-user isn't a paying user and may be on a
 * phone with poor connectivity. No app chrome, no sidebar, direct form.
 */

import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Leaf, CheckCircle2, AlertTriangle, Loader2, MapPin, Send, Flame,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const END_USE_KEYS: Record<string, { key: string; fb: string }> = {
  agricultural_soil: { key: "endUse_agricultural_soil", fb: "Enmienda agricola de suelo" },
  horticulture: { key: "endUse_horticulture", fb: "Horticultura" },
  cement_substitute: { key: "endUse_cement_substitute", fb: "Sustituto en cemento" },
  construction_filler: { key: "endUse_construction_filler", fb: "Relleno para construccion" },
  water_filtration: { key: "endUse_water_filtration", fb: "Filtracion de agua" },
  livestock_feed: { key: "endUse_livestock_feed", fb: "Alimentacion animal" },
  other: { key: "endUse_other", fb: "Otro" },
};

export default function ConfirmShipment() {
  const { t } = useTranslation("common");
  const tc = (k: string, fb: string, opts?: Record<string, unknown>) => t(`confirmShipment.${k}`, { defaultValue: fb, ...(opts ?? {}) });
  const toOff = (k: string, fb: string) => t(`offtake.${k}`, { defaultValue: fb });
  const params = useParams<{ token: string }>();
  const token = params.token ?? "";

  const shipmentQuery = trpc.offtake.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false },
  );
  const confirmMutation = trpc.offtake.confirmByToken.useMutation();

  const [confirmedByName, setConfirmedByName] = useState("");
  const [confirmedByEmail, setConfirmedByEmail] = useState("");
  const [tonnesApplied, setTonnesApplied] = useState<number | "">("");
  const [applicationDate, setApplicationDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [applicationType, setApplicationType] = useState("");
  const [cropOrUseType, setCropOrUseType] = useState("");
  const [applicationLat, setApplicationLat] = useState<number | undefined>(undefined);
  const [applicationLon, setApplicationLon] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Pre-fill tonnes with the shipment amount as a reasonable default
  useEffect(() => {
    if (shipmentQuery.data && tonnesApplied === "") {
      setTonnesApplied(shipmentQuery.data.tonnes);
    }
  }, [shipmentQuery.data, tonnesApplied]);

  const handleGeoFill = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError(tc("errGeoUnsupported", "Tu navegador no soporta geolocalizacion. Puedes omitir este paso."));
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setApplicationLat(pos.coords.latitude);
        setApplicationLon(pos.coords.longitude);
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(tc("errGeoFailed", `No pudimos obtener la ubicacion: ${err.message}. Este campo es opcional.`));
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const handleSubmit = () => {
    setFormError(null);
    if (!confirmedByName.trim()) { setFormError(tc("errName", "Ingresa tu nombre u organizacion.")); return; }
    if (!(typeof tonnesApplied === "number") || tonnesApplied <= 0) { setFormError(tc("errTonnes", "Ingresa las toneladas aplicadas. Deben ser mayores a 0.")); return; }
    confirmMutation.mutate({
      token,
      confirmedByName: confirmedByName.trim(),
      confirmedByEmail: confirmedByEmail.trim() || undefined,
      tonnesApplied,
      applicationDateMs: new Date(applicationDate).getTime(),
      applicationType: applicationType.trim() || undefined,
      cropOrUseType: cropOrUseType.trim() || undefined,
      applicationLat,
      applicationLon,
      notes: notes.trim() || undefined,
    });
  };

  // Loading / error / not-found states
  if (shipmentQuery.isLoading) {
    return (
      <MinimalShell>
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      </MinimalShell>
    );
  }
  if (shipmentQuery.isError || !shipmentQuery.data) {
    return (
      <MinimalShell>
        <div className="text-center py-8">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-slate-900 mb-1">{tc("linkInvalidTitle", "Enlace no válido")}</h1>
          <p className="text-sm text-slate-600">{tc("linkInvalidBody", "El enlace de confirmación no coincide con un envío activo. Pídele al operador un enlace nuevo.")}</p>
        </div>
      </MinimalShell>
    );
  }

  const shipment = shipmentQuery.data;

  // Already confirmed
  if (shipment.alreadyConfirmed) {
    return (
      <MinimalShell headerLabel={tc("headerLabel", "Confirmación de envío de biochar")} footer={tc("footer", "Gestionado con BiocharPro · Tus datos se comparten solo con el operador que envió el biochar.")}>
        <div className="text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-slate-900 mb-1">{tc("alreadyConfirmedTitle", "Envio ya confirmado")}</h1>
          <p className="text-sm text-slate-600 mb-3">
            {tc("alreadyConfirmedBody", `El envio ${shipment.shipmentCode} fue confirmado el ${shipment.confirmedAt ? new Date(shipment.confirmedAt).toLocaleDateString() : "—"}${shipment.confirmedByName ? ` por ${shipment.confirmedByName}` : ""}.`, {
              code: shipment.shipmentCode,
              date: shipment.confirmedAt ? new Date(shipment.confirmedAt).toLocaleDateString() : "—",
              by: shipment.confirmedByName ? ` — ${shipment.confirmedByName}` : "",
            })}
          </p>
          <p className="text-xs text-slate-500">{tc("alreadyConfirmedHint", "Si no fuiste tu, contacta al operador.")}</p>
        </div>
      </MinimalShell>
    );
  }

  // Confirmed just now — success state
  if (confirmMutation.isSuccess) {
    return (
      <MinimalShell headerLabel={tc("headerLabel", "Confirmación de envío de biochar")} footer={tc("footer", "Gestionado con BiocharPro · Tus datos se comparten solo con el operador que envió el biochar.")}>
        <div className="text-center py-8">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3" />
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">{tc("successTitle", "Gracias!")}</h1>
          <p className="text-sm text-slate-700 mb-1">
            {tc("successBody", `Recibimos tu confirmacion para ${shipment.shipmentCode}.`, { code: shipment.shipmentCode })}
          </p>
          <p className="text-xs text-slate-500">{tc("successHint", "El operador ahora puede incluir esta confirmacion como evidencia auditable para la emision de creditos de carbono.")}</p>
        </div>
      </MinimalShell>
    );
  }

  // Main form
  return (
    <MinimalShell headerLabel={tc("headerLabel", "Confirmación de envío de biochar")} footer={tc("footer", "Gestionado con BiocharPro · Tus datos se comparten solo con el operador que envió el biochar.")}>
      <div className="space-y-5">
        {/* Shipment info card */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2">
            <Flame className="w-3.5 h-3.5" /> {tc("shipmentCardLabel", "Envio de biochar")}
          </div>
          <div className="space-y-1 text-sm text-slate-800">
            <div><span className="text-slate-500">{tc("codeLabel", "Codigo")}:</span> <span className="font-mono">{shipment.shipmentCode}</span></div>
            <div><span className="text-slate-500">{tc("shippedLabel", "Enviado")}:</span> {new Date(shipment.shipmentDate).toLocaleDateString()}</div>
            <div><span className="text-slate-500">{tc("tonnesLabel", "Toneladas")}:</span> {shipment.tonnes.toFixed(1)} t</div>
            {shipment.endUseCategory && <div><span className="text-slate-500">{tc("intendedUseLabel", "Uso previsto")}:</span> {END_USE_KEYS[shipment.endUseCategory] ? toOff(END_USE_KEYS[shipment.endUseCategory].key, END_USE_KEYS[shipment.endUseCategory].fb) : shipment.endUseCategory}</div>}
            {shipment.destinationName && <div><span className="text-slate-500">{tc("destinationLabel", "Destino")}:</span> {shipment.destinationName}</div>}
            {shipment.carrierName && <div><span className="text-slate-500">{tc("carrierLabel", "Transportista")}:</span> {shipment.carrierName}</div>}
          </div>
        </div>

        <div>
          <h1 className="text-xl font-semibold text-slate-900 mb-1">{tc("formTitle", "Confirmar recepcion y aplicacion")}</h1>
          <p className="text-sm text-slate-600">{tc("formSubtitle", "Confirma que recibiste el biochar y como fue aplicado. Esta informacion se usa como evidencia de auditoria, por eso es importante que sea precisa.")}</p>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{tc("nameLabel", "Tu nombre u organizacion")} *</label>
            <input type="text" value={confirmedByName} onChange={(e) => setConfirmedByName(e.target.value)} required
              placeholder={tc("namePlaceholder", "ej. Finca Los Alamos")}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{tc("emailLabel", "Email (opcional)")}</label>
            <input type="email" value={confirmedByEmail} onChange={(e) => setConfirmedByEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{tc("tonnesAppliedLabel", "Toneladas aplicadas")} *</label>
              <input type="number" step="0.1" value={tonnesApplied} onChange={(e) => setTonnesApplied(e.target.value === "" ? "" : Number(e.target.value))} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{tc("applicationDateLabel", "Fecha de aplicacion")} *</label>
              <input type="date" value={applicationDate} onChange={(e) => setApplicationDate(e.target.value)} required
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{tc("applicationTypeLabel", "Como fue aplicado?")}</label>
            <input type="text" value={applicationType} onChange={(e) => setApplicationType(e.target.value)}
              placeholder={tc("applicationTypePlaceholder", "ej. incorporado al suelo superficial a 5 t/ha")}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{tc("cropLabel", "Cultivo, suelo o producto")}</label>
            <input type="text" value={cropOrUseType} onChange={(e) => setCropOrUseType(e.target.value)}
              placeholder={tc("cropPlaceholder", "ej. maiz, vinedo, mortero de cemento, etc.")}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{tc("locationLabel", "Ubicacion de aplicacion (opcional)")}</label>
            {applicationLat != null && applicationLon != null ? (
              <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-sm">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span className="font-mono text-xs">{applicationLat.toFixed(5)}, {applicationLon.toFixed(5)}</span>
                <button type="button" onClick={() => { setApplicationLat(undefined); setApplicationLon(undefined); }} className="text-xs text-red-600 ml-auto">{tc("clearLocation", "Borrar")}</button>
              </div>
            ) : (
              <button type="button" onClick={handleGeoFill} disabled={geoLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-sm rounded hover:bg-slate-50 disabled:opacity-50">
                {geoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                {tc("shareLocation", "Compartir mi ubicacion actual")}
              </button>
            )}
            {geoError && <div className="text-xs text-amber-700 mt-1">{geoError}</div>}
            <p className="text-xs text-slate-500 mt-1 italic">{tc("locationHint", "Ayuda a verificar el sitio de aplicacion. Solo se usa para auditoria; no se publica.")}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{tc("notesLabel", "Notas (opcional)")}</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder={tc("notesPlaceholder", "Algo que el operador deba saber: dosis, momento de aplicacion, observaciones...")}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{formError}</div>
          )}
          {confirmMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {confirmMutation.error?.message ?? tc("errSubmit", "No se pudo enviar. Intenta nuevamente.")}
            </div>
          )}

          <button type="submit" disabled={confirmMutation.isPending}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {confirmMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {confirmMutation.isPending ? tc("submitting", "Enviando...") : tc("submit", "Confirmar envio")}
          </button>
        </form>
      </div>
    </MinimalShell>
  );
}

function MinimalShell({ children, headerLabel, footer }: { children: React.ReactNode; headerLabel?: string; footer?: string }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Leaf className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-700">{headerLabel ?? "Confirmacion de envio de biochar"}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          {children}
        </div>
        <div className="text-xs text-slate-400 text-center mt-4">
          {footer ?? "Gestionado con BiocharPro · Tus datos se comparten solo con el operador que envió el biochar."}
        </div>
      </div>
    </div>
  );
}
