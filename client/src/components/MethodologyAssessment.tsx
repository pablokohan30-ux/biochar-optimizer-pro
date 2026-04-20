/**
 * MethodologyAssessment — generic assessment component for any methodology.
 *
 * Displays the BiocharPro Score (0-100) prominently at the top, followed by
 * auto-evaluated and manual checks with individual pass/fail/pending states.
 *
 * Replaces the older PuroEarthAssessment component. Can be instantiated for
 * any methodology via the `methodologyId` prop.
 *
 * If the selected methodology has no checks defined (coming soon), renders
 * a placeholder with the methodology name and description.
 */

import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  AlertTriangle,
  Clock,
  Lock,
} from "lucide-react";
import type { BiocharResult, Feedstock } from "@/lib/biocharModel";
import {
  ACTIVE_METHODOLOGIES,
  getMethodology,
  METHODOLOGIES,
  type MethodologyId,
} from "@/lib/methodologies";
import {
  calculateScore,
  scoreColor,
  scoreBgColor,
  type BiocharProScore,
} from "@/lib/biocharScore";
import { useTier } from "@/hooks/useTier";

interface MethodologyAssessmentProps {
  result: BiocharResult;
  feedstock: Feedstock;
  temperature: number;
  residenceTime: number;
  plantCapacityTph: number | null;
  country: string | null;
  /** localStorage key namespace for persisting manual check toggles. */
  projectKey?: string;
  /** Initial methodology (defaults to "puro-earth"). */
  defaultMethodology?: MethodologyId;
  /** Called when the user changes the target methodology. */
  onMethodologyChange?: (id: MethodologyId) => void;
  /** When true, bypasses the per-methodology tier check (used by the public /demo page). */
  forceUnlocked?: boolean;
}

type ManualState = Record<string, Record<string, boolean | undefined>>; // methodology → check → state

