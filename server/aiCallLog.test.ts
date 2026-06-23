/**
 * Smoke tests for the generic AI call logger.
 *
 * Covers the two things that matter:
 *   1. Cost estimator math matches Gemini 2.5 Flash pricing.
 *   2. logAiCall() never throws — it's best-effort and must not break the
 *      feature's main path if the DB is down or insert fails.
 */

import { describe, it, expect, vi } from "vitest";

// Mock the DB so we don't need a live SQLite instance.
vi.mock("./db", () => ({
  requireDb: vi.fn(() => {
    throw new Error("DB not available in tests");
  }),
}));

import { estimateCostUsd, logAiCall } from "./_core/aiCallLog";

describe("estimateCostUsd", () => {
  it("returns 0 for 0 tokens", () => {
    expect(estimateCostUsd(0, 0)).toBe(0);
  });

  it("computes Gemini 2.5 Flash pricing: $0.075/M input, $0.30/M output", () => {
    // 1M input tokens = $0.075
    expect(estimateCostUsd(1_000_000, 0)).toBeCloseTo(0.075, 6);
    // 1M output tokens = $0.30
    expect(estimateCostUsd(0, 1_000_000)).toBeCloseTo(0.30, 6);
    // 500k in + 200k out = 500k*0.075/M + 200k*0.30/M = 0.0375 + 0.06 = 0.0975
    expect(estimateCostUsd(500_000, 200_000)).toBeCloseTo(0.0975, 6);
  });

  it("handles realistic buyer_readiness call volume (~2k prompt, ~800 completion)", () => {
    const cost = estimateCostUsd(2_000, 800);
    // 2000 * 0.075/1e6 + 800 * 0.30/1e6 = 0.00015 + 0.00024 = 0.00039
    expect(cost).toBeCloseTo(0.00039, 8);
    // Matches the "~$0.001-0.002 per check" claim in the UI
    expect(cost).toBeLessThan(0.001);
  });
});

describe("logAiCall", () => {
  it("does not throw when the DB insert fails", () => {
    // requireDb is mocked to throw — this simulates DB unavailable or
    // insert failure. The logger must swallow the error, not propagate.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() =>
      logAiCall({
        feature: "buyer_readiness",
        userId: 1,
        projectId: 42,
        promptTokens: 2000,
        completionTokens: 800,
      }),
    ).not.toThrow();
    warn.mockRestore();
  });

  it("does not throw with minimal input (feature only)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => logAiCall({ feature: "test_feature" })).not.toThrow();
    warn.mockRestore();
  });

  it("does not throw on error status with long errorMsg", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() =>
      logAiCall({
        feature: "audit_package.exec_summary",
        userId: 1,
        status: "error",
        errorMsg: "LLM call threw: ".repeat(100),
        metadata: { evidenceCount: 50, buyerName: "Microsoft" },
      }),
    ).not.toThrow();
    warn.mockRestore();
  });
});
