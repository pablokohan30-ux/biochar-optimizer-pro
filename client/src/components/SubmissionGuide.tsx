/**
 * SubmissionGuide — "OK, I have the package. What now?"
 *
 * Fase 5 of the Projects plan: once a user exports their submission package,
 * they still need to know where to upload it, who to email, and what the
 * timeline looks like. This is that piece.
 *
 * Opens as a modal from ProjectDetail. Renders 4 methodology cards with
 * expandable step-by-step instructions for submitting to each certifier.
 *
 * Instructions are kept in this file (not in methodologies.ts) because they
 * are UI copy, not part of the scoring model. If they ever need to be i18n'd
 * per-key we can migrate — for now the content is authored in ES with a
 * small fallback to EN via the i18n system.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  X, ExternalLink, Mail, Clock, ChevronDown, ChevronUp,
  FileCheck, AlertCircle, CheckCircle2, Download,
} from "lucide-react";
import GuideLink from "@/components/GuideLink";

type MethodologyKey = "puro-earth" | "isometric" | "ebc" | "verra-vm0044" | "gold-standard";

interface Guide {
  id: MethodologyKey;
  name: string;
  tagline: string;
  portalUrl: string;
  contactEmail: string;
  timeline: string;
  color: string;       // tailwind text color
  accent: string;      // tailwind bg/border accent
  steps: string[];
  notes: string[];
}

const GUIDES: Guide[] = [
  {
    id: "puro-earth",
    name: "Puro.earth",
    tagline: "Metodología CORC · emite créditos de remoción",
    portalUrl: "https://puro.earth/become-supplier",
    contactEmail: "suppliers@puro.earth",
    timeline: "8–12 semanas",
    color: "text-green-500",
    accent: "bg-green-500/10 border-green-500/20",
    steps: [
      "Registrate como Supplier en el portal Puro.earth (requiere datos de la empresa + documento legal).",
      "Desde este proyecto, exporta el paquete en formato PDF (botón Export → Puro.earth → PDF). Ese PDF es tu borrador de PDD.",
      "Exporta también el JSON — el equipo de Puro.earth te lo puede pedir para una verificación automatizada.",
      "Carga el PDD al portal en la pestaña \"Project submission\". Adjunta análisis de laboratorio del biochar real (no basta con la simulación).",
      "Puro.earth asigna un verificador externo. El verificador va a pedir información adicional: registros de producción, metadatos de planta y fotografías.",
      "Una vez verificado, Puro.earth emite los CORCs y los deposita en tu cuenta del registro.",
    ],
    notes: [
      "La simulación de biocharpro.io sirve como preevaluación. La certificación final requiere datos operacionales reales de la planta.",
      "Puro.earth cobra fee por CORC emitido. Confirma los términos antes de enviar.",
    ],
  },
  {
    id: "isometric",
    name: "Isometric",
    tagline: "Protocolo de durabilidad 200/1000 años · enfoque científico estricto",
    portalUrl: "https://registry.isometric.com/",
    contactEmail: "hello@isometric.com",
    timeline: "10–16 semanas",
    color: "text-blue-500",
    accent: "bg-blue-500/10 border-blue-500/20",
    steps: [
      "Solicita onboarding al registro de Isometric por email (incluí país, biomasa y capacidad de planta).",
      "Isometric va a evaluar si tu proyecto encaja con su protocolo de biochar, con foco en alta durabilidad (≥200 o ≥1000 años).",
      "Exporta el paquete desde este proyecto (JSON + PDF). El JSON tiene el LCA estructurado que Isometric pide.",
      "Carga todo al registro. Isometric requiere un panel de revisión por pares antes de emitir créditos; son 2 o 3 científicos independientes que revisan el proyecto.",
      "Respondé al panel durante 4-8 semanas con datos adicionales (caracterización H/C, O/C, BET, estabilidad térmica).",
      "Una vez aprobado, los créditos se emiten en el registro de Isometric.",
    ],
    notes: [
      "Isometric es la más estricta de las 4 en términos de durabilidad requerida. Si tu biochar tiene H/C > 0.4, es probable que no califique para el protocolo de 1000 años.",
      "El precio por tCO₂e suele ser premium ($180-$250) justamente por la durabilidad.",
    ],
  },
  {
    id: "ebc",
    name: "EBC",
    tagline: "European Biochar Certificate · estándar de calidad (sin créditos)",
    portalUrl: "https://www.european-biochar.org/en/ct/2-Certification-Procedure",
    contactEmail: "info@european-biochar.org",
    timeline: "4–8 semanas",
    color: "text-amber-500",
    accent: "bg-amber-500/10 border-amber-500/20",
    steps: [
      "Contacta al EBC por email pidiendo el formulario de aplicación (incluí si buscas EBC-Agro, EBC-Urban, EBC-ConsumerMaterials, etc).",
      "EBC envía el formulario + la lista de parámetros que necesitan en el análisis de laboratorio.",
      "Exporta el paquete en formato PDF desde este proyecto; sirve como informe técnico inicial.",
      "Envia a un laboratorio certificado por EBC una muestra del biochar real para análisis oficial. Lista de labs: eurofins-biochar.com, entre otros.",
      "EBC revisa los resultados contra el estándar (H/C ≤ 0.7, PAHs < 6 mg/kg, metales pesados por debajo de los umbrales).",
      "Si pasa, EBC emite el certificado. Es un sello de calidad: no emite créditos de carbono directamente, pero sí funciona como requisito previo para muchas metodologías CDR.",
    ],
    notes: [
      "EBC NO emite créditos de carbono. Sirve como filtro de calidad para poder aplicar a Puro.earth, Isometric, etc.",
      "El certificado EBC es pre-requisito para algunos productos orgánicos en mercados europeos (EBC-Agro).",
    ],
  },
  {
    id: "verra-vm0044",
    name: "Verra VM0044",
    tagline: "Metodología VCS v1.2 para biochar en suelo y no suelo · aprobada por CCP",
    portalUrl: "https://verra.org/methodologies/vm0044-biochar-utilization-in-soil-and-non-soil-applications-v1-2/",
    contactEmail: "registry@verra.org",
    timeline: "12–24 meses (punta a punta)",
    color: "text-purple-500",
    accent: "bg-purple-500/10 border-purple-500/20",
    steps: [
      "Requisito previo: certificación EBC vigente para tu biochar (VM0044 no define sus propios límites de metales pesados / PAHs — los delega).",
      "Abrí cuenta en Verra Registry (https://registry.verra.org/) como Project Proponent. Tarifa de registro: USD 3,750 por la revisión inicial.",
      "Arma el Project Description (PD) usando la plantilla de Verra + los datos de este proyecto (exporta el JSON/PDF). Incluí: análisis de adicionalidad v1.2 con NPV/IRR, línea base (descomposición o quema), evidencia de biomasa y certificado EBC.",
      "Lista el proyecto en el proceso de Verra y completa el AFOLU Non-Permanence Risk Tool (determina el % de reserva, típicamente 10–60%).",
      "Contrata un VVB acreditado (SCS Global Services, Aster Global, EPIC Sustainability, TÜV Nord, TÜV SÜD, SGS o ERM CVS). Costo típico del VVB: USD 30K–80K.",
      "El VVB hace la validación (escritorio + visita) → envío a Verra → registro. Luego viene el monitoreo continuo + la verificación periódica por el mismo VVB → emisión de VCUs en el registro.",
    ],
    notes: [
      "Precio de VCUs biochar bajo VM0044 en 2025-2026: USD 120–180/tCO₂e. Algunos contratos multi-año 2-5 años: USD 120–155/t.",
      "ICVCM con CCP (2025): ese sello ya es una exigencia de muchos compradores corporativos.",
      "El plazo es más largo que Puro.earth (6–9 meses), pero compensa con volúmenes grandes y la escala de Verra.",
      "Cargos adicionales de Verra: USD 5,000 por revisión de verificación + USD 0.20 por VCU emitido.",
    ],
  },
  {
    id: "gold-standard",
    name: "Gold Standard",
    tagline: "Metodología Sustainable Biochar en desarrollo · co-beneficios ODS obligatorios",
    portalUrl: "https://globalgoals.goldstandard.org/in-development/sustainable-biochar/",
    contactEmail: "help@goldstandard.org",
    timeline: "12–24 meses (punta a punta)",
    color: "text-amber-500",
    accent: "bg-amber-500/10 border-amber-500/20",
    steps: [
      "⚠️ Estado actual (Abr 2026): Gold Standard esta desarrollando la metodología Sustainable Biochar desde Dic 2024. No hay metodología publicada aún, 0 proyectos biochar registrados en el Gold Standard Impact Registry.",
      "Crea cuenta en el Gold Standard Impact Registry y suscribite a notificaciones de la metodología en desarrollo para enterarte cuando se publique el borrador para consulta pública.",
      "Mientras tanto, avanza con el prearmado documental: identifica al menos 3 ODS a los que aporta tu proyecto (ODS 13 siempre es uno — los otros 2 necesitan evidencia concreta).",
      "Selecciona un VVB (Validation & Verification Body) del listado acreditado de Gold Standard. Sin VVB no hay registración.",
      "Cuando la metodología se publique, exporta el paquete desde este proyecto, completa el PDD de GS + SDG Impact Tool, pasa por validación con tu VVB, la consulta pública de 2 semanas y luego registra el proyecto en Impact Registry.",
      "Proceso completo: revisión preliminar → certificación de diseño → registro → implementación → certificación de desempeño → emisión. Re-certificación cada 5 años. Período máximo de acreditación: 45 años.",
    ],
    notes: [
      "Costos esperados: USD 1,000/año de tarifa del registro + revisión de diseño + revisión de desempeño (varía por volumen).",
      "Precio de mercado actual para créditos biochar premium: USD 150–270/tCO₂e. GS apunta al segmento de compradores alineados con ODS.",
      "Activity Requirements GS Doc 205 ya aplica: reversal risk buffer 2.5–8%, alineamiento futuro con EU CRCF.",
    ],
  },
];

interface SubmissionGuideButtonProps {
  /** Project name shown in the modal header for context. */
  projectName?: string;
  /** Project ID — linked from each guide for quick back-to-Export navigation. */
  projectId: number;
  /** Initial methodology to highlight (e.g. the one the user most recently exported). */
  initialOpen?: MethodologyKey;
}

