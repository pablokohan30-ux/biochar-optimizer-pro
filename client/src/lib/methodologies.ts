/**
 * Multi-methodology framework for biochar certification readiness.
 *
 * Each methodology (Puro.earth, Isometric, Verra, Gold Standard, EBC, IBI) is
 * modeled as a set of weighted checks — some auto-evaluated from simulation
 * data, some manual (user-confirmed). The score (0-100) reflects how ready a
 * project is for that specific certifier.
 *
 * Design principles:
 * - A "critical" check that fails caps the score at 60 (can't be certified).
 * - Pending manual checks count as 0 in the numerator, full weight in denom.
 * - Score = (sum passed weights) / (sum all weights) × 100.
 *
 * Marketing brand: the score shown to the user is the "BiocharPro Score"
 * for that methodology (e.g., "BiocharPro Score: 87/100 (Puro.earth)").
 */

import type { BiocharResult, Feedstock } from "./biocharModel";

// ============================================================================
// TYPES
// ============================================================================

export type MethodologyId =
  | "puro-earth"
  | "isometric"
  | "verra-vm0044"
  | "gold-standard"
  | "ebc"
  | "ibi";

export type CheckCategory = "feedstock" | "pyrolysis" | "quality" | "lca" | "docs" | "monitoring";
export type CheckType = "auto" | "manual";

/** Input passed to auto-check evaluators. */
export interface CheckInput {
  result: BiocharResult;
  feedstock: Feedstock;
  temperature: number;
  residenceTime: number;
  plantCapacityTph: number | null;
  country: string | null;
}

/** Result of evaluating a single auto check. */
export interface AutoCheckResult {
  pass: boolean;
  detail?: string;
}

export interface MethodologyCheck {
  id: string;
  category: CheckCategory;
  type: CheckType;
  /** 1-10. Critical checks typically have higher weight. */
  weight: number;
  /** If true and failing → score capped at 60 (not ready for certification). */
  critical: boolean;
  /** i18n label key — rendered as the check name. */
  labelKey: string;
  /** i18n short description key. */
  descKey: string;
  /** Only for type: "auto" — pure function returning pass/fail + optional detail. */
  evaluator?: (input: CheckInput) => AutoCheckResult;
}

export interface Methodology {
  id: MethodologyId;
  /** Full name (e.g., "Puro.earth CORC Methodology"). */
  name: string;
  /** Short display name (e.g., "Puro.earth"). */
  shortName: string;
  /** Tailwind text color class. */
  color: string;
  /** Tailwind bg/border class for accent. */
  accent: string;
  /** Short one-liner for the methodology selector. */
  tagline: string;
  /** List of checks. Order matters for display. */
  checks: MethodologyCheck[];
  /** Minimum score to be considered "ready for submission". */
  minPassingScore: number;
  /** Whether this is a credit-issuing methodology or a quality-only standard. */
  credits: boolean;
  /** The tier required to access this methodology in the app. */
  requiredTier: "analyst" | "developer" | "engineer" | "expert";
  /**
   * Typical secondary-market price range (USD per tCO₂e) observed in 2024–2025.
   * For quality-only standards (EBC, IBI) set to null — credits are not issued
   * directly by these standards, they feed upstream methodologies.
   */
  priceRange: string | null;
  /** Short note explaining the price context (e.g., "premium for 1000-yr durability"). */
  priceNote: string | null;
  /** Durability / permanence claim surfaced to users. */
  durability: string | null;
  /** Brief durability note. */
  durabilityNote: string | null;
}

// ============================================================================
// PURO.EARTH — 15 checks (5 auto + 10 manual)
// ============================================================================

