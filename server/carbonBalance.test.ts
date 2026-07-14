import { describe, it, expect } from "vitest";
import { computeCarbonBalance } from "./_core/carbonBalance";

/**
 * Regression tests for the AI Project Builder mass-balance bug reported
 * against project 9 ("Nexus Carbon Uruguay Pine Biochar V2"):
 *
 *   66,449 tn/yr wet biomass, Pine Sawdust, 46% moisture, Puro.earth.
 *
 * The buggy version produced 19,935 tn biochar/yr and 59,804 tCO₂e/yr
 * by multiplying the WET tonnage by 0.30 and by a generic 3.0 factor.
 * The correct output is ~10,765 tn biochar/yr and ~26,300 tCO₂e/yr
 * (net, after 85% Puro permanence, using a pine-typical 78% C_org).
 */

describe("computeCarbonBalance — Nexus Uruguay Pine V2 regression", () => {
  const NEXUS_INPUT = {
    capacityTnYearWet: 66_449,
    moisturePct: 46,
    methodology: "puro-earth",
    feedstockId: "pine_sawdust",
    biomassName: "Pine Sawdust (Pinus spp.)",
  };

  it("computes dry biomass by subtracting moisture from wet input", () => {
    const r = computeCarbonBalance(NEXUS_INPUT);
    // 66,449 × (1 − 0.46) = 35,882.46
    expect(r.dryBiomassTnYear).toBeCloseTo(35_882.46, 1);
  });

  it("applies the 30% yield to DRY biomass, not wet — matches the technical overview number", () => {
    const r = computeCarbonBalance(NEXUS_INPUT);
    // 35,882.46 × 0.30 = 10,764.7
    expect(r.biocharTnYear).toBeCloseTo(10_764.7, 1);
    // Bug regression: the old buggy value was 19,935. New must NOT be that.
    expect(r.biocharTnYear).toBeLessThan(11_000);
    expect(r.biocharTnYear).toBeLessThan(19_000);
  });

  it("uses lookup-C_org (pine=78%) when the lab hasn't provided a measured value", () => {
    const r = computeCarbonBalance(NEXUS_INPUT);
    expect(r.inputs.cOrgPct).toBe(78);
    expect(r.inputs.provenance.cOrg).toBe("typical");
  });

  it("computes net CORCs at ~26,000 tCO₂e/yr — NOT the buggy 59,804", () => {
    const r = computeCarbonBalance(NEXUS_INPUT);
    // 10,764.7 × 0.78 × (44/12) × 0.85 = ~26,166
    expect(r.corcTnYearNet).toBeGreaterThan(25_000);
    expect(r.corcTnYearNet).toBeLessThan(28_000);
    // Explicit regression against the buggy figure
    expect(r.corcTnYearNet).toBeLessThan(40_000);
  });

  it("derives an effective factor around 2.4 tCO₂e/t biochar — NOT the generic 3.0", () => {
    const r = computeCarbonBalance(NEXUS_INPUT);
    // 0.78 × (44/12) × 0.85 = 2.43
    expect(r.tCO2ePerTonneBiochar).toBeCloseTo(2.43, 2);
  });

  it("labels the grounding block so the LLM cannot ignore or re-derive", () => {
    const r = computeCarbonBalance(NEXUS_INPUT);
    expect(r.groundingBlock).toMatch(/DO NOT recalculate/);
    expect(r.groundingBlock).toContain("30% of DRY biomass");
    // The corrected biochar output shows up verbatim
    expect(r.groundingBlock).toMatch(/10,76[45]/);
  });
});

describe("computeCarbonBalance — inputs & fallbacks", () => {
  it("falls back to 15% moisture when the lab hasn't measured it", () => {
    const r = computeCarbonBalance({ capacityTnYearWet: 10_000 });
    expect(r.inputs.moisturePct).toBe(15);
    expect(r.inputs.provenance.moisture).toBe("default");
    expect(r.dryBiomassTnYear).toBeCloseTo(8_500, 0);
  });

  it("prefers explicit permanenceFactor over the methodology default", () => {
    const r = computeCarbonBalance({
      capacityTnYearWet: 10_000,
      methodology: "puro-earth",
      permanenceFactor: 0.65,
    });
    expect(r.inputs.permanenceFactor).toBe(0.65);
    expect(r.inputs.provenance.permanence).toBe("input");
  });

  it("applies methodology-specific permanence (Isometric 0.90 vs Puro 0.85)", () => {
    const iso = computeCarbonBalance({ capacityTnYearWet: 10_000, methodology: "isometric" });
    const puro = computeCarbonBalance({ capacityTnYearWet: 10_000, methodology: "puro-earth" });
    expect(iso.inputs.permanenceFactor).toBe(0.90);
    expect(puro.inputs.permanenceFactor).toBe(0.85);
    // Isometric → higher net CORCs given same biomass + C_org
    expect(iso.corcTnYearNet).toBeGreaterThan(puro.corcTnYearNet);
  });

  it("rejects out-of-range moisture/C_org and falls back", () => {
    const r = computeCarbonBalance({
      capacityTnYearWet: 10_000,
      moisturePct: -5,       // invalid
      cOrgPct: 150,          // invalid
      feedstockId: "unknown_xyz",
    });
    expect(r.inputs.provenance.moisture).toBe("default");
    expect(r.inputs.provenance.cOrg).toBe("default");
    expect(r.inputs.cOrgPct).toBe(75);
  });

  it("handles zero capacity without dividing by zero", () => {
    const r = computeCarbonBalance({ capacityTnYearWet: 0 });
    expect(r.biocharTnYear).toBe(0);
    expect(r.tCO2ePerTonneBiochar).toBe(0);
  });

  it("gives rice husk a much lower carbon factor than pine (agri residue vs wood)", () => {
    const pine = computeCarbonBalance({ capacityTnYearWet: 10_000, feedstockId: "pine_sawdust" });
    const rice = computeCarbonBalance({ capacityTnYearWet: 10_000, feedstockId: "rice_husk" });
    // Pine 78%, rice husk 55% — real credit-per-tonne gap the old code hid
    expect(pine.tCO2ePerTonneBiochar).toBeGreaterThan(rice.tCO2ePerTonneBiochar);
    expect(pine.inputs.cOrgPct).toBe(78);
    expect(rice.inputs.cOrgPct).toBe(55);
  });
});
