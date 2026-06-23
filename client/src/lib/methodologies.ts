/**
 * Multi-methodology framework for biochar certification readiness.
 *
 * Each methodology (Puro.earth, Isometric, Verra VM0044, Gold Standard, EBC) is
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
  | "rainbow-standard";

export type MethodologyLaunchStage = "active" | "preparation";
export type CheckCategory = "feedstock" | "pyrolysis" | "quality" | "lca" | "docs" | "monitoring";
export type CheckType = "auto" | "manual";
type MethodologyLocale = "es" | "en";

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
   * For quality-only standards (EBC) set to null — credits are not issued
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

interface LocalizedMethodologyCopy {
  name?: Record<MethodologyLocale, string>;
  tagline: Record<MethodologyLocale, string>;
  priceNote: Record<MethodologyLocale, string> | null;
  durability: Record<MethodologyLocale, string> | null;
  durabilityNote: Record<MethodologyLocale, string> | null;
}

function pickMethodologyLocale(lang?: string): MethodologyLocale {
  return lang?.toLowerCase().startsWith("es") ? "es" : "en";
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
  tagline: "Most adopted route for biochar CORCs.",
  credits: true,
  requiredTier: "analyst",
  minPassingScore: 80,
  priceRange: "USD 130–250",
  priceNote: "per tCO₂e · reference secondary-market range · strong corporate demand",
  durability: "100+ years",
  durabilityNote: "Biochar stability screened with H:Corg < 0.7",
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
  tagline: "Biochar protocol with 200- and 1,000-year durability classes.",
  credits: true,
  requiredTier: "developer",
  minPassingScore: 80,
  priceRange: "USD 180–350",
  priceNote: "per tCO₂e · premium for 1,000-year durability",
  durability: "200 or 1,000 years",
  durabilityNote: "Two classes · BC-1 required for the 1,000-year tier",
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
  tagline: "Quality standard often used upstream of credit issuance.",
  credits: false,
  requiredTier: "analyst",
  minPassingScore: 80,
  priceRange: null,
  priceNote: "quality certification · does not issue credits directly · feeds Puro.earth / Isometric submissions",
  durability: "—",
  durabilityNote: "Quality + contaminant limits · no direct permanence claim",
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

const METHODOLOGY_LAUNCH_STAGE: Record<MethodologyId, MethodologyLaunchStage> = {
  "puro-earth": "active",
  "isometric": "active",
  "verra-vm0044": "active",
  "ebc": "active",
  "rainbow-standard": "active",
  "gold-standard": "preparation",
};

const LOCALIZED_METHODLOGY_COPY: Record<MethodologyId, LocalizedMethodologyCopy> = {
  "puro-earth": {
    tagline: {
      en: "Most adopted route for biochar CORCs.",
      es: "La ruta más adoptada para CORCs de biochar.",
    },
    priceNote: {
      en: "per tCO₂e · reference secondary-market range · strong corporate demand",
      es: "por tCO₂e · rango de referencia en mercado secundario · demanda corporativa sólida",
    },
    durability: {
      en: "100+ years",
      es: "100+ años",
    },
    durabilityNote: {
      en: "Biochar stability screened with H:Corg < 0.7",
      es: "La estabilidad del biochar se filtra con H:Corg < 0.7",
    },
  },
  "isometric": {
    tagline: {
      en: "Biochar protocol with 200- and 1,000-year durability classes.",
      es: "Protocolo de biochar con clases de durabilidad de 200 y 1,000 años.",
    },
    priceNote: {
      en: "per tCO₂e · premium for 1,000-year durability",
      es: "por tCO₂e · prima por durabilidad de 1,000 años",
    },
    durability: {
      en: "200 or 1,000 years",
      es: "200 o 1,000 años",
    },
    durabilityNote: {
      en: "Two classes · BC-1 required for the 1,000-year tier",
      es: "Dos clases · BC-1 requerido para el tier de 1,000 años",
    },
  },
  "verra-vm0044": {
    tagline: {
      en: "VCS route for soil and non-soil biochar with CCP approval.",
      es: "Ruta VCS para biochar en suelo y fuera de suelo con aprobación CCP.",
    },
    priceNote: {
      en: "per tCO₂e · VCU range · CCP label · 12-24 month process",
      es: "por tCO₂e · rango VCU · sello CCP · proceso de 12-24 meses",
    },
    durability: {
      en: "Permanence factor 0.56-0.89",
      es: "Factor de permanencia 0.56-0.89",
    },
    durabilityNote: {
      en: "Depends on pyrolysis temperature · PAC 75% when H:Corg < 0.4",
      es: "Depende de la temperatura de pirólisis · PAC 75% cuando H:Corg < 0.4",
    },
  },
  "gold-standard": {
    name: {
      en: "Gold Standard Sustainable Biochar (in preparation)",
      es: "Gold Standard Sustainable Biochar (en preparación)",
    },
    tagline: {
      en: "Pre-staging route while Sustainable Biochar is still being published.",
      es: "Ruta de pre-staging mientras Sustainable Biochar termina de publicarse.",
    },
    priceNote: {
      en: "per tCO₂e · SDG-aligned premium if published · methodology still pending",
      es: "por tCO₂e · posible prima alineada a SDGs · metodología todavía pendiente",
    },
    durability: {
      en: "To be defined in final methodology",
      es: "A definir en la metodología final",
    },
    durabilityNote: {
      en: "Today we only expose SDG + VVB preparation; no official thresholds are published yet.",
      es: "Hoy solo mostramos la preparación de SDGs + VVB; todavía no hay umbrales oficiales publicados.",
    },
  },
  "ebc": {
    tagline: {
      en: "Quality standard often used upstream of credit issuance.",
      es: "Estándar de calidad que suele usarse antes de emitir créditos.",
    },
    priceNote: {
      en: "quality certification · does not issue credits directly · feeds Puro.earth / Isometric submissions",
      es: "certificación de calidad · no emite créditos directamente · alimenta envíos a Puro.earth / Isometric",
    },
    durability: {
      en: "Not applicable",
      es: "No aplica",
    },
    durabilityNote: {
      en: "Quality + contaminant limits · no direct permanence claim",
      es: "Límites de calidad y contaminantes · sin claim directo de permanencia",
    },
  },
  "rainbow-standard": {
    tagline: {
      en: "Biochar route with ICVCM-backed registry infrastructure and faster cycles.",
      es: "Ruta de biochar con infraestructura registral respaldada por ICVCM y ciclos más cortos.",
    },
    priceNote: {
      en: "per tCO₂e · range depends on permanence class and buyer",
      es: "por tCO₂e · el rango depende de la clase de permanencia y del buyer",
    },
    durability: {
      en: "100-year minimum · 1,000+ years optional",
      es: "Mínimo 100 años · 1,000+ años opcional",
    },
    durabilityNote: {
      en: "Requires transparent permanence disclosure and annual audit cadence.",
      es: "Exige disclosure transparente de permanencia y una cadencia anual de auditoría.",
    },
  },
};

// ============================================================================
// REGISTRY
// ============================================================================

export const METHODOLOGIES: Record<MethodologyId, Methodology> = {
  "puro-earth": PURO_EARTH,
  "isometric": ISOMETRIC,
  // Placeholder for future — will be added in subsequent phases
  /**
   * Verra VM0044 — "Methodology for Biochar Utilization in Soil and Non-Soil
   * Applications". v1.2 active since 27 Jun 2025. ICVCM CCP-approved (2025).
   *
   * Published PDF (v1.1, v1.2 from Verra portal):
   * https://verra.org/methodologies/vm0044-biochar-utilization-in-soil-and-non-soil-applications-v1-2/
   *
   * Thresholds come straight from the methodology PDF (Applicability Conditions
   * + permanence factor tables). Heavy-metal and PAH limits are delegated to
   * EBC certification — we surface that as a manual check rather than
   * duplicating their tables here.
   *
   * Registered projects (Apr 2026): 3 in registry (Odisha India "Project
   * Reignite" VCS 4679 being the first). ~249K VCUs/year combined.
   */
  "verra-vm0044": {
    id: "verra-vm0044",
    name: "Verra VM0044 — Biochar Utilization (v1.2)",
    shortName: "Verra",
    color: "text-purple-500",
    accent: "bg-purple-500/10 border-purple-500/30",
    tagline: "VCS route for soil and non-soil biochar with CCP approval.",
    credits: true,
    requiredTier: "developer",
    minPassingScore: 80,
    priceRange: "USD 120–180",
    priceNote: "per tCO₂e · VCU range · CCP label · 12-24 month process",
    durability: "Permanence factor 0.56–0.89",
    durabilityNote: "Depends on pyrolysis temperature · PAC 75% when H:Corg < 0.4",
    checks: [
      // ─── AUTO CHECKS (5) ─────────────────────────────────────────────────
      {
        id: "verraHCorgMax",
        category: "quality",
        type: "auto",
        weight: 10,
        critical: true,
        labelKey: "methodologies:verra-vm0044.checks.verraHCorgMax.label",
        descKey: "methodologies:verra-vm0044.checks.verraHCorgMax.desc",
        evaluator: ({ result }) => ({
          pass: result.H_Corg <= 0.7,
          detail: `H:Corg = ${result.H_Corg.toFixed(3)} ${result.H_Corg <= 0.7 ? "≤" : ">"} 0.7`,
        }),
      },
      {
        id: "verraCorgMin",
        category: "quality",
        type: "auto",
        weight: 9,
        critical: true,
        labelKey: "methodologies:verra-vm0044.checks.verraCorgMin.label",
        descKey: "methodologies:verra-vm0044.checks.verraCorgMin.desc",
        evaluator: ({ result }) => ({
          pass: result.C >= 50,
          detail: `Corg = ${result.C.toFixed(1)}% ${result.C >= 50 ? "≥" : "<"} 50%`,
        }),
      },
      {
        id: "verraPermanenceFactor",
        category: "pyrolysis",
        type: "auto",
        weight: 8,
        critical: false,
        labelKey: "methodologies:verra-vm0044.checks.verraPermanenceFactor.label",
        descKey: "methodologies:verra-vm0044.checks.verraPermanenceFactor.desc",
        evaluator: ({ temperature }) => {
          // VM0044 permanence factor tiers based on measured pyrolysis T°:
          //   ≥ 600 °C  → 0.89
          //   450–600   → 0.80
          //   350–450   → 0.65
          //   < 350 or unmeasured → 0.56 (default floor)
          // "Pass" = user is above the floor (i.e. has measurable T above 350).
          let factor = 0.56;
          let tier = "default floor";
          if (temperature >= 600) { factor = 0.89; tier = "highest tier"; }
          else if (temperature >= 450) { factor = 0.80; tier = "high tier"; }
          else if (temperature >= 350) { factor = 0.65; tier = "mid tier"; }
          return {
            pass: temperature >= 350,
            detail: `${temperature} °C → permanence factor ${factor.toFixed(2)} (${tier})`,
          };
        },
      },
      {
        id: "verraHighPermanenceClass",
        category: "quality",
        type: "auto",
        weight: 6,
        critical: false,
        labelKey: "methodologies:verra-vm0044.checks.verraHighPermanenceClass.label",
        descKey: "methodologies:verra-vm0044.checks.verraHighPermanenceClass.desc",
        evaluator: ({ result }) => ({
          pass: result.H_Corg < 0.4,
          detail: result.H_Corg < 0.4
            ? `H:Corg = ${result.H_Corg.toFixed(3)} < 0.4 → PAC 75% / SPC 25%`
            : `H:Corg = ${result.H_Corg.toFixed(3)} ≥ 0.4 → no high-permanence split`,
        }),
      },
      {
        id: "verraNetRemoval",
        category: "lca",
        type: "auto",
        weight: 9,
        critical: true,
        labelKey: "methodologies:verra-vm0044.checks.verraNetRemoval.label",
        descKey: "methodologies:verra-vm0044.checks.verraNetRemoval.desc",
        evaluator: ({ result }) => ({
          pass: result.credits.net > 0,
          detail: `Net CO₂e = ${result.credits.net.toFixed(2)} t/t (after pyrolysis + transport + leakage)`,
        }),
      },

      // ─── MANUAL CHECKS (9) ───────────────────────────────────────────────
      {
        id: "verraEbcUpstream",
        category: "quality",
        type: "manual",
        weight: 9,
        critical: true,
        labelKey: "methodologies:verra-vm0044.checks.verraEbcUpstream.label",
        descKey: "methodologies:verra-vm0044.checks.verraEbcUpstream.desc",
      },
      {
        id: "verraFeedstockEligibility",
        category: "feedstock",
        type: "manual",
        weight: 9,
        critical: true,
        labelKey: "methodologies:verra-vm0044.checks.verraFeedstockEligibility.label",
        descKey: "methodologies:verra-vm0044.checks.verraFeedstockEligibility.desc",
      },
      {
        id: "verraBaselineScenario",
        category: "lca",
        type: "manual",
        weight: 8,
        critical: true,
        labelKey: "methodologies:verra-vm0044.checks.verraBaselineScenario.label",
        descKey: "methodologies:verra-vm0044.checks.verraBaselineScenario.desc",
      },
      {
        id: "verraAdditionalityInvestment",
        category: "docs",
        type: "manual",
        weight: 9,
        critical: true,
        labelKey: "methodologies:verra-vm0044.checks.verraAdditionalityInvestment.label",
        descKey: "methodologies:verra-vm0044.checks.verraAdditionalityInvestment.desc",
      },
      {
        id: "verraRegulatorySurplus",
        category: "docs",
        type: "manual",
        weight: 7,
        critical: false,
        labelKey: "methodologies:verra-vm0044.checks.verraRegulatorySurplus.label",
        descKey: "methodologies:verra-vm0044.checks.verraRegulatorySurplus.desc",
      },
      {
        id: "verraVvbSelected",
        category: "docs",
        type: "manual",
        weight: 8,
        critical: true,
        labelKey: "methodologies:verra-vm0044.checks.verraVvbSelected.label",
        descKey: "methodologies:verra-vm0044.checks.verraVvbSelected.desc",
      },
      {
        id: "verraAfoluRiskTool",
        category: "docs",
        type: "manual",
        weight: 7,
        critical: false,
        labelKey: "methodologies:verra-vm0044.checks.verraAfoluRiskTool.label",
        descKey: "methodologies:verra-vm0044.checks.verraAfoluRiskTool.desc",
      },
      {
        id: "verraMonitoringPlan",
        category: "monitoring",
        type: "manual",
        weight: 7,
        critical: false,
        labelKey: "methodologies:verra-vm0044.checks.verraMonitoringPlan.label",
        descKey: "methodologies:verra-vm0044.checks.verraMonitoringPlan.desc",
      },
      {
        id: "verraNonSoilEvidence",
        category: "docs",
        type: "manual",
        weight: 4,
        critical: false,
        labelKey: "methodologies:verra-vm0044.checks.verraNonSoilEvidence.label",
        descKey: "methodologies:verra-vm0044.checks.verraNonSoilEvidence.desc",
      },
    ],
  },
  /**
   * Gold Standard — Sustainable Biochar methodology is IN DEVELOPMENT since
   * Dec 2024 (https://globalgoals.goldstandard.org/in-development/sustainable-biochar/).
   * As of Apr 2026 there are 0 biochar projects registered in the Gold
   * Standard Impact Registry and 0 credits issued. No official H/C, PAH,
   * heavy-metal, or temperature thresholds published — so we deliberately do
   * NOT emit auto-checks that would require inventing numbers.
   *
   * What we CAN surface today: the two cross-cutting requirements that
   * every Gold Standard activity must satisfy (3+ SDGs + accredited VVB).
   * This lets Engineer-tier users pre-stage the paperwork so they're ready
   * the moment GS publishes the methodology draft.
   */
  "gold-standard": {
    id: "gold-standard",
    name: "Gold Standard Sustainable Biochar (in development)",
    shortName: "Gold Standard",
    color: "text-amber-500",
    accent: "bg-amber-500/10 border-amber-500/30",
    tagline: "Pre-staging route while Sustainable Biochar is still being published.",
    credits: true,
    requiredTier: "engineer",
    minPassingScore: 80,
    priceRange: "USD 150–270",
    priceNote: "per tCO₂e · SDG-aligned premium if published · methodology still pending",
    durability: "To be defined in final methodology",
    durabilityNote: "Today we only expose SDG + VVB preparation; no official thresholds are published yet.",
    checks: [
      // ─── MANUAL (2) — cross-cutting Gold Standard requirements ──────────
      // No auto-checks: no official thresholds yet. We don't fake it.
      {
        id: "gsSdgBenefits",
        category: "docs",
        type: "manual",
        weight: 9,
        critical: true,
        labelKey: "methodologies:gold-standard.checks.gsSdgBenefits.label",
        descKey: "methodologies:gold-standard.checks.gsSdgBenefits.desc",
      },
      {
        id: "gsVvbSelected",
        category: "docs",
        type: "manual",
        weight: 8,
        critical: true,
        labelKey: "methodologies:gold-standard.checks.gsVvbSelected.label",
        descKey: "methodologies:gold-standard.checks.gsVvbSelected.desc",
      },
    ],
  },
  "ebc": EBC,
  /**
   * Rainbow Standard — BiCRS (Biomass Carbon Removal & Storage) methodology.
   * Source: rainbowstandard.io/certify-credits + docs.rainbowstandard.io.
   *
   * What we know (as of Apr 2026):
   *   - ICVCM-approved (Core Carbon Principles) + ICROA-endorsed.
   *   - 80+ projects certified, 400,000+ credits issued on Rainbow Registry.
   *   - Multi-methodology framework; BiCRS module covers biochar.
   *   - Permanence horizon: 100 years minimum (required); 1000+ years optional.
   *   - Timeline claim: <3 months certification (vs 12-18mo Puro/Verra).
   *   - Buyers already active on platform: BNP Paribas, South Pole, Ceezer,
   *     Patch, Removall, Climate Seed, Oklima.
   *   - Annual independent audits + year-round monitoring required.
   *
   * What we don't know publicly (as of the integration date):
   *   - Numerical biochar thresholds (H/Corg, temperature). Their BiCRS module
   *     mentions Molar H/C_org as a stability metric but doesn't publish a
   *     threshold number on the public doc. So we don't invent one — we flag
   *     the universal biochar bar (H/Corg < 0.7) that applies regardless, and
   *     leave the rest as manual checks.
   *
   * Positioning note: tight timeline + ICVCM + buyers-already-active makes
   * this the natural pick for operators of running plants who need to close
   * a first offtake contract fast.
   */
  "rainbow-standard": {
    id: "rainbow-standard",
    name: "Rainbow Standard — BiCRS",
    shortName: "Rainbow",
    color: "text-pink-500",
    accent: "bg-pink-500/10 border-pink-500/30",
    tagline: "Biochar route with ICVCM-backed registry infrastructure and faster cycles.",
    credits: true,
    requiredTier: "analyst",
    minPassingScore: 75,
    priceRange: "USD 120–200",
    priceNote: "per tCO₂e · range depends on permanence class and buyer",
    durability: "100-year minimum · 1,000+ years optional",
    durabilityNote: "Requires transparent permanence disclosure and annual audit cadence.",
    checks: [
      // ─── AUTO (universal biochar bar) ────────────────────────────────────
      {
        id: "rainbowHCorg",
        category: "quality",
        type: "auto",
        weight: 9,
        critical: true,
        labelKey: "methodologies:rainbow-standard.checks.rainbowHCorg.label",
        descKey: "methodologies:rainbow-standard.checks.rainbowHCorg.desc",
        evaluator: (input) => {
          const ratio = input.result.H_Corg;
          if (ratio < 0.7) return { pass: true, detail: `H/Corg ${ratio.toFixed(3)} < 0.7` };
          return { pass: false, detail: `H/Corg ${ratio.toFixed(3)} ≥ 0.7 — fails universal biochar stability bar` };
        },
      },
      {
        id: "rainbowNetRemoval",
        category: "lca",
        type: "auto",
        weight: 8,
        critical: true,
        labelKey: "methodologies:rainbow-standard.checks.rainbowNetRemoval.label",
        descKey: "methodologies:rainbow-standard.checks.rainbowNetRemoval.desc",
        evaluator: ({ result }) => ({
          pass: result.credits.net > 0,
          detail: `Net CO₂e = ${result.credits.net.toFixed(2)} t/t`,
        }),
      },
      // ─── MANUAL (cross-cutting Rainbow requirements) ─────────────────────
      {
        id: "rainbowICVCMAlignment",
        category: "docs",
        type: "manual",
        weight: 8,
        critical: true,
        labelKey: "methodologies:rainbow-standard.checks.rainbowICVCMAlignment.label",
        descKey: "methodologies:rainbow-standard.checks.rainbowICVCMAlignment.desc",
      },
      {
        id: "rainbowPermanenceDisclosure",
        category: "docs",
        type: "manual",
        weight: 8,
        critical: true,
        labelKey: "methodologies:rainbow-standard.checks.rainbowPermanenceDisclosure.label",
        descKey: "methodologies:rainbow-standard.checks.rainbowPermanenceDisclosure.desc",
      },
      {
        id: "rainbowFeedstockSustainability",
        category: "feedstock",
        type: "manual",
        weight: 7,
        critical: false,
        labelKey: "methodologies:rainbow-standard.checks.rainbowFeedstockSustainability.label",
        descKey: "methodologies:rainbow-standard.checks.rainbowFeedstockSustainability.desc",
      },
      {
        id: "rainbowAdditionalityCase",
        category: "docs",
        type: "manual",
        weight: 8,
        critical: true,
        labelKey: "methodologies:rainbow-standard.checks.rainbowAdditionalityCase.label",
        descKey: "methodologies:rainbow-standard.checks.rainbowAdditionalityCase.desc",
      },
      {
        id: "rainbowIndependentAudit",
        category: "monitoring",
        type: "manual",
        weight: 7,
        critical: true,
        labelKey: "methodologies:rainbow-standard.checks.rainbowIndependentAudit.label",
        descKey: "methodologies:rainbow-standard.checks.rainbowIndependentAudit.desc",
      },
      {
        id: "rainbowISO14064",
        category: "docs",
        type: "manual",
        weight: 6,
        critical: false,
        labelKey: "methodologies:rainbow-standard.checks.rainbowISO14064.label",
        descKey: "methodologies:rainbow-standard.checks.rainbowISO14064.desc",
      },
      {
        id: "rainbowMonitoringPlan",
        category: "monitoring",
        type: "manual",
        weight: 6,
        critical: false,
        labelKey: "methodologies:rainbow-standard.checks.rainbowMonitoringPlan.label",
        descKey: "methodologies:rainbow-standard.checks.rainbowMonitoringPlan.desc",
      },
      {
        id: "rainbowCoBenefits",
        category: "docs",
        type: "manual",
        weight: 5,
        critical: false,
        labelKey: "methodologies:rainbow-standard.checks.rainbowCoBenefits.label",
        descKey: "methodologies:rainbow-standard.checks.rainbowCoBenefits.desc",
      },
      {
        id: "rainbowEndUseTraceability",
        category: "docs",
        type: "manual",
        weight: 5,
        critical: false,
        labelKey: "methodologies:rainbow-standard.checks.rainbowEndUseTraceability.label",
        descKey: "methodologies:rainbow-standard.checks.rainbowEndUseTraceability.desc",
      },
    ],
  },
};

