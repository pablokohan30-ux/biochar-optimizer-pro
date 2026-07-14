import { describe, it, expect } from "vitest";
import { computeCarbonBalance, deriveLabPermanence } from "./_core/carbonBalance";

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

  it("uses measured biochar C_org from the lab over the feedstock lookup", () => {
    // Lab measured 82% on this batch — higher than pine typical 78
    const r = computeCarbonBalance({
      capacityTnYearWet: 10_000,
      feedstockId: "pine_sawdust",
      cOrgPct: 82,
    });
    expect(r.inputs.cOrgPct).toBe(82);
    expect(r.inputs.provenance.cOrg).toBe("input");
  });
});

describe("computeCarbonBalance — three-tier CDR (post-smoke-test-11 regression)", () => {
  // Project 11 smoke test surfaced: LCA reported ~9,235 tCO₂e/yr net-of-LCA
  // while Financial Summary quoted 11,800 (using tier 2). Same biochar,
  // 28% gap in revenue/TIR. Lock down the tier separation.
  const PROJECT_11 = {
    capacityTnYearWet: 30_000,
    moisturePct: 46,
    feedstockId: "pine_sawdust",
    biomassName: "Pine Sawdust (Pinus spp.)",
    methodology: "puro-earth",
  };

  it("returns three distinct tiers gross → post-permanence → net-of-LCA", () => {
    const r = computeCarbonBalance(PROJECT_11);
    expect(r.corcTnYearGross).toBeGreaterThan(r.corcTnYearNet);
    expect(r.corcTnYearNet).toBeGreaterThan(r.corcTnYearNetOfLca);
  });

  it("net-of-LCA matches Financial Summary sellable expectation ~9,440", () => {
    const r = computeCarbonBalance(PROJECT_11);
    // 30,000 × 0.54 × 0.30 × 0.78 × (44/12) × 0.85 × (1 − 0.20)
    // = 4,860 × 2.86 × 0.85 × 0.80 ≈ 9,440
    expect(r.corcTnYearNetOfLca).toBeGreaterThan(9_200);
    expect(r.corcTnYearNetOfLca).toBeLessThan(9_700);
  });

  it("net factor per tonne biochar (~1.94) matches the LCA-reported figure", () => {
    const r = computeCarbonBalance(PROJECT_11);
    // 0.78 × 44/12 × 0.85 × 0.80 = 1.944
    expect(r.netTco2ePerTonneBiochar).toBeCloseTo(1.94, 2);
    // Pre-LCA tier 2 stays higher — this is the number we do NOT want in Financial Summary
    expect(r.tCO2ePerTonneBiochar).toBeGreaterThan(r.netTco2ePerTonneBiochar);
  });

  it("respects an explicit LCA emissions override (long-haul project)", () => {
    const clean = computeCarbonBalance({ ...PROJECT_11, lcaEmissionsFraction: 0.10 });
    const dirty = computeCarbonBalance({ ...PROJECT_11, lcaEmissionsFraction: 0.30 });
    expect(clean.corcTnYearNetOfLca).toBeGreaterThan(dirty.corcTnYearNetOfLca);
    expect(clean.inputs.provenance.lcaEmissions).toBe("input");
  });

  it("grounding block spells out all three tiers and which one goes where", () => {
    const r = computeCarbonBalance(PROJECT_11);
    expect(r.groundingBlock).toMatch(/THREE TIERS/);
    expect(r.groundingBlock).toMatch(/Financial Summary.*TIER 3/);
    expect(r.groundingBlock).toMatch(/Executive Summary.*TIER 3/);
    expect(r.groundingBlock).toMatch(/internally consistent/);
  });

  it("rejects an LCA fraction ≥ 1 or negative and falls back to default", () => {
    const bad1 = computeCarbonBalance({ ...PROJECT_11, lcaEmissionsFraction: 1.5 });
    const bad2 = computeCarbonBalance({ ...PROJECT_11, lcaEmissionsFraction: -0.1 });
    expect(bad1.inputs.provenance.lcaEmissions).toBe("default");
    expect(bad1.inputs.lcaEmissionsFraction).toBe(0.20);
    expect(bad2.inputs.provenance.lcaEmissions).toBe("default");
  });
});

describe("deriveLabPermanence", () => {
  it("returns undefined when H:Corg is missing so caller falls back", () => {
    expect(deriveLabPermanence(null, "puro-earth")).toBeUndefined();
    expect(deriveLabPermanence(undefined, "puro-earth")).toBeUndefined();
    expect(deriveLabPermanence(0, "puro-earth")).toBeUndefined();
  });

  it("rejects H:Corg > 0.7 with a steep permanence discount", () => {
    // Anything above 0.7 wouldn't certify as biochar under Puro/EBC/Verra
    const p = deriveLabPermanence(0.75, "puro-earth");
    expect(p).toBe(0.60);
  });

  it("gives premium permanence (0.90) for H:Corg ≤ 0.4 on Puro/EBC", () => {
    expect(deriveLabPermanence(0.35, "puro-earth")).toBe(0.90);
    expect(deriveLabPermanence(0.4, "ebc")).toBe(0.90);
  });

  it("gives standard permanence (0.85) for H:Corg between 0.4 and 0.7", () => {
    expect(deriveLabPermanence(0.5, "puro-earth")).toBe(0.85);
    expect(deriveLabPermanence(0.7, "verra-vm0044")).toBe(0.85);
  });

  it("Isometric 1000-yr tier: 0.95 when H:Corg ≤ 0.4, 0.85 otherwise", () => {
    expect(deriveLabPermanence(0.3, "isometric")).toBe(0.95);
    expect(deriveLabPermanence(0.5, "isometric")).toBe(0.85);
  });
});