const PURO_EARTH: Methodology = {
  id: "puro-earth",
  name: "Puro.earth CORC Methodology (Ed. 2025)",
  shortName: "Puro.earth",
  color: "text-green-500",
  accent: "bg-green-500/10 border-green-500/30",
  tagline: "Leader in biochar carbon removal certificates (CORCs).",
  credits: true,
  requiredTier: "analyst",
  minPassingScore: 80,
  priceRange: "USD 130–250",
  priceNote: "per tCO₂e · mid-market reference · Microsoft, Shopify are active buyers",
  durability: "100+ years",
  durabilityNote: "Biochar stability measured by H:Corg < 0.7",
  checks: [
    // ─── AUTO CHECKS (5) ─────────────────────────────────────────────────
    {
      id: "minTemperature",
      category: "pyrolysis",
      type: "auto",
      weight: 8,
      critical: true,
      labelKey: "methodologies:puro-earth.checks.minTemperature.label",
      descKey: "methodologies:puro-earth.checks.minTemperature.desc",
      evaluator: ({ temperature }) => ({
        pass: temperature >= 350,
        detail: `${temperature} °C ${temperature >= 350 ? "≥" : "<"} 350 °C`,
      }),
    },
    {
      id: "hcorgRatio",
      category: "quality",
      type: "auto",
      weight: 10,
      critical: true,
      labelKey: "methodologies:puro-earth.checks.hcorgRatio.label",
      descKey: "methodologies:puro-earth.checks.hcorgRatio.desc",
      evaluator: ({ result }) => ({
        pass: result.H_Corg < 0.7,
        detail: `H:Corg = ${result.H_Corg.toFixed(3)} ${result.H_Corg < 0.7 ? "<" : "≥"} 0.7`,
      }),
    },
    {
      id: "carbonContent",
      category: "quality",
      type: "auto",
      weight: 7,
      critical: true,
      labelKey: "methodologies:puro-earth.checks.carbonContent.label",
      descKey: "methodologies:puro-earth.checks.carbonContent.desc",
      evaluator: ({ result }) => ({
        pass: result.C > 10,
        detail: `C = ${result.C.toFixed(1)}% ${result.C > 10 ? ">" : "≤"} 10%`,
      }),
    },
    {
      id: "netRemoval",
      category: "lca",
      type: "auto",
      weight: 9,
      critical: true,
      labelKey: "methodologies:puro-earth.checks.netRemoval.label",
      descKey: "methodologies:puro-earth.checks.netRemoval.desc",
      evaluator: ({ result }) => ({
        pass: result.credits.net > 0,
        detail: `Net CO₂e = ${result.credits.net.toFixed(2)} t/t`,
      }),
    },
    {
      id: "residenceTime",
      category: "pyrolysis",
      type: "auto",
      weight: 6,
      critical: false,
      labelKey: "methodologies:puro-earth.checks.residenceTime.label",
      descKey: "methodologies:puro-earth.checks.residenceTime.desc",
      evaluator: ({ residenceTime }) => ({
        pass: residenceTime >= 10,
        detail: `${residenceTime} min ${residenceTime >= 10 ? "≥" : "<"} 10 min`,
      }),
    },

    // ─── MANUAL CHECKS (10) ──────────────────────────────────────────────
    {
      id: "wasteFeedstock",
      category: "feedstock",
      type: "manual",
      weight: 9,
      critical: true,
      labelKey: "methodologies:puro-earth.checks.wasteFeedstock.label",
      descKey: "methodologies:puro-earth.checks.wasteFeedstock.desc",
    },
    {
      id: "noLandUseChange",
      category: "feedstock",
      type: "manual",
      weight: 9,
      critical: true,
      labelKey: "methodologies:puro-earth.checks.noLandUseChange.label",
      descKey: "methodologies:puro-earth.checks.noLandUseChange.desc",
    },
    {
      id: "contaminantTesting",
      category: "quality",
      type: "manual",
      weight: 7,
      critical: false,
      labelKey: "methodologies:puro-earth.checks.contaminantTesting.label",
      descKey: "methodologies:puro-earth.checks.contaminantTesting.desc",
    },
    {
      id: "soilIncorporation",
      category: "monitoring",
      type: "manual",
      weight: 6,
      critical: false,
      labelKey: "methodologies:puro-earth.checks.soilIncorporation.label",
      descKey: "methodologies:puro-earth.checks.soilIncorporation.desc",
    },
    {
      id: "applicationSite",
      category: "monitoring",
      type: "manual",
      weight: 5,
      critical: false,
      labelKey: "methodologies:puro-earth.checks.applicationSite.label",
      descKey: "methodologies:puro-earth.checks.applicationSite.desc",
    },
    {
      id: "additionality",
      category: "docs",
      type: "manual",
      weight: 9,
      critical: true,
      labelKey: "methodologies:puro-earth.checks.additionality.label",
      descKey: "methodologies:puro-earth.checks.additionality.desc",
    },
    {
      id: "noDoubleCounting",
      category: "docs",
      type: "manual",
      weight: 8,
      critical: true,
      labelKey: "methodologies:puro-earth.checks.noDoubleCounting.label",
      descKey: "methodologies:puro-earth.checks.noDoubleCounting.desc",
    },
    {
      id: "monitoringPlan",
      category: "monitoring",
      type: "manual",
      weight: 7,
      critical: false,
      labelKey: "methodologies:puro-earth.checks.monitoringPlan.label",
      descKey: "methodologies:puro-earth.checks.monitoringPlan.desc",
    },
    {
      id: "productionLogging",
      category: "monitoring",
      type: "manual",
      weight: 6,
      critical: false,
      labelKey: "methodologies:puro-earth.checks.productionLogging.label",
      descKey: "methodologies:puro-earth.checks.productionLogging.desc",
    },
    {
      id: "thirdPartyVerification",
      category: "docs",
      type: "manual",
      weight: 8,
      critical: true,
      labelKey: "methodologies:puro-earth.checks.thirdPartyVerification.label",
      descKey: "methodologies:puro-earth.checks.thirdPartyVerification.desc",
    },
  ],
};