/**
 * Methodologies currently rendered in the score UI.
 *
 * - Five are fully live today (Puro.earth, Isometric, EBC, Verra VM0044,
 *   Rainbow Standard).
 * - Gold Standard is exposed as a preparation route, not as a fully published
 *   methodology.
 * - Puro.earth, Isometric, EBC: full check sets with published thresholds.
 * - Verra VM0044: active since v1.2 published Jun 2025. Full auto-checks
 *   backed by the official PDF + ICVCM CCP approval.
 * - Gold Standard: ships with only 2 cross-cutting manual checks because
 *   GS's Sustainable Biochar methodology is still in development (no official
 *   H/C, temperature, or PAH thresholds as of Apr 2026). Activating it lets
 *   Engineer-tier users pre-stage SDG + VVB paperwork ahead of GS publication.
 */
export const ACTIVE_METHODOLOGIES: MethodologyId[] = ["puro-earth", "isometric", "ebc", "verra-vm0044", "gold-standard", "rainbow-standard"];
export const LIVE_METHODOLOGIES: MethodologyId[] = ACTIVE_METHODOLOGIES.filter(
  (id) => METHODOLOGY_LAUNCH_STAGE[id] === "active",
);
export const PREPARATION_METHODOLOGIES: MethodologyId[] = ACTIVE_METHODOLOGIES.filter(
  (id) => METHODOLOGY_LAUNCH_STAGE[id] === "preparation",
);
export const COVERED_METHODOLOGIES: MethodologyId[] = [...ACTIVE_METHODOLOGIES];

