import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { PddQuestion, PddTableColumn, PddTableRow } from "@/lib/pddTemplate";
import {
  parseTableRows,
  hasLegacyTextValue,
  columnLabelFallback,
  optionLabelFallback,
} from "@/lib/pddTemplate";

interface Props {
  question: PddQuestion;
  value: string;
  onChange: (next: string) => void;
}

/**
 * Table input for PDD workstreams that need structured answers
 * (Risk Register, Permitting Status, Equipment BOM, CAPEX, etc.).
 *
 * Value is serialized to JSON in the same `responses[qId]` string as
 * textarea questions — no schema change to the persistence layer.
 *
 * Legacy free-text answers are preserved and shown above the empty
 * table so the user can copy-paste into rows without losing prior work.
 */
export default function PddTableInput({ question, value, onChange }: Props) {
  const { t, i18n } = useTranslation("pdd");
  const columns = question.columns ?? [];
  const lang = i18n.language;

  const rows = useMemo<PddTableRow[]>(() => parseTableRows(value), [value]);
  const legacyText = useMemo(() => (hasLegacyTextValue(value) ? value : ""), [value]);
  const [legacyDismissed, setLegacyDismissed] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const persist = useCallback(
    (next: PddTableRow[]) => onChange(JSON.stringify(next)),
    [onChange],
  );

  const addRow = useCallback(() => {
    const empty: PddTableRow = {};
    for (const c of columns) empty[c.id] = "";
    persist([...rows, empty]);
    setExpandedRow(rows.length);
  }, [columns, persist, rows]);

  const updateCell = useCallback(
    (rowIdx: number, colId: string, cellValue: string) => {
      const next = rows.map((r, i) => (i === rowIdx ? { ...r, [colId]: cellValue } : r));
      persist(next);
    },
    [persist, rows],
  );

  const removeRow = useCallback(
    (rowIdx: number) => {
      const next = rows.filter((_, i) => i !== rowIdx);
      persist(next);
      setExpandedRow((prev) => (prev === rowIdx ? null : prev));
    },
    [persist, rows],
  );

  return (
    <div className="space-y-3">
      {legacyText && !legacyDismissed && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">
              {t("table.legacyTitle", { defaultValue: "Contenido anterior" })}
            </div>
            <button
              type="button"
              onClick={() => setLegacyDismissed(true)}
              className="text-[11px] text-amber-800 dark:text-amber-200 hover:underline"
            >
              {t("table.legacyDismiss", { defaultValue: "Ocultar" })}
            </button>
          </div>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-200/80 mb-2 leading-relaxed">
            {t("table.legacyHint", {
              defaultValue:
                "Esta pregunta ahora usa una tabla estructurada. Copia manualmente el contenido a las filas de abajo cuando estés listo.",
            })}
          </p>
          <pre className="whitespace-pre-wrap text-[12px] text-amber-900 dark:text-amber-100 bg-white/60 dark:bg-amber-900/30 rounded p-2 max-h-40 overflow-auto">
            {legacyText}
          </pre>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-secondary/40">
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.id}
                    className="text-left px-2 py-2 font-medium text-muted-foreground border-b border-border"
                    style={{ minWidth: widthPx(c.width) }}
                  >
                    {t(c.labelKey, { defaultValue: columnLabelFallback(c.id, lang) })}
                  </th>
                ))}
                <th className="w-10 border-b border-border" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 1}
                    className="text-center text-muted-foreground text-xs py-6 italic"
                  >
                    {t("table.empty", { defaultValue: "Sin filas todavía. Añade la primera." })}
                  </td>
                </tr>
              ) : (
                rows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-border last:border-b-0">
                    {columns.map((c) => (
                      <td key={c.id} className="px-2 py-1.5 align-top">
                        <CellInput
                          column={c}
                          value={row[c.id] ?? ""}
                          onChange={(v) => updateCell(rIdx, c.id, v)}
                          questionId={question.id}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5 align-top">
                      <button
                        type="button"
                        onClick={() => removeRow(rIdx)}
                        className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                        aria-label={t("table.removeRow", { defaultValue: "Eliminar fila" })}
                        title={t("table.removeRow", { defaultValue: "Eliminar fila" })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {rows.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs py-6 italic border border-dashed border-border rounded-lg">
            {t("table.empty", { defaultValue: "Sin filas todavía. Añade la primera." })}
          </div>
        ) : (
          rows.map((row, rIdx) => {
            const isOpen = expandedRow === rIdx;
            const summary = summarize(row, columns);
            return (
              <div key={rIdx} className="rounded-lg border border-border bg-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedRow(isOpen ? null : rIdx)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left"
                >
                  <span className="text-xs font-medium truncate mr-2 flex-1">
                    {summary ||
                      t("table.rowNumber", { defaultValue: "Fila {{n}}", n: rIdx + 1 })}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="border-t border-border p-3 space-y-2">
                    {columns.map((c) => (
                      <div key={c.id}>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-0.5">
                          {t(c.labelKey, { defaultValue: columnLabelFallback(c.id, lang) })}
                        </label>
                        <CellInput
                          column={c}
                          value={row[c.id] ?? ""}
                          onChange={(v) => updateCell(rIdx, c.id, v)}
                          questionId={question.id}
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => removeRow(rIdx)}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 mt-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {t("table.removeRow", { defaultValue: "Eliminar fila" })}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        {t("table.addRow", { defaultValue: "Añadir fila" })}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cell input — one control per column type
// ---------------------------------------------------------------------------

function CellInput({
  column,
  value,
  onChange,
  questionId,
}: {
  column: PddTableColumn;
  value: string;
  onChange: (v: string) => void;
  questionId: string;
}) {
  const { t, i18n } = useTranslation("pdd");
  const lang = i18n.language;
  const shared =
    "w-full bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary";

  if (column.type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className={`${shared} resize-y min-h-[2.25rem]`}
        placeholder={column.placeholderKey ? t(column.placeholderKey, { defaultValue: "" }) : ""}
      />
    );
  }
  if (column.type === "select") {
    const opts = column.options ?? [];
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={shared}>
        <option value="">—</option>
        {opts.map((opt) => (
          <option key={opt} value={opt}>
            {t(`sections.${sectionOf(questionId, column)}.options.${opt}`, {
              defaultValue: optionLabelFallback(opt, lang),
            })}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      type={column.type === "number" ? "number" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={shared}
      placeholder={column.placeholderKey ? t(column.placeholderKey, { defaultValue: "" }) : ""}
    />
  );
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function widthPx(w: PddTableColumn["width"]): number {
  switch (w) {
    case "sm":
      return 110;
    case "md":
      return 170;
    case "lg":
      return 240;
    case "xl":
      return 320;
    default:
      return 150;
  }
}

/** Build a one-line summary for the mobile card header from the row's
 *  filled cells (first two non-empty values, joined by " · "). */
function summarize(row: PddTableRow, columns: PddTableColumn[]): string {
  const parts: string[] = [];
  for (const c of columns) {
    const v = (row[c.id] ?? "").trim();
    if (v.length === 0) continue;
    parts.push(v);
    if (parts.length >= 2) break;
  }
  return parts.join(" · ");
}

/** i18n key namespace for a column's select options — derives the section
 *  id from the column's labelKey (which follows `sections.<s>.questions.<q>.columns.<colId>`). */
function sectionOf(_questionId: string, column: PddTableColumn): string {
  // labelKey pattern: sections.<sec>.questions.<q>.columns.<colId>
  const parts = column.labelKey.split(".");
  if (parts.length >= 2 && parts[0] === "sections") return parts[1];
  return "";
}
