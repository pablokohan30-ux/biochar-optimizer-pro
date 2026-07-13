import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, ChevronDown, ChevronUp, Circle, ShieldCheck } from "lucide-react";
import {
  evaluateAllProfiles,
  type PddComplianceReport,
  type PddCompliMethodology,
} from "@/lib/pddCompliance";
import { PDD_TEMPLATE, columnLabelFallback } from "@/lib/pddTemplate";

/** Map internal sectionId → the A–K letter shown in the sidebar. */
const SECTION_LETTER = new Map<string, string>(
  PDD_TEMPLATE.map((s, i) => [s.id, String.fromCharCode(65 + i)]),
);

interface Props {
  responses: Record<string, string>;
  /** Callback: jump to a specific PDD question by section id. */
  onNavigate: (sectionId: string) => void;
}

/**
 * Cross-methodology compliance bar for the PDD Builder.
 *
 * Shows one card per methodology with a live score based on the answers the
 * user has already provided. Expanding a card lists every requirement, which
 * ones are missing, and lets the user jump straight to the underlying PDD
 * section.
 */
export default function PddCompliancePanel({ responses, onNavigate }: Props) {
  const { t, i18n } = useTranslation("pdd");
  const [expanded, setExpanded] = useState<PddCompliMethodology | null>(null);
  const isEs = i18n.language?.startsWith("es") ?? false;

  const reports = useMemo(() => evaluateAllProfiles(responses), [responses]);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">
          {t("compliance.title", {
            defaultValue: isEs ? "Preparación por metodología" : "Readiness by methodology",
          })}
        </h3>
        <span className="text-[10px] text-muted-foreground">
          {t("compliance.subtitle", {
            defaultValue: isEs
              ? "Chequeos en vivo contra tus respuestas"
              : "Live checks against your responses",
          })}
        </span>
      </div>
      <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
        {reports.map((r) => (
          <ComplianceCard
            key={r.methodology}
            report={r}
            expanded={expanded === r.methodology}
            onToggle={() =>
              setExpanded((prev) => (prev === r.methodology ? null : r.methodology))
            }
            onNavigate={onNavigate}
            isEs={isEs}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ComplianceCard({
  report,
  expanded,
  onToggle,
  onNavigate,
  isEs,
}: {
  report: PddComplianceReport;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (sectionId: string) => void;
  isEs: boolean;
}) {
  const scoreClass = scoreClasses(report.score);
  return (
    <div
      className={`rounded-lg border overflow-hidden transition-all ${
        expanded ? "col-span-full border-primary/40 bg-primary/5" : "border-border bg-background"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-secondary/40 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-[11px] font-bold ${scoreClass.badge}`}
          >
            {report.score}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold truncate">
              {isEs ? report.labelEs : report.labelEn}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {report.passed}/{report.total}{" "}
              {isEs ? "requisitos" : "requirements"}
            </div>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 py-3 border-t border-border/60 space-y-2">
          {report.requirements.map((s) => {
            const label = isEs ? s.requirement.labelEs : s.requirement.labelEn;
            return (
              <div
                key={s.requirement.id}
                className="flex items-start gap-2 text-xs"
              >
                {s.pass ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className={`w-4 h-4 shrink-0 mt-0.5 ${
                    s.requirement.critical
                      ? "text-red-400"
                      : "text-muted-foreground/60"
                  }`} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`font-medium ${
                        s.pass ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                    {s.requirement.critical && (
                      <span className="text-[9px] px-1 py-0.5 rounded bg-red-500/10 text-red-500 font-semibold uppercase tracking-wider">
                        {isEs ? "Crítico" : "Critical"}
                      </span>
                    )}
                  </div>
                  {!s.pass && s.missing.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {s.missing.map((m) => (
                        <button
                          key={`${m.sectionId}-${m.questionId}`}
                          type="button"
                          onClick={() => onNavigate(m.sectionId)}
                          className="text-[10px] text-primary hover:text-primary/80 underline decoration-dotted"
                        >
                          {jumpLabel(m.sectionId, m.questionId, m.reason, isEs)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function scoreClasses(score: number): { badge: string } {
  if (score >= 80) return { badge: "bg-green-500/15 text-green-600 dark:text-green-400" };
  if (score >= 50) return { badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };
  return { badge: "bg-red-500/15 text-red-500 dark:text-red-400" };
}

function jumpLabel(
  sectionId: string,
  questionId: string,
  reason: string,
  isEs: boolean,
): string {
  const to = isEs ? "Ir a" : "Go to";
  const secLetter = SECTION_LETTER.get(sectionId) ?? "?";
  const humanQ = columnLabelFallback(questionId, isEs ? "es" : "en");
  const readable = humanQ === questionId ? questionId : humanQ;
  const missing = isEs ? `— falta ${reason}` : `— missing ${reason}`;
  return `${to} ${secLetter}: ${readable} ${missing}`;
}
