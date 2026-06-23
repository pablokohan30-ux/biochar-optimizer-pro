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
    }).run();
  } catch (err) {
    console.warn("[aiCallLog] insert failed (non-fatal):", err);
  }
}
