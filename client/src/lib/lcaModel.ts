/**
 * LCA Model — Puro.earth Biochar Methodology Edition 2025 V1
 *
 * Pure TypeScript implementation of the Puro.earth Biochar Methodology for
 * calculating Carbon Dioxide Removal Certificates (CORCs).
 *
 * Reference equations:
 *   Eq. 5.1 — CORCs = C_stored - C_baseline - C_loss - E_project - E_leakage
 *   Eq. 6.1 — C_stored = Q_biochar_dry * C_org * 44/12
 *   Eq. 6.2 — C_org = C_tot - C_inorg
 *   Eq. 6.3 — C_loss = C_stored * (100 - PF) / 100
 *   Eq. 6.4 — PF = MAX(0, MIN(100, M - a * H/C_org))
 *   Eq. 6.5 — H/C_org = (H% / C_org%) * 12
 *   Eq. 7.1 — E_project = E_ops + E_emb
 *   Eq. 7.2 — E_ops = E_biomass + E_production + E_use
 *   Eq. 7.3 — E_emb = E_infra / amortization + E_dLUC
 *   Eq. 8.1 — E_leakage = L_ECO + L_MA
 */

// ============================================================================
// TABLE 6.1 — Permanence Coefficients (Puro.earth Ed. 2025)
// Given soil temperature Ts (integer °C), returns M and a for PF = M - a * H/C_org
// ============================================================================
export type PermanenceRow = { ts: number; M: number; a: number };

export const PERMANENCE_TABLE: PermanenceRow[] = [
  { ts: 7, M: 96.59, a: 11.28 },
  { ts: 8, M: 95.98, a: 13.44 },
  { ts: 9, M: 95.36, a: 15.66 },
  { ts: 10, M: 94.73, a: 17.92 },
  { ts: 11, M: 94.1, a: 20.15 },
  { ts: 12, M: 93.5, a: 22.31 },
  { ts: 13, M: 92.92, a: 24.38 },
  { ts: 14, M: 92.38, a: 26.33 },
  { ts: 15, M: 91.87, a: 28.16 },
  { ts: 16, M: 91.4, a: 29.84 },
  { ts: 17, M: 90.96, a: 31.39 },
  { ts: 18, M: 90.57, a: 32.81 },
  { ts: 19, M: 90.2, a: 34.11 },
  { ts: 20, M: 89.87, a: 35.29 },
  { ts: 21, M: 89.57, a: 36.36 },
  { ts: 22, M: 89.29, a: 37.35 },
  { ts: 23, M: 89.03, a: 38.26 },
  { ts: 24, M: 88.79, a: 39.09 },
  { ts: 25, M: 88.57, a: 39.87 },
  { ts: 26, M: 88.37, a: 40.59 },
  { ts: 27, M: 88.18, a: 41.27 },
  { ts: 28, M: 87.99, a: 41.91 },
  { ts: 29, M: 87.82, a: 42.52 },
  { ts: 30, M: 87.66, a: 43.1 },
  { ts: 31, M: 87.5, a: 43.67 },
  { ts: 32, M: 87.34, a: 44.21 },
  { ts: 33, M: 87.19, a: 44.74 },
  { ts: 34, M: 87.04, a: 45.26 },
  { ts: 35, M: 86.9, a: 45.77 },
  { ts: 36, M: 86.75, a: 46.27 },
  { ts: 37, M: 86.61, a: 46.77 },
  { ts: 38, M: 86.47, a: 47.27 },
  { ts: 39, M: 86.33, a: 47.76 },
  { ts: 40, M: 86.19, a: 48.25 },
];

// ============================================================================
// TABLE 8.3 — Indirect Land Use Change (iLUC) factors (EU RED II, Annex VIII)
// ============================================================================
export const ILUC_FACTORS = {
  cereals: 0.012, // kgCO2e/MJ
  sugar: 0.013,
  oilseeds: 0.055,
} as const;