// ============================================================================
// ISOMETRIC PROTOCOL — biochar-specific, 200/1000-year durability
// ============================================================================

const ISOMETRIC: Methodology = {
  id: "isometric",
  name: "Isometric Biochar Protocol",
  shortName: "Isometric",
  color: "text-blue-500",
  accent: "bg-blue-500/10 border-blue-500/30",
  tagline: "Rigorous protocol with 200 or 1,000-year durability certificates.",
  credits: true,
  requiredTier: "developer",
  minPassingScore: 80,
  priceRange: "USD 180–350",
  priceNote: "per tCO₂e · premium for 1000-yr durability class",
  durability: "200 or 1,000 years",
  durabilityNote: "Two durability tiers · BC-1 required for 1000-yr",
  checks: [
    // ─── AUTO (6) ────────────────────────────────────────────────────────
    {
      id: "hcorgIsometric",
      category: "quality",
      type: "auto",
      weight: 10,
      critical: true,
      labelKey: "methodologies:isometric.checks.hcorgIsometric.label",
      descKey: "methodologies:isometric.checks.hcorgIsometric.desc",
      evaluator: ({ result }) => ({
        pass: result.H_Corg < 0.4, // stricter than Puro for 1000-yr durability
        detail: `H:Corg = ${result.H_Corg.toFixed(3)} ${result.H_Corg < 0.4 ? "<" : "≥"} 0.4 (BC-1 required)`,
      }),
    },
    {
      id: "highTemperature",
      category: "pyrolysis",
      type: "auto",
      weight: 9,
      critical: true,
      labelKey: "methodologies:isometric.checks.highTemperature.label",
      descKey: "methodologies:isometric.checks.highTemperature.desc",
      evaluator: ({ temperature }) => ({
        pass: temperature >= 500,
        detail: `${temperature} °C ${temperature >= 500 ? "≥" : "<"} 500 °C`,
      }),
    },
    {
      id: "carbonIsometric",
      category: "quality",
      type: "auto",
      weight: 8,
      critical: true,
      labelKey: "methodologies:isometric.checks.carbonIsometric.label",
      descKey: "methodologies:isometric.checks.carbonIsometric.desc",
      evaluator: ({ result }) => ({
        pass: result.C >= 50,
        detail: `C = ${result.C.toFixed(1)}% ${result.C >= 50 ? "≥" : "<"} 50%`,
      }),
    },
    {
      id: "netRemovalPositive",
      category: "lca",
      type: "auto",
      weight: 9,
      critical: true,
      labelKey: "methodologies:isometric.checks.netRemovalPositive.label",
      descKey: "methodologies:isometric.checks.netRemovalPositive.desc",
      evaluator: ({ result }) => ({
        pass: result.credits.net > 0,
        detail: `Net CO₂e = ${result.credits.net.toFixed(2)} t/t`,
      }),
    },
    {
      id: "continuousPyrolysis",
      category: "pyrolysis",
      type: "auto",
      weight: 5,
      critical: false,
      labelKey: "methodologies:isometric.checks.continuousPyrolysis.label",
      descKey: "methodologies:isometric.checks.continuousPyrolysis.desc",
      evaluator: ({ residenceTime }) => ({
        pass: residenceTime >= 15,
        detail: `${residenceTime} min ${residenceTime >= 15 ? "≥" : "<"} 15 min`,
      }),
    },
    {
      id: "betSurface",
      category: "quality",
      type: "auto",
      weight: 4,
      critical: false,
      labelKey: "methodologies:isometric.checks.betSurface.label",
      descKey: "methodologies:isometric.checks.betSurface.desc",
      evaluator: ({ result }) => ({
        pass: result.BET > 100,
        detail: `BET = ${result.BET.toFixed(0)} m²/g`,
      }),
    },

    // ─── MANUAL (8) ──────────────────────────────────────────────────────
    {
      id: "preApprovedPyrolyzer",
      category: "feedstock",
      type: "manual",
      weight: 7,
      critical: false,
      labelKey: "methodologies:isometric.checks.preApprovedPyrolyzer.label",
      descKey: "methodologies:isometric.checks.preApprovedPyrolyzer.desc",
    },
    {
      id: "feedstockEligibility",
      category: "feedstock",
      type: "manual",
      weight: 9,
      critical: true,
      labelKey: "methodologies:isometric.checks.feedstockEligibility.label",
      descKey: "methodologies:isometric.checks.feedstockEligibility.desc",
    },
    {
      id: "ghgAccountingFramework",
      category: "lca",
      type: "manual",
      weight: 9,
      critical: true,
      labelKey: "methodologies:isometric.checks.ghgAccountingFramework.label",
      descKey: "methodologies:isometric.checks.ghgAccountingFramework.desc",
    },
    {
      id: "durabilityClass",
      category: "quality",
      type: "manual",
      weight: 8,
      critical: false,
      labelKey: "methodologies:isometric.checks.durabilityClass.label",
      descKey: "methodologies:isometric.checks.durabilityClass.desc",
    },
    {
      id: "storageEnvironment",
      category: "monitoring",
      type: "manual",
      weight: 7,
      critical: false,
      labelKey: "methodologies:isometric.checks.storageEnvironment.label",
      descKey: "methodologies:isometric.checks.storageEnvironment.desc",
    },
    {
      id: "isometricAdditionality",
      category: "docs",
      type: "manual",
      weight: 9,
      critical: true,
      labelKey: "methodologies:isometric.checks.isometricAdditionality.label",
      descKey: "methodologies:isometric.checks.isometricAdditionality.desc",
    },
    {
      id: "evidenceDocumentation",
      category: "docs",
      type: "manual",
      weight: 7,
      critical: false,
      labelKey: "methodologies:isometric.checks.evidenceDocumentation.label",
      descKey: "methodologies:isometric.checks.evidenceDocumentation.desc",
    },
    {
      id: "certifyPlatformReady",
      category: "docs",
      type: "manual",
      weight: 5,
      critical: false,
      labelKey: "methodologies:isometric.checks.certifyPlatformReady.label",
      descKey: "methodologies:isometric.checks.certifyPlatformReady.desc",
    },
  ],
};

