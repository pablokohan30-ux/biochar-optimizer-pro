/**
 * MethodologyComparison — the killer cross-methodology dashboard.
 *
 * "Tu proyecto contra todas las certificaciones a la vez."
 *
 * Shows the BiocharPro Score for the same project against every active
 * methodology (Puro.earth, Isometric, EBC, Verra VM0044…), sorted best-fit first.
 * Calls out the top recommendation with reasoning.
 *
 * Manual check states are SHARED with `MethodologyAssessment` via the same
 * localStorage key (`assessment_<projectKey>`), so the user only confirms a
 * check once and it propagates across methodologies.
 *
 * Tier-gated to Engineer+ — this is the highest-tier marketing feature.
 */

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Trophy, Award, AlertTriangle, ChevronRight, CheckCircle2,
  XCircle, HelpCircle, Lock, Zap,
} from "lucide-react";
import type { BiocharResult, Feedstock } from "@/lib/biocharModel";
import {
  ACTIVE_METHODOLOGIES,
  METHODOLOGIES,
  type Methodology,
} from "@/lib/methodologies";
import {
  calculateScore,
  scoreColor,
  scoreBgColor,
  type BiocharProScore,
} from "@/lib/biocharScore";
import { useTier } from "@/hooks/useTier";

interface MethodologyComparisonProps {
  result: BiocharResult;
  feedstock: Feedstock;
  temperature: number;
  residenceTime: number;
  plantCapacityTph: number | null;
  country: string | null;
  /** Same localStorage namespace as MethodologyAssessment so manual toggles are shared. */
  projectKey?: string;
  /** When true, bypasses the Engineer-tier gate (used by the public /demo page). */
  forceUnlocked?: boolean;
}

type ManualState = Record<string, Record<string, boolean | undefined>>;

interface ScoredMethodology {
  methodology: Methodology;
  score: BiocharProScore;
  /** Whether the user's tier unlocks this methodology. */
  unlocked: boolean;
}

