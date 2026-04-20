/**
 * BiocharPro Score — the 0-100 certification readiness number.
 *
 * Applied per methodology: a project scores differently against Puro.earth vs
 * Isometric vs Verra because each has distinct requirements.
 *
 * Scoring rules:
 * - Each check has a weight (1-10); sum of all weights = maxScore denominator
 * - Passed checks contribute their full weight to the numerator
 * - Pending/failed checks contribute 0
 * - If any CRITICAL check fails → score capped at 60 (project not ready)
 * - Critical checks pending are shown as warnings but don't cap the score
 *   (user just hasn't confirmed them yet)
 *
 * Status → contribution:
 *   pass / manual_pass         → full weight in numerator
 *   fail / manual_fail         → 0 (critical = cap at 60)
 *   pending                    → 0
 */

import type { BiocharResult, Feedstock } from "./biocharModel";
import type { Methodology, MethodologyCheck, CheckInput } from "./methodologies";

export type CheckStatus =
  | "pass"
  | "fail"
  | "manual_pass"
  | "manual_fail"
  | "pending";

export interface CheckResult {
  check: MethodologyCheck;
  status: CheckStatus;
  detail?: string;
}

export interface BiocharProScore {
  /** 0-100, rounded. */
  value: number;
  /** Interpretation: "ready" (≥ minPassingScore), "close" (60-79), "not-ready" (<60). */
  tier: "ready" | "close" | "not-ready";
  /** If a critical check failed, cap was triggered. */
  criticalFailure: boolean;
  /** Counts for display. */
  passed: number;
  failed: number;
  pending: number;
  /** Weighted values. */
  weightedPassed: number;
  weightedTotal: number;
  /** All check results, in source order. */
  results: CheckResult[];
}

// ─── Inputs needed by the score calculator ──────────────────────────────────

export interface ScoreInput extends CheckInput {
  /** Map of check-id → boolean | undefined (for manual checks). */
  manualStates: Record<string, boolean | undefined>;
}

// ─── Score calculation ──────────────────────────────────────────────────────

export function calculateScore(
  methodology: Methodology,
  input: ScoreInput,
): BiocharProScore {
  const results: CheckResult[] = [];
  let weightedPassed = 0;
  let weightedTotal = 0;
  let criticalFailure = false;
  let passed = 0;
  let failed = 0;
  let pending = 0;

  for (const check of methodology.checks) {
    weightedTotal += check.weight;

    let status: CheckStatus;
    let detail: string | undefined;

    if (check.type === "auto") {
      if (!check.evaluator) {
        status = "pending";
      } else {
        const r = check.evaluator(input);
        status = r.pass ? "pass" : "fail";
        detail = r.detail;
      }
    } else {
      // Manual
      const s = input.manualStates[check.id];
      if (s === true) status = "manual_pass";
      else if (s === false) status = "manual_fail";
      else status = "pending";
    }

    // Accumulate
    if (status === "pass" || status === "manual_pass") {
      weightedPassed += check.weight;
      passed++;
    } else if (status === "fail" || status === "manual_fail") {
      failed++;
      if (check.critical) criticalFailure = true;
    } else {
      pending++;
    }

    results.push({ check, status, detail });
  }

  // Raw score
  let value = weightedTotal > 0 ? Math.round((weightedPassed / weightedTotal) * 100) : 0;

  // Apply critical cap
  if (criticalFailure && value > 60) {
    value = 60;
  }

  // Tier
  const tier: BiocharProScore["tier"] =
    value >= methodology.minPassingScore
      ? "ready"
      : value >= 60
        ? "close"
        : "not-ready";

  return {
    value,
    tier,
    criticalFailure,
    passed,
    failed,
    pending,
    weightedPassed,
    weightedTotal,
    results,
  };
}

// ─── Convenience: compare across methodologies ──────────────────────────────

export interface MethodologyScoreComparison {
  methodologyId: string;
  methodologyName: string;
  score: BiocharProScore;
}

export function compareAcrossMethodologies(
  methodologies: Methodology[],
  input: ScoreInput,
): MethodologyScoreComparison[] {
  return methodologies
    .filter((m) => m.checks.length > 0) // skip "coming soon"
    .map((m) => ({
      methodologyId: m.id,
      methodologyName: m.shortName,
      score: calculateScore(m, input),
    }))
    .sort((a, b) => b.score.value - a.score.value);
}

// ─── Visual helpers ─────────────────────────────────────────────────────────

export function scoreColor(score: BiocharProScore): string {
  if (score.criticalFailure) return "text-red-500";
  if (score.tier === "ready") return "text-green-500";
  if (score.tier === "close") return "text-yellow-500";
  return "text-red-500";
}

export function scoreBgColor(score: BiocharProScore): string {
  if (score.criticalFailure) return "bg-red-500/10 border-red-500/30";
  if (score.tier === "ready") return "bg-green-500/10 border-green-500/30";
  if (score.tier === "close") return "bg-yellow-500/10 border-yellow-500/30";
  return "bg-red-500/10 border-red-500/30";
}

export function scoreLabel(score: BiocharProScore, tReady: string, tClose: string, tNotReady: string): string {
  if (score.tier === "ready") return tReady;
  if (score.tier === "close") return tClose;
  return tNotReady;
}