// ============================================================================
// EBC — European Biochar Certificate (quality standard, no credits)
// ============================================================================
// References: https://www.carbon-standards.com/en/ebc
// Threshold values use conservative/Basic-class limits unless noted. Final
// certification requires lab testing per the official EBC standard document.

const EBC: Methodology = {
  id: "ebc",
  name: "European Biochar Certificate (EBC)",
  shortName: "EBC",
  color: "text-emerald-500",
  accent: "bg-emerald-500/10 border-emerald-500/30",
  tagline: "Foundational quality standard. Often required as prerequisite for credit certification.",
  credits: false,
  requiredTier: "analyst",
  minPassingScore: 80,
  priceRange: null,
  priceNote: "Quality cert · no credits issued directly · feeds Puro.earth / Isometric submissions",
  durability: "—",
  durabilityNote: "Quality + contaminant limits (metals, PAH) · no durability claim",
  checks: [
    // ─── AUTO (4) — derived from simulation ──────────────────────────────
    {
      id: "ebcCarbonBasic",
      category: "quality",
      type: "auto",
      weight: 9,
      critical: true,
      labelKey: "methodologies:ebc.checks.ebcCarbonBasic.label",
      descKey: "methodologies:ebc.checks.ebcCarbonBasic.desc",
      evaluator: ({ result }) => ({
        pass: result.C >= 50,
        detail: `C = ${result.C.toFixed(1)}% ${result.C >= 50 ? "≥" : "<"} 50% (Basic threshold)`,
      }),
    },
    {
      id: "ebcHCorg",
      category: "quality",
      type: "auto",
      weight: 10,
      critical: true,
      labelKey: "methodologies:ebc.checks.ebcHCorg.label",
      descKey: "methodologies:ebc.checks.ebcHCorg.desc",
      evaluator: ({ result }) => ({
        pass: result.H_Corg < 0.7,
        detail: `H:Corg = ${result.H_Corg.toFixed(3)} ${result.H_Corg < 0.7 ? "<" : "≥"} 0.7 (mandatory)`,
      }),
    },
    {
      id: "ebcMinTemp",
      category: "pyrolysis",
      type: "auto",
      weight: 8,
      critical: true,
      labelKey: "methodologies:ebc.checks.ebcMinTemp.label",
      descKey: "methodologies:ebc.checks.ebcMinTemp.desc",
      evaluator: ({ temperature }) => ({
        pass: temperature >= 350,
        detail: `${temperature} °C ${temperature >= 350 ? "≥" : "<"} 350 °C`,
      }),
    },
    {
      id: "ebcPHRange",
      category: "quality",
      type: "auto",
      weight: 4,
      critical: false,
      labelKey: "methodologies:ebc.checks.ebcPHRange.label",
      descKey: "methodologies:ebc.checks.ebcPHRange.desc",
      evaluator: ({ result }) => ({
        pass: result.pH >= 6 && result.pH <= 11,
        detail: `pH = ${result.pH.toFixed(1)} ${result.pH >= 6 && result.pH <= 11 ? "in 6–11 range" : "out of typical EBC range"}`,
      }),
    },

    // ─── MANUAL (8) — user-confirmed lab tests + production criteria ─────
    {
      id: "ebcPositiveList",
      category: "feedstock",
      type: "manual",
      weight: 9,
      critical: true,
      labelKey: "methodologies:ebc.checks.ebcPositiveList.label",
      descKey: "methodologies:ebc.checks.ebcPositiveList.desc",
    },
    {
      id: "ebcAnoxicProduction",
      category: "pyrolysis",
      type: "manual",
      weight: 8,
      critical: true,
      labelKey: "methodologies:ebc.checks.ebcAnoxicProduction.label",
      descKey: "methodologies:ebc.checks.ebcAnoxicProduction.desc",
    },
    {
      id: "ebcHeavyMetals",
      category: "quality",
      type: "manual",
      weight: 9,
      critical: true,
      labelKey: "methodologies:ebc.checks.ebcHeavyMetals.label",
      descKey: "methodologies:ebc.checks.ebcHeavyMetals.desc",
    },
    {
      id: "ebcPAH",
      category: "quality",
      type: "manual",
      weight: 8,
      critical: true,
      labelKey: "methodologies:ebc.checks.ebcPAH.label",
      descKey: "methodologies:ebc.checks.ebcPAH.desc",
    },
    {
      id: "ebcPCB",
      category: "quality",
      type: "manual",
      weight: 6,
      critical: false,
      labelKey: "methodologies:ebc.checks.ebcPCB.label",
      descKey: "methodologies:ebc.checks.ebcPCB.desc",
    },
    {
      id: "ebcMoisture",
      category: "quality",
      type: "manual",
      weight: 4,
      critical: false,
      labelKey: "methodologies:ebc.checks.ebcMoisture.label",
      descKey: "methodologies:ebc.checks.ebcMoisture.desc",
    },
    {
      id: "ebcClassDeclared",
      category: "docs",
      type: "manual",
      weight: 5,
      critical: false,
      labelKey: "methodologies:ebc.checks.ebcClassDeclared.label",
      descKey: "methodologies:ebc.checks.ebcClassDeclared.desc",
    },
    {
      id: "ebcAuditTrail",
      category: "docs",
      type: "manual",
      weight: 7,
      critical: false,
      labelKey: "methodologies:ebc.checks.ebcAuditTrail.label",
      descKey: "methodologies:ebc.checks.ebcAuditTrail.desc",
    },
  ],
};