/**
 * Renders a trigger button ("Submission guide") + the modal itself.
 * Keeps all state internal so ProjectDetail just drops this in.
 */
export default function SubmissionGuideButton({ projectName, projectId, initialOpen }: SubmissionGuideButtonProps) {
  const { t } = useTranslation("projectDetail");
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<MethodologyKey | null>(initialOpen ?? null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1 border border-indigo-600/20"
        title={t("submissionGuide.buttonHint", { defaultValue: "Cómo enviar este paquete a cada certificadora" })}
      >
        <FileCheck className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">
          {t("submissionGuide.button", { defaultValue: "Cómo enviar" })}
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1">
                  {t("submissionGuide.eyebrow", { defaultValue: "Guía de envío" })}
                </div>
                <h2 className="text-xl font-bold leading-tight">
                  {t("submissionGuide.title", { defaultValue: "¿Y ahora qué hago con el paquete?" })}
                </h2>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {projectName
                    ? t("submissionGuide.subtitleFor", {
                        project: projectName,
                        defaultValue: `Instrucciones de envío por certificadora para "${projectName}". Cada una tiene su proceso y sus tiempos.`,
                      })
                    : t("submissionGuide.subtitle", {
                        defaultValue: "Instrucciones de envío por certificadora. Cada una tiene su proceso y sus tiempos.",
                      })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Important disclaimer */}
            <div className="px-5 py-3 bg-amber-500/5 border-b border-amber-500/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">
                {t("submissionGuide.disclaimer", {
                  defaultValue:
                    "El paquete exportado desde biocharpro.io es una preevaluación basada en simulación. Para certificar vas a necesitar además análisis de laboratorio del biochar real y datos operacionales de la planta.",
                })}
              </p>
            </div>

            {/* Body — accordion per methodology */}
            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-border">
                {GUIDES.map((g) => {
                  const isExpanded = expandedId === g.id;
                  return (
                    <div key={g.id} className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : g.id)}
                        className="w-full flex items-center justify-between gap-3 text-left hover:bg-muted/30 -mx-2 px-2 py-1 rounded transition-colors"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-9 h-9 rounded-lg ${g.accent} border flex items-center justify-center flex-shrink-0`}>
                            <FileCheck className={`w-4 h-4 ${g.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold">{g.name}</div>
                            <div className="text-[11px] text-muted-foreground leading-snug">{g.tagline}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="w-3 h-3" /> {g.timeline}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-4 pl-12 space-y-4">
                          {/* Quick links */}
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={g.portalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full ${g.accent} ${g.color} border hover:opacity-80 transition-opacity`}
                            >
                              <ExternalLink className="w-3 h-3" />
                              {t("submissionGuide.openPortal", { defaultValue: "Abrir portal" })}
                            </a>
                            <a
                              href={`mailto:${g.contactEmail}`}
                              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Mail className="w-3 h-3" />
                              {g.contactEmail}
                            </a>
                            <span className="sm:hidden inline-flex items-center gap-1 text-[10px] text-muted-foreground px-2.5 py-1">
                              <Clock className="w-3 h-3" /> {g.timeline}
                            </span>
                          </div>

                          {/* Numbered steps */}
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                              {t("submissionGuide.stepsHeader", { defaultValue: "Pasos" })}
                            </div>
                            <ol className="space-y-2.5">
                              {g.steps.map((step, i) => (
                                <li key={i} className="flex items-start gap-3">
                                  <span className={`flex-shrink-0 w-5 h-5 rounded-full ${g.accent} ${g.color} border text-[10px] font-bold flex items-center justify-center`}>
                                    {i + 1}
                                  </span>
                                  <span className="text-xs leading-relaxed">{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>

                          {/* Notes */}
                          {g.notes.length > 0 && (
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                {t("submissionGuide.notesHeader", { defaultValue: "Cosas a tener en cuenta" })}
                              </div>
                              <ul className="space-y-1.5">
                                {g.notes.map((note, i) => (
                                  <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                                    <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0 text-muted-foreground/60" />
                                    <span className="leading-relaxed">{note}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* CTA back to export */}
                          <div className="pt-1">
                            <Link
                              href={`/projects/${projectId}/submission/${g.id}?autoprint=0`}
                              target="_blank"
                            >
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary hover:underline cursor-pointer">
                                <Download className="w-3 h-3" />
                                {t("submissionGuide.openPackage", {
                                  defaultValue: "Abrir el paquete para esta metodología",
                                })}
                              </span>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer close + guide link */}
            <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-3">
              <GuideLink anchor="como-submission" label="Guía paso a paso para exportar" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5"
              >
                {t("submissionGuide.close", { defaultValue: "Cerrar" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
