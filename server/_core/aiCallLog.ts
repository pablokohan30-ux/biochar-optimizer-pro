/**
 * Generic AI call logger.
 *
 * Every LLM call outside the AI Project Builder (which has its own table)
 * should call `logAiCall()` right after invokeLLM returns — success OR
 * error. Lets `/admin/ai-stats` surface per-feature token + cost usage so
 * we can catch runaway costs before the Gemini bill surprises us.
 *
 * Pricing is hardcoded to Gemini 2.5 Flash rates (USD per 1M tokens):
 *   - input:  $0.075
 *   - output: $0.30
 *
 * If Gemini pricing changes or we switch models, update GEMINI_FLASH_RATES
 * here — nothing else needs to change.
 */

import { and, desc, eq, isNotNull } from "drizzle-orm";
import { requireDb } from "../db";
import { aiCallLog } from "../../drizzle/schema";

const GEMINI_FLASH_RATES = {
  inputPer1M: 0.075,
  outputPer1M: 0.30,
};

export function estimateCostUsd(promptTokens: number, completionTokens: number): number {
  return (
    (promptTokens / 1_000_000) * GEMINI_FLASH_RATES.inputPer1M +
    (completionTokens / 1_000_000) * GEMINI_FLASH_RATES.outputPer1M
  );
}

export type LogAiCallInput = {
  userId?: number | null;
  feature: string;
  projectId?: number | null;
  promptTokens?: number;
  completionTokens?: number;
  status?: "ok" | "error";
  errorMsg?: string | null;
  metadata?: Record<string, unknown> | null;
  /** Full parsed LLM response. Persist when the UI wants to re-hydrate the
   *  last run. Serialize as JSON string if not already a string. */
  output?: unknown;
};

/**
 * Best-effort logger — NEVER throws. If the DB is down or the insert
 * fails, we log to console and move on. Under no circumstances should a
 * logging failure break the actual AI feature for the user.
 */
export function logAiCall(input: LogAiCallInput): void {
  try {
    const db = requireDb();
    const prompt = input.promptTokens ?? 0;
    const completion = input.completionTokens ?? 0;
    const costUsd = estimateCostUsd(prompt, completion);
    let outputStr: string | null = null;
    if (input.output !== undefined && input.output !== null) {
      outputStr = typeof input.output === "string" ? input.output : JSON.stringify(input.output);
    }
    db.insert(aiCallLog).values({
      userId: input.userId ?? null,
      feature: input.feature,
      projectId: input.projectId ?? null,
      promptTokens: prompt,
      completionTokens: completion,
      costUsd,
      status: input.status ?? "ok",
      errorMsg: input.errorMsg ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      output: outputStr,
    }).run();
  } catch (err) {
    console.warn("[aiCallLog] insert failed (non-fatal):", err);
  }
}

export type LatestAiRun<T> = {
  output: T;
  createdAt: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  metadata: Record<string, unknown> | null;
} | null;

/**
 * Look up the most recent successful run for (user, feature, project?) that
 * persisted an output. Returns null when nothing is on record — the caller
 * treats that as "user hasn't run this yet."
 *
 * Type-parameterised so buyer-readiness / buyer-match / audit-summary each
 * get their own return shape without an unsafe cast at the call site.
 */
export function getLatestAiRunOutput<T = unknown>(params: {
  userId: number;
  feature: string;
  projectId?: number | null;
}): LatestAiRun<T> {
  try {
    const db = requireDb();
    const filters = [
      eq(aiCallLog.userId, params.userId),
      eq(aiCallLog.feature, params.feature),
      eq(aiCallLog.status, "ok"),
      isNotNull(aiCallLog.output),
    ];
    if (params.projectId != null) {
      filters.push(eq(aiCallLog.projectId, params.projectId));
    }
    const rows = db
      .select()
      .from(aiCallLog)
      .where(and(...filters))
      .orderBy(desc(aiCallLog.createdAt))
      .limit(1)
      .all();
    if (rows.length === 0) return null;
    const row = rows[0];
    let parsed: T | null = null;
    try {
      parsed = row.output ? (JSON.parse(row.output) as T) : null;
    } catch {
      return null;
    }
    if (parsed === null) return null;
    let metadata: Record<string, unknown> | null = null;
    if (row.metadata) {
      try {
        metadata = JSON.parse(row.metadata) as Record<string, unknown>;
      } catch {
        metadata = null;
      }
    }
    return {
      output: parsed,
      createdAt: row.createdAt ? new Date(row.createdAt).getTime() : 0,
      promptTokens: row.promptTokens ?? 0,
      completionTokens: row.completionTokens ?? 0,
      costUsd: row.costUsd ?? 0,
      metadata,
    };
  } catch (err) {
    console.warn("[aiCallLog] getLatest failed (non-fatal):", err);
    return null;
  }
}