// ============================================================================
// IBI — International Biochar Initiative (quality standard, no credits)
// ============================================================================
// References: https://biochar-international.org/biochar-standards/
// IBI defines 3 carbon classes (Class 1: ≥60%, Class 2: 30-60%, Class 3: 10-30%)
// plus mandatory tests: H:Corg, heavy metals, PAH, CCE (liming), bulk density,
// particle size, surface area.

const IBI: Methodology = {
  id: "ibi",
  name: "International Biochar Initiative (IBI)",
  shortName: "IBI",
  color: "text-teal-500",
  accent: "bg-teal-500/10 border-teal-500/30",
  tagline: "Global biochar quality certification with 3 carbon classes.",
  credits: false,
  requiredTier: "developer",
  minPassingScore: 80,
  priceRange: null,
  priceNote: "Quality cert · recognized globally · feeds credit methodologies",
  durability: "—",
  durabilityNote: "3-tier carbon classification · contaminant + stability limits",
  checks: [
    // ─── AUTO (4) ────────────────────────────────────────────────────────
    {
      id: "ibiCarbonClass",
      category: "quality",
      type: "auto",
      weight: 9,
      critical: true,
      labelKey: "methodologies:ibi.checks.ibiCarbonClass.label",
      descKey: "methodologies:ibi.checks.ibiCarbonClass.desc",
      evaluator: ({ result }) => {
        const c = result.C;
        const cls = c >= 60 ? "Class 1" : c >= 30 ? "Class 2" : c >= 10 ? "Class 3" : "below threshold";
        return {
          pass: c >= 10,
          detail: `C = ${c.toFixed(1)}% → ${cls}`,
        };
      },
    },
    {
      id: "ibiHCorgStability",
      category: "quality",
      type: "auto",
      weight: 10,
      critical: true,
      labelKey: "methodologies:ibi.checks.ibiHCorgStability.label",
      descKey: "methodologies:ibi.checks.ibiHCorgStability.desc",
      evaluator: ({ result }) => ({
        pass: result.H_Corg < 0.7,
        detail: `H:Corg = ${result.H_Corg.toFixed(3)} ${result.H_Corg < 0.7 ? "<" : "≥"} 0.7`,
      }),
    },
    {
      id: "ibiMinTemp",
      category: "pyrolysis",
      type: "auto",
      weight: 7,
      critical: false,
      labelKey: "methodologies:ibi.checks.ibiMinTemp.label",
      descKey: "methodologies:ibi.checks.ibiMinTemp.desc",
      evaluator: ({ temperature }) => ({
        pass: temperature >= 350,
        detail: `${temperature} °C ${temperature >= 350 ? "≥" : "<"} 350 °C`,
      }),
    },
    {
      id: "ibiBETSurface",
      category: "quality",
      type: "auto",
      weight: 4,
      critical: false,
      labelKey: "methodologies:ibi.checks.ibiBETSurface.label",
      descKey: "methodologies:ibi.checks.ibiBETSurface.desc",
      evaluator: ({ result }) => ({
        pass: result.BET >= 50,
        detail: `BET = ${result.BET.toFixed(0)} m²/g`,
      }),
    },

    // ─── MANUAL (8) ──────────────────────────────────────────────────────
    {
      id: "ibiHeavyMetals",
      category: "quality",
      type: "manual",
      weight: 9,
      critical: true,
      labelKey: "methodologies:ibi.checks.ibiHeavyMetals.label",
      descKey: "methodologies:ibi.checks.ibiHeavyMetals.desc",
    },
    {
      id: "ibiPAH",
      category: "quality",
      type: "manual",
      weight: 7,
      critical: true,
      labelKey: "methodologies:ibi.checks.ibiPAH.label",
      descKey: "methodologies:ibi.checks.ibiPAH.desc",
    },
    {
      id: "ibiCCE",
      category: "quality",
      type: "manual",
      weight: 5,
      critical: false,
      labelKey: "methodologies:ibi.checks.ibiCCE.label",
      descKey: "methodologies:ibi.checks.ibiCCE.desc",
    },
    {
      id: "ibiBulkDensity",
      category: "quality",
      type: "manual",
      weight: 4,
      critical: false,
      labelKey: "methodologies:ibi.checks.ibiBulkDensity.label",
      descKey: "methodologies:ibi.checks.ibiBulkDensity.desc",
    },
    {
      id: "ibiParticleSize",
      category: "quality",
      type: "manual",
      weight: 4,
      critical: false,
      labelKey: "methodologies:ibi.checks.ibiParticleSize.label",
      descKey: "methodologies:ibi.checks.ibiParticleSize.desc",
    },
    {
      id: "ibiGerminationTest",
      category: "quality",
      type: "manual",
      weight: 6,
      critical: false,
      labelKey: "methodologies:ibi.checks.ibiGerminationTest.label",
      descKey: "methodologies:ibi.checks.ibiGerminationTest.desc",
    },
    {
      id: "ibiTestingCert",
      category: "docs",
      type: "manual",
      weight: 8,
      critical: true,
      labelKey: "methodologies:ibi.checks.ibiTestingCert.label",
      descKey: "methodologies:ibi.checks.ibiTestingCert.desc",
    },
    {
      id: "ibiLabelingDeclaration",
      category: "docs",
      type: "manual",
      weight: 5,
      critical: false,
      labelKey: "methodologies:ibi.checks.ibiLabelingDeclaration.label",
      descKey: "methodologies:ibi.checks.ibiLabelingDeclaration.desc",
    },
  ],
};