export default function MethodologyComparison({
  result,
  feedstock,
  temperature,
  residenceTime,
  plantCapacityTph,
  country,
  projectKey = "default",
  forceUnlocked = false,
}: MethodologyComparisonProps) {
  const { t } = useTranslation("projectDetail");
  const { hasAccess } = useTier();

  // Read manual states from the same localStorage key as MethodologyAssessment
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

  // Keep in sync with localStorage in case MethodologyAssessment writes to it.
  // We listen for the storage event (fires across tabs) AND poll on mount /
  // when the key changes.
  useEffect(() => {
    const reload = () => {
      try {
        const raw = localStorage.getItem(storageKey);
        setManualStates(raw ? JSON.parse(raw) : {});
      } catch {}
    };
    window.addEventListener("storage", reload);
    // Also reload when the comparison panel becomes visible (cheap)
    const interval = setInterval(reload, 2000);
    return () => {
      window.removeEventListener("storage", reload);
      clearInterval(interval);
    };
  }, [storageKey]);

  // Compute scores for every active methodology
  const scored: ScoredMethodology[] = useMemo(() => {
    return ACTIVE_METHODOLOGIES.map((id) => {
      const methodology = METHODOLOGIES[id];
      const currentManual = manualStates[id] ?? {};
      const score = calculateScore(methodology, {
        result,
        feedstock,
        temperature,
        residenceTime,
        plantCapacityTph,
        country,
        manualStates: currentManual,
      });
      return {
        methodology,
        score,
        unlocked: forceUnlocked || hasAccess(methodology.requiredTier),
      };
    }).sort((a, b) => {
      // Sort: highest unlocked & ready first, then by score
      if (a.score.tier === "ready" && b.score.tier !== "ready") return -1;
      if (b.score.tier === "ready" && a.score.tier !== "ready") return 1;
      return b.score.value - a.score.value;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualStates, result, feedstock, temperature, residenceTime, plantCapacityTph, country, hasAccess, forceUnlocked]);

  // Pick the recommended methodology (highest unlocked, no critical fails, ready)
  const recommendation = useMemo(() => {
    const ready = scored.find((s) => s.unlocked && s.score.tier === "ready" && !s.score.criticalFailure);
    if (ready) return { item: ready, reason: "ready" as const };
    const close = scored.find((s) => s.unlocked && s.score.tier === "close" && !s.score.criticalFailure);
    if (close) return { item: close, reason: "close" as const };
    const top = scored.find((s) => s.unlocked) ?? scored[0];
    return { item: top, reason: "best-effort" as const };
  }, [scored]);

  if (!forceUnlocked && !hasAccess("engineer")) {
    return <ComparisonLockedCard t={t} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
          {t("comparison.title", { defaultValue: "Cross-methodology comparison" })}
        </h3>
        <span className="text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
          {t("comparison.killerFeature", { defaultValue: "Engineer feature" })}
        </span>
      </div>

      {/* Recommendation banner */}
      {recommendation && (
        <div className={`border rounded-xl p-4 ${recommendation.item.score.tier === "ready" ? "bg-green-500/5 border-green-500/30" : recommendation.item.score.tier === "close" ? "bg-yellow-500/5 border-yellow-500/30" : "bg-red-500/5 border-red-500/30"}`}>
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 ${recommendation.item.score.tier === "ready" ? "text-green-500" : recommendation.item.score.tier === "close" ? "text-yellow-500" : "text-red-500"}`}>
              <Award className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                {t("comparison.bestFit", { defaultValue: "Best fit" })}
              </div>
              <div className="text-base font-bold">
                {recommendation.item.methodology.shortName} ·{" "}
                <span className={scoreColor(recommendation.item.score)}>
                  {recommendation.item.score.value}/100
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {recommendation.reason === "ready" && t("comparison.reasonReady", {
                  name: recommendation.item.methodology.shortName,
                  defaultValue: `Your project meets {{name}}'s requirements with no critical issues. Recommended next step: prepare formal submission.`,
                })}
                {recommendation.reason === "close" && t("comparison.reasonClose", {
                  name: recommendation.item.methodology.shortName,
                  defaultValue: `{{name}} is your closest fit. Resolve the pending checks below to push the score above the {{name}} passing threshold.`,
                })}
                {recommendation.reason === "best-effort" && t("comparison.reasonBestEffort", {
                  name: recommendation.item.methodology.shortName,
                  defaultValue: `{{name}} is currently the highest scoring methodology, but you're below the passing threshold across the board. Resolve critical checks (lab tests, additionality docs) to unlock submissions.`,
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Score cards — one per active methodology */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {scored.map(({ methodology, score, unlocked }) => (
          <ComparisonScoreCard
            key={methodology.id}
            methodology={methodology}
            score={score}
            unlocked={unlocked}
            isRecommended={recommendation?.item.methodology.id === methodology.id}
            t={t}
          />
        ))}
      </div>

      {/* What this means */}
      <div className="bg-muted/20 border border-border rounded-lg p-3 text-[10px] text-muted-foreground leading-relaxed">
        <strong>{t("comparison.howItWorks", { defaultValue: "How this works:" })} </strong>
        {t("comparison.howItWorksBody", {
          defaultValue: "Each methodology has its own checks (some auto-evaluated from your simulation, some manual confirmations). Your project is scored independently against each. Manual confirmations you make in any methodology automatically apply here too. Click into a methodology in the BiocharPro Score panel above to confirm individual checks.",
        })}
      </div>
    </div>
  );
}

// ─── Score card per methodology ─────────────────────────────────────────────

function ComparisonScoreCard({
  methodology,
  score,
  unlocked,
  isRecommended,
  t,
}: {
  methodology: Methodology;
  score: BiocharProScore;
  unlocked: boolean;
  isRecommended: boolean;
  t: (key: string, opts?: any) => string;
}) {
  const color = scoreColor(score);
  const bg = scoreBgColor(score);

  return (
    <div className={`border rounded-xl p-4 relative ${bg} ${isRecommended ? "ring-2 ring-primary/40" : ""}`}>
      {isRecommended && (
        <div className="absolute -top-2.5 left-3 bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
          <Trophy className="w-2.5 h-2.5" />
          {t("comparison.bestFitBadge", { defaultValue: "Best fit" })}
        </div>
      )}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-bold ${methodology.color}`}>
            {methodology.shortName}
          </div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
            {methodology.credits ? t("comparison.creditIssuing", { defaultValue: "Credits" }) : t("comparison.qualityOnly", { defaultValue: "Quality" })}
          </div>
        </div>
        {!unlocked && (
          <div title={t("comparison.lockedHint", { tier: methodology.requiredTier, defaultValue: `Requires ${methodology.requiredTier} plan` })}>
            <Lock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className={`text-3xl font-mono font-bold ${color}`}>{score.value}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>
      <div className={`text-[10px] font-semibold ${color} flex items-center gap-1`}>
        {score.criticalFailure && <AlertTriangle className="w-3 h-3" />}
        {score.tier === "ready"
          ? t("comparison.tierReady", { defaultValue: "Ready" })
          : score.tier === "close"
          ? t("comparison.tierClose", { defaultValue: "Close" })
          : t("comparison.tierNotReady", { defaultValue: "Not ready" })}
      </div>
      {/* Mini progress bar */}
      <div className="mt-2 h-1.5 bg-background/50 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${score.tier === "ready" ? "bg-green-500" : score.tier === "close" ? "bg-yellow-500" : "bg-red-500"}`}
          style={{ width: `${score.weightedTotal > 0 ? (score.weightedPassed / score.weightedTotal) * 100 : 0}%` }}
        />
      </div>
      {/* Counts */}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-0.5">
          <CheckCircle2 className="w-2.5 h-2.5 text-green-500" /> {score.passed}
        </span>
        <span className="inline-flex items-center gap-0.5">
          <XCircle className="w-2.5 h-2.5 text-red-500" /> {score.failed}
        </span>
        <span className="inline-flex items-center gap-0.5">
          <HelpCircle className="w-2.5 h-2.5" /> {score.pending}
        </span>
      </div>
    </div>
  );
}

// ─── Locked state for non-Engineer users ────────────────────────────────────

function ComparisonLockedCard({ t }: { t: (k: string, opts?: any) => string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          {t("comparison.title", { defaultValue: "Cross-methodology comparison" })}
        </h3>
      </div>
      <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-6 text-center">
        <Zap className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <h4 className="font-bold text-base mb-1">
          {t("comparison.lockedTitle", { defaultValue: "Compare your project against every certification at once" })}
        </h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto mb-3 leading-relaxed">
          {t("comparison.lockedBody", { defaultValue: "See your BiocharPro Score against Puro.earth, Isometric, Verra VM0044, EBC and more — side by side. Get an automated recommendation on the best fit for your project. Available on the Engineer plan." })}
        </p>
        <a href="/pricing">
          <button className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-4 py-2 rounded-md inline-flex items-center gap-1.5">
            {t("comparison.unlockCta", { defaultValue: "Unlock with Engineer plan" })}
            <ChevronRight className="w-3 h-3" />
          </button>
        </a>
      </div>
    </div>
  );
}
