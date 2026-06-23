/**
 * Smoke tests for the BUYERS catalog used by Buyer Readiness + Buyer Match.
 *
 * The catalog is hardcoded from each buyer's public procurement guidance.
 * These tests protect against:
 *   - Breaking a field shape when adding/editing a buyer
 *   - Dropping a required criterion attribute (weight, dealBreaker, id)
 *   - Accidentally ending up with empty criteria arrays
 */

import { describe, it, expect } from "vitest";
import { BUYERS } from "./buyerReadinessRouter";

describe("BUYERS catalog", () => {
  it("has the 4 major CDR buyers configured", () => {
    const ids = BUYERS.map((b) => b.id).sort();
    expect(ids).toEqual(["altitude", "frontier", "microsoft", "shell"]);
  });

  it("every buyer has required fields (id, name, description, publicUrl, criteria)", () => {
    for (const b of BUYERS) {
      expect(b.id).toBeTruthy();
      expect(b.name).toBeTruthy();
      expect(b.description).toBeTruthy();
      expect(b.publicUrl).toMatch(/^https?:\/\//);
      expect(Array.isArray(b.criteria)).toBe(true);
      expect(b.criteria.length).toBeGreaterThan(0);
    }
  });

  it("every criterion has required fields with valid shapes", () => {
    for (const b of BUYERS) {
      for (const c of b.criteria) {
        expect(typeof c.id).toBe("string");
        expect(c.id.length).toBeGreaterThan(0);
        expect(typeof c.label).toBe("string");
        expect(c.label.length).toBeGreaterThan(0);
        expect(typeof c.weight).toBe("number");
        expect(c.weight).toBeGreaterThan(0);
        expect(c.weight).toBeLessThanOrEqual(10);
        expect(typeof c.dealBreaker).toBe("boolean");
        expect(typeof c.detail).toBe("string");
        expect(c.detail.length).toBeGreaterThan(0);
      }
    }
  });

  it("every buyer has at least one deal-breaker (otherwise gating doesn't work)", () => {
    for (const b of BUYERS) {
      const dealBreakers = b.criteria.filter((c) => c.dealBreaker);
      expect(dealBreakers.length).toBeGreaterThan(0);
    }
  });

  it("Microsoft demands the post-April-2026 operational + end-use + community evidence criteria", () => {
    const ms = BUYERS.find((b) => b.id === "microsoft");
    expect(ms).toBeDefined();
    // These three map to Microsoft's April 2026 statement on DD requirements.
    const ids = ms!.criteria.map((c) => c.id);
    expect(ids).toContain("ms_operational");
    expect(ids).toContain("ms_end_use_traceability");
    expect(ids).toContain("ms_community_impact");
    // All three must be deal-breakers per the Microsoft guidance.
    expect(ms!.criteria.find((c) => c.id === "ms_operational")!.dealBreaker).toBe(true);
    expect(ms!.criteria.find((c) => c.id === "ms_end_use_traceability")!.dealBreaker).toBe(true);
    expect(ms!.criteria.find((c) => c.id === "ms_community_impact")!.dealBreaker).toBe(true);
  });
});