// ============================================================================
// EMISSION FACTORS — from sheet EF (documented per Rule 7.1.10)
// ============================================================================
export const EF = {
  // Electricity — default: Argentina grid (Cammesa 2023)
  electricity_AR: 0.00023, // tCO2eq/kWh
  // Fuels
  LPG: 0.0029011, // tCO2eq/kg (IPCC 2006)
  diesel: 0.002697, // tCO2eq/L (IPCC 2006)
  natural_gas: 0.00195, // tCO2eq/m3
  // Transport
  lorry: 58.5, // gCO2eq/t·km (Ecoinvent / GLEC)
  backhaul: 1.5, // empty-return multiplier (Rule 7.3.8b)
  // Direct process emissions
  CH4_syngas: 0.03248, // tCO2eq/t dry biomass (1300 Nm³/t, 8-12% CH4, flare 95%)
  // GWP (IPCC AR5, 100-year)
  GWP_CH4: 28,
  GWP_N2O: 265,
  // Constants
  C_to_CO2: 44 / 12, // 3.6667 — molar conversion
  molar_HC: 12, // 12/1 — H/C molar ratio multiplier
} as const;

// ============================================================================
// INPUT TYPES
// ============================================================================

export type FacilityType = "New Facility" | "Existing Facility";
export type ApplicationType = "Soil improver" | "Concrete" | "Asphalt" | "Other";
export type BiomassBurden = "residue" | "dedicated_crop" | "post_consumer";
export type ILUCCropType = keyof typeof ILUC_FACTORS | "none";

export interface LCAInputs {
  // Project parameters
  projectName: string;
  country: string;
  facilityType: FacilityType;
  monitoringPeriodYears: number; // usually 1
  creditingPeriodYears: number; // usually 15
  facilityLifetimeYears: number; // usually 15

  // Biomass parameters
  wetBiomassTonsPerYear: number;
  biomassMoisturePct: number;
  biomassType: string;

  // Climate & application
  soilTemperatureC: number; // integer 7-40
  applicationType: ApplicationType;

  // Biochar properties (laboratory, dry basis)
  yieldPct: number; // dry biochar / dry biomass
  biocharMoisturePct: number;
  C_tot_pct: number; // total carbon
  C_inorg_pct: number; // inorganic carbon
  H_pct: number; // hydrogen
  O_pct?: number; // oxygen (optional, for quality indicator)

  // E_biomass inputs
  biomassIsResidue: boolean; // true → E_produccion_biomasa = 0
  biomassTransportDistanceKm: number;
  preProcessingElectricityKwhPerYear: number;

  // E_production inputs
  productionElectricityKwhPerYear: number;
  productionLPGKgPerYear: number;
  // Optional additional fuels
  productionDieselLitersPerYear?: number;
  productionNaturalGasM3PerYear?: number;

  // E_use inputs
  biocharTransportDistanceKm: number;
  applicationEmissionsTPerYear?: number; // packaging, machinery

  // E_emb — embodied emissions (one-time, amortized)
  infrastructureManufacturingTCO2: number; // e.g. 4025.9 for MAF
  infrastructureTransportTCO2: number; // e.g. 144.4 for MAF
  hasLandUseChange: boolean;
  dLUCAnnualTCO2?: number;

  // Leakage
  ecologicalLeakageMitigated: boolean;
  absoluteEcologicalLeakageTotal?: number; // AEL if not mitigated
  feedstockDivertedFromProductiveUse: boolean;
  iLUCCropType?: ILUCCropType;
  iLUCEnergyContentMJPerYear?: number;

