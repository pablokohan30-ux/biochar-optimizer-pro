import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, ExternalLink, Sparkles, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Criterion {
  id: string;
  label: string;
  description?: string;
  thresholdNote?: string;
}

interface Props {
  projectId: number;
  linkedMethodologyId: number | null;
  manualStates: Record<string, Record<string, boolean | null | undefined>>;
  onLinkChange: (customMethodologyId: number | null) => void;
  onManualStatesChange: (next: Record<string, Record<string, boolean | null | undefined>>) => void;
}

/**
 * Sits next to MethodologyAssessment on ProjectDetail. Lets the user link
 * one of their own custom methodologies to this project, then check off the
 * criteria one by one. Score = passed / total.
 *
 * Manual check states are stored in `manualStates[custom-{methodologyId}]`
 * so they piggyback on the same DB column (projects.manualChecks) the
 * official methodology assessment uses — one persistence path, both sync.
 */
export default function CustomMethodologyPanel({
  linkedMethodologyId,
  manualStates,
  onLinkChange,
  onManualStatesChange,
}: Props) {
  const { t } = useTranslation();
  const listQuery = trpc.customMethodology.list.useQuery();
  const [pickerOpen, setPickerOpen] = useState(false);

  const methodologies = listQuery.data ?? [];

  const linked = useMemo(
    () => methodologies.find((m) => m.id === linkedMethodologyId) ?? null,
    [methodologies, linkedMethodologyId],
  );

  const criteria: Criterion[] = useMemo(() => {
    if (!linked) return [];
    return Array.isArray(linked.criteria) ? (linked.criteria as Criterion[]) : [];
  }, [linked]);

  const stateKey = linked ? `custom-${linked.id}` : "";
  const checksForLinked = linked ? manualStates[stateKey] ?? {} : {};
  const passed = Object.values(checksForLinked).filter((v) => v === true).length;
  const total = criteria.length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;

  const setCheck = (criterionId: string, nextValue: boolean | null) => {
    const nextForLinked = { ...checksForLinked, [criterionId]: nextValue };
    onManualStatesChange({ ...manualStates, [stateKey]: nextForLinked });
  };

  // ── Empty state — user hasn't created any custom methodology ─────────
  if (!listQuery.isLoading && methodologies.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold">
            {t("customCompliance.emptyTitle", {
              defaultValue: "Aplicá tu propia metodología a este proyecto",
            })}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {t("customCompliance.emptyBody", {
              defaultValue:
                "Como parte del plan Expert podés definir un framework propio (por ejemplo, un checklist interno o el requerimiento de un buyer específico) y aplicarlo a cada proyecto.",
            })}
          </p>
          <Link href="/methodologies">
            <button className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80">
              <ExternalLink className="w-3.5 h-3.5" />
              {t("customCompliance.emptyCta", { defaultValue: "Crear metodología custom" })}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header — selector + score */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <Sparkles className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("customCompliance.eyebrow", { defaultValue: "Metodología custom" })}
          </div>
          {linked ? (
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="text-sm font-semibold hover:text-primary transition-colors flex items-center gap-1"
            >
              {linked.name}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1"
            >
              {t("customCompliance.pick", { defaultValue: "Elegir una metodología custom" })}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {linked && total > 0 && (
          <div className="text-right">
            <div className={`text-lg font-bold ${scoreColor(score)}`}>{score}</div>
            <div className="text-[10px] text-muted-foreground">
              {passed}/{total}{" "}
              {t("customCompliance.criteria", { defaultValue: "criterios" })}
            </div>
          </div>
        )}
        {linked && (
          <button
            type="button"
            onClick={() => {
              onLinkChange(null);
              setPickerOpen(false);
            }}
            className="text-muted-foreground hover:text-red-500 shrink-0"
            title={t("customCompliance.unlink", { defaultValue: "Desvincular metodología" })}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Picker dropdown */}
      {pickerOpen && (
        <div className="border-b border-border max-h-56 overflow-auto">
          {methodologies.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onLinkChange(m.id);
                setPickerOpen(false);
              }}
              className={`w-full text-left px-4 py-2 hover:bg-secondary/40 border-b border-border/40 last:border-b-0 ${
                m.id === linkedMethodologyId ? "bg-primary/10 text-primary" : ""
              }`}
            >
              <div className="text-sm font-medium">{m.name}</div>
              {m.description && (
                <div className="text-[11px] text-muted-foreground truncate">{m.description}</div>
              )}
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {Array.isArray(m.criteria) ? m.criteria.length : 0}{" "}
                {t("customCompliance.criteria", { defaultValue: "criterios" })}
              </div>
            </button>
          ))}
          <Link href="/methodologies">
            <button className="w-full text-left px-4 py-2 text-xs font-medium text-primary hover:bg-primary/10 border-t border-border/60">
              + {t("customCompliance.manage", { defaultValue: "Gestionar mis metodologías" })}
            </button>
          </Link>
        </div>
      )}

      {/* Criteria checklist */}
      {linked && criteria.length > 0 && (
        <div className="px-4 py-3 space-y-2">
          {criteria.map((c) => {
            const state = checksForLinked[c.id] ?? null;
            return (
              <div key={c.id} className="flex items-start gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setCheck(c.id, state === true ? null : true)}
                  className={`shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    state === true
                      ? "bg-green-500 border-green-500 text-white"
                      : state === false
                        ? "bg-red-500/20 border-red-500 text-red-500"
                        : "border-border hover:border-primary"
                  }`}
                  title={
                    state === true
                      ? t("customCompliance.checkPassing", { defaultValue: "Cumple" })
                      : t("customCompliance.checkPending", { defaultValue: "Sin marcar" })
                  }
                >
                  {state === true && <Check className="w-3.5 h-3.5" />}
                  {state === false && <X className="w-3.5 h-3.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-medium leading-tight">{c.label}</div>
                  {c.description && (
                    <div className="text-xs text-muted-foreground leading-snug mt-0.5">{c.description}</div>
                  )}
                  {c.thresholdNote && (
                    <div className="text-[10px] text-muted-foreground/80 mt-1 italic">
                      {t("customCompliance.threshold", { defaultValue: "Umbral" })}: {c.thresholdNote}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCheck(c.id, state === false ? null : false)}
                  className={`shrink-0 mt-0.5 text-[10px] px-2 py-0.5 rounded transition-colors ${
                    state === false
                      ? "bg-red-500 text-white"
                      : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  }`}
                >
                  {t("customCompliance.markFail", { defaultValue: "No cumple" })}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {linked && criteria.length === 0 && (
        <div className="px-4 py-3 text-xs text-muted-foreground italic">
          {t("customCompliance.noCriteria", {
            defaultValue: "Esta metodología aún no tiene criterios cargados.",
          })}
        </div>
      )}
    </div>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}
