/**
 * Stage 3+4 Onboarding Modal
 *
 * Shows once per user (Expert tier) when they first open a project.
 * Explains the biomass → signed-offtake pipeline in ~30 seconds so they
 * know what the 6 Stage 3+4 buttons in the project header actually do.
 *
 * "Once per user" is enforced via localStorage key `bop_stage34_onboarding_seen`.
 * User can dismiss with "Got it" or the X. A "Don't show again" checkbox
 * is on by default (opt-out if they want to see it every time).
 */

import { useEffect, useState } from "react";
import { X, ClipboardCheck, Truck, Users, Zap, FileCheck, Trophy, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const STORAGE_KEY = "bop_stage34_onboarding_seen";

type Props = {
  enabled: boolean;  // Only show for Expert tier users
  onClose?: () => void;
};

export default function Stage34OnboardingModal({ enabled, onClose }: Props) {
  const { t } = useTranslation("common");
  const to = (k: string, fb: string) => t(`stage34Onboarding.${k}`, { defaultValue: fb });

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setOpen(true);
    } catch {
      // localStorage not available — don't show (fail-closed)
    }
  }, [enabled]);

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setOpen(false);
    onClose?.();
  }

  if (!open || !enabled) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">
                {to("eyebrow", "Flujo Expert")}
              </div>
              <h2 className="text-xl font-semibold">{to("title", "De la biomasa al offtake firmado")}</h2>
              <p className="text-sm opacity-90 mt-1 leading-snug">
                {to("subtitle", "Microsoft, Frontier, Shell y Altitude ya no compran proyectos sostenidos solo en papeles. Los 6 módulos de abajo son la capa de evidencia operativa que ahora exigen.")}
              </p>
            </div>
            <button onClick={dismiss} className="shrink-0 p-1 rounded hover:bg-white/10" aria-label="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Stage 3 */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
              {to("stage3Title", "Etapa 3 — Operación auditable")}
            </div>
            <div className="space-y-2">
              <Row
                icon={<ClipboardCheck className="w-4 h-4 text-amber-600" />}
                name={to("evidenceName", "Registro de evidencia operativa")}
                desc={to("evidenceDesc", "Cargas cada lote, análisis de laboratorio, incidente y lectura de energía. La IA valida automáticamente contra umbrales metodológicos.")}
              />
              <Row
                icon={<Truck className="w-4 h-4 text-teal-600" />}
                name={to("offtakeName", "Cadena de custodia del offtake")}
                desc={to("offtakeDesc", "Generas una URL pública por envío. El usuario final confirma toneladas, cultivo y geolocalización. Sin eso, Microsoft no firma.")}
              />
              <Row
                icon={<Users className="w-4 h-4 text-pink-600" />}
                name={to("communityName", "Registro de impacto comunitario")}
                desc={to("communityDesc", "Registras reuniones, reclamos, contrataciones locales e inversiones. La IA arma el reporte de impacto que los compradores aceptan como evidencia.")}
              />
            </div>
          </div>

          {/* Stage 4 */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">
              {to("stage4Title", "Etapa 4 — Salida comercial")}
            </div>
            <div className="space-y-2">
              <Row
                icon={<Zap className="w-4 h-4 text-indigo-600" />}
                name={to("readinessName", "Preparación para compradores")}
                desc={to("readinessDesc", "La IA puntúa tu proyecto de 0 a 100 frente a los criterios públicos de cada comprador y devuelve una lista priorizada de brechas.")}
              />
              <Row
                icon={<Trophy className="w-4 h-4 text-amber-600" />}
                name={to("matchName", "Priorización de compradores")}
                desc={to("matchDesc", "La inversa del readiness: la IA ordena a los 4 compradores por probabilidad de firma en 6 meses y te dice a quién conviene acercarte primero.")}
              />
              <Row
                icon={<FileCheck className="w-4 h-4 text-fuchsia-600" />}
                name={to("auditName", "Paquete de auditoría")}
                desc={to("auditDesc", "Un PDF listo para imprimir que consolida toda la evidencia operativa para el VVB o el equipo comprador.")}
              />
            </div>
          </div>

          {/* The flow */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5" /> {to("flowTitle", "El flujo")}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {to("flowBody", "Cargas evidencia todos los días → sigues el offtake envío por envío con confirmación del usuario final → registras cada interacción comunitaria → al cierre del período corres Paquete de auditoría + Preparación para compradores → se lo entregas al comprador más alineado.")}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-end gap-2">
          <button
            onClick={dismiss}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg"
          >
            {to("cta", "Listo, vamos")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, name, desc }: { icon: React.ReactNode; name: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{name}</div>
        <div className="text-xs text-slate-600 dark:text-slate-400 leading-snug mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
