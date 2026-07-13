import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Check, Download, ExternalLink } from "lucide-react";
import type { PddQuestion, PddReferenceTemplate } from "@/lib/pddTemplate";
import { getReferenceTemplate, pickBilingual, parseTableRows } from "@/lib/pddTemplate";

interface Props {
  question: PddQuestion;
  currentValue: string;
  onLoadRows: (rows: Record<string, string>[]) => void;
}

/**
 * Reference template panel — shows next to the hint on tabular questions
 * that declare a referenceKey. Explains what a certification-grade answer
 * looks like and offers a one-click "load example rows" action.
 */
export default function PddReferencePanel({ question, currentValue, onLoadRows }: Props) {
  const { t, i18n } = useTranslation("pdd");
  const [open, setOpen] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const template = getReferenceTemplate(question.referenceKey);
  if (!template) return null;

  const lang = i18n.language;
  const hasExistingRows = parseTableRows(currentValue).length > 0;

  const handleLoad = () => {
    if (!template.exampleRows) return;
    if (hasExistingRows && !confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }
    onLoadRows(template.exampleRows);
    setConfirmOverwrite(false);
  };

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
      >
        <BookOpen className="w-3.5 h-3.5" />
        {open
          ? t("reference.hide", { defaultValue: "Ocultar plantilla de referencia" })
          : t("reference.show", { defaultValue: "Ver plantilla de referencia" })}
        <MethodologyBadge methodology={template.methodology} />
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/60 dark:bg-indigo-950/30 p-4 space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
              {pickBilingual(template.title, lang)}
            </h4>
            <p className="text-xs text-indigo-800/80 dark:text-indigo-200/80 mt-1 leading-relaxed">
              {pickBilingual(template.summary, lang)}
            </p>
          </div>

          <ul className="space-y-1.5">
            {template.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-indigo-900/90 dark:text-indigo-100/90">
                <Check className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{pickBilingual(b, lang)}</span>
              </li>
            ))}
          </ul>

          {template.exampleRows && template.exampleRows.length > 0 && (
            <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/40 space-y-2">
              {confirmOverwrite ? (
                <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
                  <span>
                    {t("reference.confirmOverwrite", {
                      defaultValue: "Ya hay filas cargadas. ¿Añadir las de ejemplo abajo?",
                    })}
                  </span>
                  <button
                    type="button"
                    onClick={handleLoad}
                    className="px-2 py-1 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700"
                  >
                    {t("reference.confirmYes", { defaultValue: "Añadir" })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmOverwrite(false)}
                    className="px-2 py-1 rounded border border-border text-foreground hover:bg-background"
                  >
                    {t("reference.confirmCancel", { defaultValue: "Cancelar" })}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLoad}
                  className="flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t("reference.loadRows", {
                    defaultValue: "Cargar {{n}} filas de ejemplo",
                    n: template.exampleRows.length,
                  })}
                </button>
              )}
            </div>
          )}

          {template.source && (
            <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/40 text-[10px] text-indigo-700/70 dark:text-indigo-300/70 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              <span>
                {t("reference.source", { defaultValue: "Fuente" })}: {template.source}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function MethodologyBadge({ methodology }: { methodology: PddReferenceTemplate["methodology"] }) {
  const map: Record<PddReferenceTemplate["methodology"], { label: string; color: string }> = {
    microsoft: { label: "Microsoft", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200" },
    "puro-earth": { label: "Puro.earth", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200" },
    isometric: { label: "Isometric", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200" },
    "verra-vm0044": { label: "Verra VM0044", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200" },
    ebc: { label: "EBC", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200" },
    "gold-standard": { label: "Gold Standard", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200" },
    generic: { label: "General", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" },
  };
  const cfg = map[methodology];
  return (
    <span className={`ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}