// ============================================================================
// REGISTRY
// ============================================================================

export const METHODOLOGIES: Record<MethodologyId, Methodology> = {
  "puro-earth": PURO_EARTH,
  "isometric": ISOMETRIC,
  // Placeholder for future — will be added in subsequent phases
  "verra-vm0044": {
    ...PURO_EARTH,
    id: "verra-vm0044",
    name: "Verra VM0044 (coming soon)",
    shortName: "Verra",
    color: "text-purple-500",
    accent: "bg-purple-500/10 border-purple-500/30",
    tagline: "The largest voluntary carbon market registry. Coming soon.",
    requiredTier: "engineer",
    checks: [], // empty = disabled
    priceRange: "USD 60–150",
    priceNote: "per tCO₂e · VCS market · major LatAm registry",
    durability: "Permanent per methodology",
    durabilityNote: "Requires permanence tolerance + sampling plan",
  },
  "gold-standard": {
    ...PURO_EARTH,
    id: "gold-standard",
    name: "Gold Standard (coming soon)",
    shortName: "Gold Standard",
    color: "text-amber-500",
    accent: "bg-amber-500/10 border-amber-500/30",
    tagline: "Reputable certification, coming soon.",
    requiredTier: "engineer",
    checks: [],
    priceRange: "USD 80–200",
    priceNote: "per tCO₂e · SDG-aligned buyers · premium reputational signal",
    durability: "100+ years",
    durabilityNote: "SOC framework-based · SDG co-benefits required",
  },
  "ebc": EBC,
  "ibi": IBI,
};

/** Methodologies currently active (have checks defined). */
export const ACTIVE_METHODOLOGIES: MethodologyId[] = ["puro-earth", "isometric", "ebc", "ibi"];

export function getMethodology(id: MethodologyId): Methodology {
  return METHODOLOGIES[id];
}

export function isMethodologyActive(id: MethodologyId): boolean {
  return ACTIVE_METHODOLOGIES.includes(id);
}
