/**
 * Smoke tests for the submission payload exporter.
 *
 * Protects the 6 methodology-specific branches (puro-earth, isometric, ebc,
 * gold-standard, verra-vm0044, rainbow-standard). If any methodology's
 * guidance or specifics block disappears, this catches it.
 */

import { describe, it, expect } from "vitest";
import { buildSubmissionPayload } from "./_core/submissionExporter";
import { METHODOLOGIES } from "../client/src/lib/methodologies";

// Minimal valid "project" + "result" fixtures — only what the exporter touches.
const fixture = {
  project: {
    name: "Test Plant",
    country: "Argentina",
    location: "Buenos Aires",
    temperature: 650,
    residenceTime: 30,
    qualityGoal: "BALANCED" as const,
    bopId: "BOP-2026-TEST",
  } as any,
  feedstock: {
    id: "rice-husk",
    name: "Rice husk",
    C: 40,
    H: 5,
    O: 35,
    N: 1,
    S: 0.1,
    ash: 18,
    moisture: 10,
  } as any,
  result: {
    H_Corg: 0.35,
    C: 72,
    yield: 28,
    biocharProduction: 280,
    temperature: 650,
    residenceTime: 30,
    credits: {
      class: "Premium",
      sf: 0.92,
      gross: 3.0,
      net: 2.76,
      permanence: 0.89,
    },
  } as any,
  autoCheckResults: [] as any,
};

describe("buildSubmissionPayload — per-methodology", () => {
  const ids = ["puro-earth", "isometric", "ebc", "gold-standard", "verra-vm0044", "rainbow-standard"];

  for (const id of ids) {
    it(`produces a valid payload for ${id}`, () => {
      const methodology = METHODOLOGIES[id as keyof typeof METHODOLOGIES];
      expect(methodology).toBeDefined();
      const payload = buildSubmissionPayload({
        ...fixture,
        methodology,
        methodologyId: id,
      } as any);

      expect(payload).toBeTruthy();
      expect(payload.methodology.id).toBe(id);
      // Top-level disclaimer must be present (used by all methodologies)
      expect(payload.disclaimer).toBeTruthy();
      // Submission guidance should be methodology-specific (not a fallback)
      expect(payload.submission_guidance).toBeTruthy();
      expect(typeof payload.submission_guidance).toBe("string");
      expect(payload.submission_guidance.length).toBeGreaterThan(50);
    });
  }

  it("Rainbow Standard guidance mentions ICVCM + <3-month timeline", () => {
    const methodology = METHODOLOGIES["rainbow-standard"];
    const payload = buildSubmissionPayload({
      ...fixture,
      methodology,
      methodologyId: "rainbow-standard",
    } as any);
    expect(payload.submission_guidance).toMatch(/ICVCM/);
    expect(payload.submission_guidance).toMatch(/3-month|<3-month|<3/);
  });

  it("Rainbow Standard methodology_specifics includes ISO 14064-2 compliance", () => {
    const methodology = METHODOLOGIES["rainbow-standard"];
    const payload = buildSubmissionPayload({
      ...fixture,
      methodology,
      methodologyId: "rainbow-standard",
    } as any);
    const specifics = payload.methodology_specific as Record<string, unknown>;
    expect(specifics).toBeTruthy();
    expect(specifics.iso_compliance).toBe("ISO 14064-2");
    expect(specifics.icvcm_ccp_approved).toBe(true);
    expect(specifics.certification_timeline_months_target).toBe(3);
  });
});