export default function MethodologyAssessment({
  result,
  feedstock,
  temperature,
  residenceTime,
  plantCapacityTph,
  country,
  projectKey = "default",
  defaultMethodology = "puro-earth",
  onMethodologyChange,
  forceUnlocked = false,
}: MethodologyAssessmentProps) {
  const { t } = useTranslation("projectDetail");
  const { hasAccess } = useTier();
  const [expanded, setExpanded] = useState(true);
  const [methodologyId, setMethodologyId] = useState<MethodologyId>(defaultMethodology);

  // Persist manual check states per (project, methodology) in localStorage
  const storageKey = `assessment_${projectKey}`;
  const [manualStates, setManualStates] = useState<ManualState>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(manualStates));
    } catch {}
  }, [manualStates, storageKey]);

  const methodology = getMethodology(methodologyId);
  const currentManual = manualStates[methodologyId] ?? {};

  const score: BiocharProScore = useMemo(() => {
    if (methodology.checks.length === 0) {
      return {
        value: 0,
        tier: "not-ready",
        criticalFailure: false,
        passed: 0,
        failed: 0,
        pending: 0,
        weightedPassed: 0,
        weightedTotal: 0,
        results: [],
      };
    }
    return calculateScore(methodology, {
      result,
      feedstock,
      temperature,
      residenceTime,
      plantCapacityTph,
      country,
      manualStates: currentManual,
    });
  }, [methodology, result, feedstock, temperature, residenceTime, plantCapacityTph, country, currentManual]);

  const toggleManual = (checkId: string) => {
    setManualStates((prev) => {
      const current = prev[methodologyId] ?? {};
      const currentVal = current[checkId];
      // Cycle: undefined → true → false → undefined
      const nextVal =
        currentVal === undefined ? true : currentVal === true ? false : undefined;
      return { ...prev, [methodologyId]: { ...current, [checkId]: nextVal } };
    });
  };

  const handleMethodologySelect = (id: MethodologyId) => {
    setMethodologyId(id);
    onMethodologyChange?.(id);
  };

  // Is this a "coming soon" methodology?
  const isPlaceholder = methodology.checks.length === 0;
  // Is the user tier-locked? Demo page forces unlock.
  const isLocked = !forceUnlocked && !hasAccess(methodology.requiredTier);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
            {t("score.title", { defaultValue: "BiocharPro Score" })}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Methodology selector tabs */}
      <div className="flex flex-wrap gap-2">
        {ACTIVE_METHODOLOGIES.map((id) => {
          const m = METHODOLOGIES[id];
          const active = id === methodologyId;
          const locked = !forceUnlocked && !hasAccess(m.requiredTier);
          return (
            <button
              key={id}
              onClick={() => handleMethodologySelect(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                active
                  ? `${m.accent} ${m.color}`
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              } ${locked ? "opacity-60" : ""}`}
              title={locked ? t("score.tierLocked", { defaultValue: "Requires upgrade" }) : m.tagline}
            >
              {locked && <Lock className="w-3 h-3" />}
              <span>{m.shortName}</span>
            </button>
          );
        })}
        {/* Coming-soon methodologies */}
        {(Object.keys(METHODOLOGIES) as MethodologyId[])
          .filter((id) => !ACTIVE_METHODOLOGIES.includes(id))
          .map((id) => {
            const m = METHODOLOGIES[id];
            return (
              <span
                key={id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-secondary/50 text-muted-foreground/60 border border-border cursor-not-allowed"
                title={m.tagline}
              >
                <Clock className="w-3 h-3" />
                {m.shortName}
              </span>
            );
          })}
      </div>

      {/* Methodology placeholder */}
      {isPlaceholder && (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h4 className="font-semibold text-sm mb-1">{methodology.name}</h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">{methodology.tagline}</p>
        </div>
      )}

      {/* Tier-locked */}
      {!isPlaceholder && isLocked && (
        <div className={`border rounded-xl p-6 text-center ${methodology.accent}`}>
          <Lock className={`w-8 h-8 mx-auto mb-3 ${methodology.color}`} />
          <h4 className="font-semibold text-sm mb-1">
            {t("score.unlockTitle", {
              name: methodology.shortName,
              defaultValue: `${methodology.shortName} assessment`,
            })}
          </h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-3">
            {t("score.unlockDesc", {
              tier: methodology.requiredTier,
              defaultValue: `Requires ${methodology.requiredTier} plan or higher.`,
            })}
          </p>
        </div>
      )}

      {/* Score display — active methodology with access */}
      {!isPlaceholder && !isLocked && (
        <>
          <ScoreCard
            score={score}
            methodology={methodology}
            tReady={t("score.ready", { defaultValue: "Ready for submission" })}
            tClose={t("score.close", { defaultValue: "Almost there" })}
            tNotReady={t("score.notReady", { defaultValue: "Not ready" })}
            tCritical={t("score.criticalFailure", {
              defaultValue: "Critical check failing — capped at 60",
            })}
            tPassed={t("score.passed", { defaultValue: "passed" })}
            tFailed={t("score.failed", { defaultValue: "failed" })}
            tPending={t("score.pending", { defaultValue: "pending" })}
          />

          {expanded && (
            <div className="space-y-3">
              {/* Auto checks */}
              {score.results.some((r) => r.check.type === "auto") && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {t("score.autoChecks", { defaultValue: "Automated checks" })}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {score.results
                      .filter((r) => r.check.type === "auto")
                      .map(({ check, status, detail }) => (
                        <CheckRow
                          key={check.id}
                          labelKey={check.labelKey}
                          descKey={check.descKey}
                          status={status}
                          detail={detail}
                          critical={check.critical}
                          t={t}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Manual checks */}
              {score.results.some((r) => r.check.type === "manual") && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldQuestion className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {t("score.manualChecks", { defaultValue: "Manual confirmations" })}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      — {t("score.manualHint", { defaultValue: "Click to cycle: unset → yes → no" })}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {score.results
                      .filter((r) => r.check.type === "manual")
                      .map(({ check, status }) => (
                        <ManualCheckRow
                          key={check.id}
                          labelKey={check.labelKey}
                          descKey={check.descKey}
                          status={status}
                          critical={check.critical}
                          onToggle={() => toggleManual(check.id)}
                          t={t}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="bg-secondary/20 border border-border rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {t("score.disclaimer", {
                      methodology: methodology.shortName,
                      defaultValue: `This assessment is a pre-audit heuristic aligned with the ${methodology.shortName} methodology. Final certification requires formal review by ${methodology.shortName} and third-party verifiers.`,
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Score display card ─────────────────────────────────────────────────────

function ScoreCard({
  score,
  methodology,
  tReady,
  tClose,
  tNotReady,
  tCritical,
  tPassed,
  tFailed,
  tPending,
}: {
  score: BiocharProScore;
  methodology: ReturnType<typeof getMethodology>;
  tReady: string;
  tClose: string;
  tNotReady: string;
  tCritical: string;
  tPassed: string;
  tFailed: string;
  tPending: string;
}) {
  const tierLabel =
    score.tier === "ready" ? tReady : score.tier === "close" ? tClose : tNotReady;
  const color = scoreColor(score);
  const bg = scoreBgColor(score);

  return (
    <div className={`border rounded-xl p-5 ${bg}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1">
            BiocharPro Score · {methodology.shortName}
          </div>
          <div className="flex items-baseline gap-2">
            <div className={`text-5xl font-mono font-bold ${color}`}>{score.value}</div>
            <div className="text-lg text-muted-foreground font-semibold">/100</div>
          </div>
          <div className={`text-xs font-semibold mt-1 ${color} flex items-center gap-1`}>
            {score.criticalFailure && <AlertTriangle className="w-3 h-3" />}
            {tierLabel}
          </div>
          {score.criticalFailure && (
            <div className="text-[10px] text-red-500 mt-1">{tCritical}</div>
          )}
        </div>
        <div className="text-right space-y-0.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs justify-end">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            <span className="font-mono">{score.passed}</span>
            <span className="text-muted-foreground">{tPassed}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs justify-end">
            <XCircle className="w-3 h-3 text-red-500" />
            <span className="font-mono">{score.failed}</span>
            <span className="text-muted-foreground">{tFailed}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs justify-end">
            <HelpCircle className="w-3 h-3 text-muted-foreground" />
            <span className="font-mono">{score.pending}</span>
            <span className="text-muted-foreground">{tPending}</span>
          </div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-2 bg-background/50 rounded-full overflow-hidden flex">
        <div
          className="bg-green-500 transition-all"
          style={{ width: `${score.weightedTotal > 0 ? (score.weightedPassed / score.weightedTotal) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

// ─── Individual check rows ──────────────────────────────────────────────────

function CheckRow({
  labelKey,
  descKey,
  status,
  detail,
  critical,
  t,
}: {
  labelKey: string;
  descKey: string;
  status: string;
  detail?: string;
  critical: boolean;
  t: (key: string, opts?: any) => string;
}) {
  const pass = status === "pass";
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2.5">
      {pass ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium flex items-center gap-1.5">
          {t(labelKey)}
          {critical && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 font-bold uppercase tracking-wider">
              {t("score.critical", { defaultValue: "Critical" })}
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground">{t(descKey)}</div>
      </div>
      {detail && (
        <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">{detail}</span>
      )}
    </div>
  );
}

function ManualCheckRow({
  labelKey,
  descKey,
  status,
  critical,
  onToggle,
  t,
}: {
  labelKey: string;
  descKey: string;
  status: string;
  critical: boolean;
  onToggle: () => void;
  t: (key: string, opts?: any) => string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 bg-card border border-border rounded-lg px-3 py-2.5 text-left hover:bg-secondary/30 transition-colors"
    >
      {status === "manual_pass" ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : status === "manual_fail" ? (
        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium flex items-center gap-1.5">
          {t(labelKey)}
          {critical && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 font-bold uppercase tracking-wider">
              {t("score.critical", { defaultValue: "Critical" })}
            </span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground">{t(descKey)}</div>
      </div>
    </button>
  );
}
