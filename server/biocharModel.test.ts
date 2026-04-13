import { describe, it, expect } from "vitest";
import {
  compute_all,
  FEEDSTOCK_DB,
  safeAnchorH,
  type Feedstock,
} from "@/lib/biocharModel";

const PINE = FEEDSTOCK_DB["pine_sawdust"];
const EUCALYPTUS = FEEDSTOCK_DB["eucalyptus_sawdust"];

// Simulated LLM response where anchor_H is incorrectly given as H:Corg molar ratio
const AGAVE_BAGASSE_LLM_WRONG: Feedstock = {
  name: "Agave Bagasse (LLM wrong anchor_H)",
  C: 44.0, H: 6.5, N: 0.5, S: 0.1, O: 43.0,
  ash: 5.9, moisture: 12.0,
  anchor_T: 650, anchor_t: 30,
  anchor_C: 75.0, anchor_H: 0.28, // LLM returned H:Corg molar ratio instead of % H mass
  source: "Test fixture",
};

describe("Biochar Model - CONICET ST7446 Calibration", () => {
  it("Pine at 650°C/30min should have H:Corg ≈ 0.20 (CONICET ST7446)", () => {
    const r = compute_all(650, 30, PINE);
    expect(r.H_Corg).toBeCloseTo(0.20, 1);
  });

  it("Eucalyptus at 650°C/30min should have H:Corg ≈ 0.20 (CONICET ST7446)", () => {
    const r = compute_all(650, 30, EUCALYPTUS);
    expect(r.H_Corg).toBeCloseTo(0.20, 1);
  });

  it("Pine at 650°C should produce BC-1 class biochar (H:Corg < 0.4)", () => {
    const r = compute_all(650, 30, PINE);
    expect(r.credits.class).toBe("BC-1");
    expect(r.credits.sf).toBe(1.0);
  });

  it("Pine at 650°C should have carbon content ≈ 87.4% (CONICET anchor)", () => {
    const r = compute_all(650, 30, PINE);
    expect(r.C).toBeCloseTo(87.4, 0);
  });

  it("CO2e net should be positive and non-zero for BC-1 biochar", () => {
    const r = compute_all(650, 30, PINE);
    expect(r.credits.net).toBeGreaterThan(2.5);
    expect(r.credits.net).toBeLessThan(4.0);
  });

  it("H:Corg should decrease as temperature increases (higher stability)", () => {
    const r400 = compute_all(400, 30, PINE);
    const r650 = compute_all(650, 30, PINE);
    const r750 = compute_all(750, 30, PINE);
    expect(r400.H_Corg).toBeGreaterThan(r650.H_Corg);
    expect(r650.H_Corg).toBeGreaterThan(r750.H_Corg);
  });

  it("Carbon content should increase with temperature", () => {
    const r400 = compute_all(400, 30, PINE);
    const r650 = compute_all(650, 30, PINE);
    const r750 = compute_all(750, 30, PINE);
    expect(r400.C).toBeLessThan(r650.C);
    expect(r650.C).toBeLessThanOrEqual(r750.C);
  });
});

describe("Biochar Model - Defensive anchor_H conversion (AI search fix)", () => {
  it("Should correctly handle agave bagasse when LLM returns anchor_H as molar ratio (0.28)", () => {
    const r = compute_all(650, 30, AGAVE_BAGASSE_LLM_WRONG);
    expect(isNaN(r.H_Corg)).toBe(false);
    expect(isFinite(r.H_Corg)).toBe(true);
    expect(r.H_Corg).toBeGreaterThan(0.10);
    expect(r.H_Corg).toBeLessThan(0.60);
  });

  it("CO2e should be non-zero when anchor_H was incorrectly given as molar ratio", () => {
    const r = compute_all(650, 30, AGAVE_BAGASSE_LLM_WRONG);
    expect(r.credits.net).toBeGreaterThan(0);
    expect(r.credits.class).not.toBe("Not eligible");
  });

  it("safeAnchorH: 0.28 molar ratio with anchor_C=75 should become ~1.76% H mass", () => {
    const converted = safeAnchorH(0.28, 75);
    expect(converted).toBeCloseTo(1.76, 1);
  });

  it("safeAnchorH: values already in % H mass should pass through unchanged", () => {
    expect(safeAnchorH(1.47, 87.4)).toBe(1.47);
    expect(safeAnchorH(1.98, 81.5)).toBe(1.98);
  });
});