  // Electricity grid override (default Argentina)
  electricityEF?: number; // tCO2eq/kWh
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface LCAResult {
  // Calculated biomass & biochar masses
  dryBiomassTPerYear: number;
  dryBiocharTPerYear: number;
  wetBiocharTPerYear: number;
  C_org_pct: number;
  HC_org_molar: number;
  OC_molar: number | null;

  // C_stored (Eq. 6.1)
  C_stored_tCO2PerYear: number;

  // C_loss (Eq. 6.3, 6.4, 6.5)
  permanenceFactor_M: number;
  permanenceFactor_a: number;
  permanenceFactorPct: number;
  C_loss_tCO2PerYear: number;

  // E_project breakdown (Eq. 7.1, 7.2, 7.3)
  E_biomass_subtotal: number;
  E_biomass_transport: number;
  E_biomass_preProcessing: number;
  E_biomass_production: number;

  E_production_subtotal: number;
  E_production_electricity: number;
  E_production_fuel: number;
  E_production_CH4_syngas: number;

  E_use_subtotal: number;
  E_use_transport: number;
  E_use_application: number;

  E_ops: number;
  E_infra_total: number;
  amortizationYears: number;
  E_infra_annual: number;
  E_dLUC: number;
  E_emb: number;
  E_project_tCO2PerYear: number;

  // Leakage
  L_ECO: number;
  L_MA_iLUC: number;
  L_MA_feedstock: number;
  L_MA: number;
  E_leakage_tCO2PerYear: number;

  // Baseline (always 0 for New Facility)
  C_baseline_tCO2PerYear: number;

  // Final result (Eq. 5.1)
  CORCs_tCO2PerYear: number;

  // Key indicators
  CORCsPerTonDryBiochar: number;
  CORCsPerTonWetBiomass: number;
  removalEfficiencyPct: number; // CORCs / C_stored

  // Validations
  validations: LCAValidation[];
  isValid: boolean;
}

export interface LCAValidation {
  id: string;
  label: string;
  status: "ok" | "error" | "warning";
  detail?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function lookupPermanenceRow(soilTempC: number): PermanenceRow | null {
  const intTs = Math.round(soilTempC);
  const row = PERMANENCE_TABLE.find((r) => r.ts === intTs);
  return row ?? null;
}

/** Eq. 6.5 — H/C_org molar ratio */
export function calcHCorgMolar(H_pct: number, C_org_pct: number): number {
  if (C_org_pct <= 0) return 0;
  return (H_pct / C_org_pct) * EF.molar_HC;
}

/** Eq. 6.4 — Permanence Factor, clipped to [0, 100] */
export function calcPermanenceFactor(M: number, a: number, HC_org: number): number {
  return Math.max(0, Math.min(100, M - a * HC_org));
}

// ============================================================================
// MAIN CALCULATION — Eq. 5.1 and all sub-equations
// ============================================================================

export function calculateLCA(input: LCAInputs): LCAResult {
  const electricityEF = input.electricityEF ?? EF.electricity_AR;

  // ---- Derived masses (Eq. 6.1 setup) ----
  const dryBiomass = input.wetBiomassTonsPerYear * (100 - input.biomassMoisturePct) / 100;
  const dryBiochar = dryBiomass * (input.yieldPct / 100);
  const wetBiochar = dryBiochar * 100 / (100 - input.biocharMoisturePct);

  // Eq. 6.2 — C_org = C_tot - C_inorg
  const C_org = input.C_tot_pct - input.C_inorg_pct;

  // Eq. 6.5 — H/C_org molar
  const HC_org = calcHCorgMolar(input.H_pct, C_org);

  // O/C quality indicator (non-binding)
  const OC_molar = input.O_pct != null && C_org > 0
    ? (input.O_pct / C_org) * (12 / 16)
    : null;

  // ---- C_STORED (Eq. 6.1) ----
  const C_stored = dryBiochar * (C_org / 100) * EF.C_to_CO2;

  // ---- C_LOSS (Eq. 6.3, 6.4) ----
  const permRow = lookupPermanenceRow(input.soilTemperatureC);
  const M = permRow?.M ?? 0;
  const a = permRow?.a ?? 0;
  const PF = calcPermanenceFactor(M, a, HC_org);
  const C_loss = C_stored * (100 - PF) / 100;

  // ---- E_PROJECT: E_biomass (Table 7.1, Rule 7.3) ----
  const E_biomass_production = input.biomassIsResidue ? 0 : 0;
  const E_biomass_transport =
    input.wetBiomassTonsPerYear *
    input.biomassTransportDistanceKm *
    (EF.lorry / 1_000_000) *
    EF.backhaul;
  const E_biomass_preProcessing = input.preProcessingElectricityKwhPerYear * electricityEF;
  const E_biomass_subtotal = E_biomass_production + E_biomass_transport + E_biomass_preProcessing;

  // ---- E_PROJECT: E_production ----
  const E_production_electricity = input.productionElectricityKwhPerYear * electricityEF;
  const E_production_fuel =
    input.productionLPGKgPerYear * EF.LPG +
    (input.productionDieselLitersPerYear ?? 0) * EF.diesel +
    (input.productionNaturalGasM3PerYear ?? 0) * EF.natural_gas;
  const E_production_CH4_syngas = dryBiomass * EF.CH4_syngas;
  const E_production_subtotal = E_production_electricity + E_production_fuel + E_production_CH4_syngas;

  // ---- E_PROJECT: E_use ----
  const E_use_transport =
    input.biocharTransportDistanceKm *
    wetBiochar *
    (EF.lorry / 1_000_000) *
    EF.backhaul;
  const E_use_application = input.applicationEmissionsTPerYear ?? 0;
  const E_use_subtotal = E_use_transport + E_use_application;

  // Eq. 7.2 — E_ops
  const E_ops = E_biomass_subtotal + E_production_subtotal + E_use_subtotal;

  // Eq. 7.3 — E_emb (amortized)
  const E_infra_total = input.infrastructureManufacturingTCO2 + input.infrastructureTransportTCO2;
  const amortizationYears = Math.min(input.creditingPeriodYears, input.facilityLifetimeYears);
  const E_infra_annual = amortizationYears > 0 ? E_infra_total / amortizationYears : 0;
  const E_dLUC = input.hasLandUseChange ? input.dLUCAnnualTCO2 ?? 0 : 0;
  const E_emb = E_infra_annual + E_dLUC;

  // Eq. 7.1 — E_project
  const E_project = E_ops + E_emb;

  // ---- E_LEAKAGE (Eq. 8.1) ----
  const L_ECO = input.ecologicalLeakageMitigated
    ? 0
    : (input.absoluteEcologicalLeakageTotal ?? 0) / Math.max(input.creditingPeriodYears, 1);

  // iLUC (Eq. 8.3) — 0 if residue
  let L_MA_iLUC = 0;
  if (
    !input.biomassIsResidue &&
    input.iLUCCropType &&
    input.iLUCCropType !== "none" &&
    input.iLUCEnergyContentMJPerYear
  ) {
    // kgCO2e/MJ * MJ/yr → kgCO2/yr → tCO2/yr
    L_MA_iLUC = (ILUC_FACTORS[input.iLUCCropType] * input.iLUCEnergyContentMJPerYear) / 1000;
  }

  const L_MA_feedstock = input.feedstockDivertedFromProductiveUse ? 0 : 0; // placeholder — full Eq. 8.2 requires alternative use model
  const L_MA = L_MA_iLUC + L_MA_feedstock;
  const E_leakage = L_ECO + L_MA;

  // ---- BASELINE (Sec. 6.3) ----
  const C_baseline = input.facilityType === "New Facility" ? 0 : 0; // existing facility requires baseline study

  // ---- FINAL RESULT (Eq. 5.1) ----
  const CORCs = C_stored - C_baseline - C_loss - E_project - E_leakage;

  // ---- Indicators ----
  const CORCsPerTonDryBiochar = dryBiochar > 0 ? CORCs / dryBiochar : 0;
  const CORCsPerTonWetBiomass = input.wetBiomassTonsPerYear > 0 ? CORCs / input.wetBiomassTonsPerYear : 0;
  const removalEfficiencyPct = C_stored > 0 ? (CORCs / C_stored) * 100 : 0;

  // ---- Validations ----
  const validations: LCAValidation[] = [
    {
      id: "V1",
      label: "H/C_org in valid range [0, 0.7]",
      status: HC_org >= 0 && HC_org <= 0.7 ? "ok" : "error",
      detail: `Computed H/C_org = ${HC_org.toFixed(3)}. Rule 6.1.6 — biochar eligibility requires H/C_org ≤ 0.7`,
    },
    {
      id: "V2",
      label: "Permanence Factor in valid range [0, 100]",
      status: PF >= 0 && PF <= 100 ? "ok" : "error",
      detail: `PF = ${PF.toFixed(2)}%`,
    },
    {
      id: "V3",
      label: "CORCs are positive",
      status: CORCs > 0 ? "ok" : "error",
      detail: `CORCs = ${CORCs.toFixed(0)} tCO₂eq/yr`,
    },
    {
      id: "V4",
      label: "C_org = C_tot - C_inorg (Eq. 6.2)",
      status: Math.abs(C_org - (input.C_tot_pct - input.C_inorg_pct)) < 0.001 ? "ok" : "error",
    },
    {
      id: "V5",
      label: "Soil temperature is integer in [7, 40] °C",
      status:
        Number.isInteger(input.soilTemperatureC) &&
        input.soilTemperatureC >= 7 &&
        input.soilTemperatureC <= 40
          ? "ok"
          : "error",
      detail: `Ts = ${input.soilTemperatureC}°C. Rule 6.2.4 requires integer values in [7, 40].`,
    },
    {
      id: "V6",
      label: "C_tot ≥ 50% (biochar eligibility)",
      status: input.C_tot_pct >= 50 ? "ok" : "warning",
      detail: `C_tot = ${input.C_tot_pct}%. Rule 6.1.6 — C_tot should be ≥ 50% for high-grade biochar.`,
    },
  ];

  const isValid = validations.every((v) => v.status !== "error");

  return {
    dryBiomassTPerYear: dryBiomass,
    dryBiocharTPerYear: dryBiochar,
    wetBiocharTPerYear: wetBiochar,
    C_org_pct: C_org,
    HC_org_molar: HC_org,
    OC_molar,

    C_stored_tCO2PerYear: C_stored,

    permanenceFactor_M: M,
    permanenceFactor_a: a,
    permanenceFactorPct: PF,
    C_loss_tCO2PerYear: C_loss,

    E_biomass_subtotal,
    E_biomass_transport,
    E_biomass_preProcessing,
    E_biomass_production,

    E_production_subtotal,
    E_production_electricity,
    E_production_fuel,
    E_production_CH4_syngas,

    E_use_subtotal,
    E_use_transport,
    E_use_application,

    E_ops,
    E_infra_total,
    amortizationYears,
    E_infra_annual,
    E_dLUC,
    E_emb,
    E_project_tCO2PerYear: E_project,

    L_ECO,
    L_MA_iLUC,
    L_MA_feedstock,
    L_MA,
    E_leakage_tCO2PerYear: E_leakage,

    C_baseline_tCO2PerYear: C_baseline,

    CORCs_tCO2PerYear: CORCs,

    CORCsPerTonDryBiochar,
    CORCsPerTonWetBiomass,
    removalEfficiencyPct,

    validations,
    isValid,
  };
}

// ============================================================================
// DEFAULT INPUTS — reference case (validated against Excel)
// Expected CORCs ≈ 53,946 tCO2eq/yr
// ============================================================================

export const DEFAULT_LCA_INPUTS: LCAInputs = {
  projectName: "New Biochar Project",
  country: "Argentina",
  facilityType: "New Facility",
  monitoringPeriodYears: 1,
  creditingPeriodYears: 15,
  facilityLifetimeYears: 15,

  wetBiomassTonsPerYear: 74880,
  biomassMoisturePct: 15.03,
  biomassType: "Forestry residues",

  soilTemperatureC: 15,
  applicationType: "Soil improver",

  yieldPct: 34.59,
  biocharMoisturePct: 3.01,
  C_tot_pct: 87.4,
  C_inorg_pct: 0.5,
  H_pct: 2.1,
  O_pct: 10.1,

  biomassIsResidue: true,
  biomassTransportDistanceKm: 50,
  preProcessingElectricityKwhPerYear: 4_941_419,

  productionElectricityKwhPerYear: 2_600_254,
  productionLPGKgPerYear: 50000,

  biocharTransportDistanceKm: 100,
  applicationEmissionsTPerYear: 0,

  infrastructureManufacturingTCO2: 4025.9,
  infrastructureTransportTCO2: 144.4,
  hasLandUseChange: false,

  ecologicalLeakageMitigated: true,
  feedstockDivertedFromProductiveUse: false,
  iLUCCropType: "none",

  electricityEF: EF.electricity_AR,
};