export function getMethodology(id: MethodologyId): Methodology {
  return METHODOLOGIES[id];
}

export function isMethodologyActive(id: MethodologyId): boolean {
  return ACTIVE_METHODOLOGIES.includes(id);
}

export function getMethodologyLaunchStage(id: MethodologyId): MethodologyLaunchStage {
  return METHODOLOGY_LAUNCH_STAGE[id];
}

export function getMethodologyName(id: MethodologyId, lang?: string): string {
  const locale = pickMethodologyLocale(lang);
  return LOCALIZED_METHODLOGY_COPY[id].name?.[locale] ?? METHODOLOGIES[id].name;
}

export function getMethodologyTagline(id: MethodologyId, lang?: string): string {
  const locale = pickMethodologyLocale(lang);
  return LOCALIZED_METHODLOGY_COPY[id].tagline[locale];
}

export function getMethodologyPriceNote(id: MethodologyId, lang?: string): string | null {
  const locale = pickMethodologyLocale(lang);
  return LOCALIZED_METHODLOGY_COPY[id].priceNote?.[locale] ?? METHODOLOGIES[id].priceNote;
}

export function getMethodologyDurability(id: MethodologyId, lang?: string): string | null {
  const locale = pickMethodologyLocale(lang);
  return LOCALIZED_METHODLOGY_COPY[id].durability?.[locale] ?? METHODOLOGIES[id].durability;
}

export function getMethodologyDurabilityNote(id: MethodologyId, lang?: string): string | null {
  const locale = pickMethodologyLocale(lang);
  return LOCALIZED_METHODLOGY_COPY[id].durabilityNote?.[locale] ?? METHODOLOGIES[id].durabilityNote;
}
