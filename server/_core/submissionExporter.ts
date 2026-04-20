/**
 * Generic submission exporter.
 *
 * Serializes a project's data + simulation outputs + auto-check results into
 * a structured JSON blob for methodology submission. The generated file is
 * NOT the official Puro.earth / Isometric / EBC / IBI ingestion schema — those
 * certifiers each have their own intake form / Certify platform. It IS a
 * clean, machine-readable record that:
 *   1. Can be attached to the official intake as supporting documentation.
 *   2. Can be reviewed by consultants / internal teams before submission.
 *   3. Makes our "infrastructure layer" pitch real — structured data, audit trail.
 *
 * Implementation note: methodology-specific field overrides live inside the
 * switch block near the bottom, so adding a 5th / 6th methodology is a
 * 10-line diff.
 */

import type { Project } from "../../drizzle/schema";

// Reused constants — mirror what the client uses in Executive Summary and demo.
export const ANNUAL_OPERATING_HOURS = 8000;
export const CORC_PRICE_USD = 150;

export interface SubmissionExportOptions {
  methodologyId: string;
  project: Project;
  /** Computed simulation result from biocharModel.compute_all */
  result: {
    yield_: number;
    C: number;
    H: number;
    H_Corg: number;
    O_Corg: number;
    BET: number;
    pH: number;
    credits: { class: string; sf: number; gross: number; net: number };
  };
  /** Resolved feedstock object (from FEEDSTOCK_DB or parsed feedstockData) */
  feedstock: {
    id?: string;
    name: string;
    category?: string;
    elemental?: { C: number; H: number; N: number; S?: number; O?: number };
    ash_pct?: number;
    moisture_pct?: number;
  };
  /** Methodology meta from methodologies.ts */
  methodology: {
    id: string;
    name: string;
    shortName: string;
    priceRange: string | null;
    durability: string | null;
    checks: Array<{
      id: string;
      type: "auto" | "manual";
      critical: boolean;
      weight: number;
      labelKey: string;
      descKey: string;
    }>;
  };
  /** Auto-check evaluation results (same shape verifyByBopId already produces) */
  autoCheckResults: Array<{
    id: string;
    passed: boolean;
    detail?: string;
    critical: boolean;
  }>;
}

export interface SubmissionPayload {
  // ─── Provenance ───────────────────────────────────────────────────────
  schema_version: "bop.submission.v1";
  generator: string;
  generated_at: string;
  bop_id: string | null;
  verification_url: string | null;

  // ─── Methodology targeted ─────────────────────────────────────────────
  methodology: {
    id: string;
    name: string;
    short_name: string;
    reference_market_price_usd: string | null;
    durability_claim: string | null;
  };

  // ─── Project identity ─────────────────────────────────────────────────
  project: {
    name: string;
    description: string | null;
    location: string | null;
    country: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  };

  // ─── Feedstock ────────────────────────────────────────────────────────
  feedstock: {
    id: string | null;
    name: string;
    category: string | null;
    elemental_composition: {
      C_pct: number | null;
      H_pct: number | null;
      N_pct: number | null;
      S_pct: number | null;
      O_pct: number | null;
    };
    ash_pct: number | null;
    moisture_pct: number | null;
  };

  // ─── Pyrolysis parameters ─────────────────────────────────────────────
  pyrolysis: {
    plant_capacity_tph: number | null;
    annual_operating_hours: number;
    temperature_c: number | null;
    residence_time_min: number | null;
    quality_goal: string | null;
  };

  // ─── Computed biochar characteristics ─────────────────────────────────
  biochar_characteristics: {
    yield_pct: number;
    carbon_pct: number;
    hydrogen_pct: number;
    h_corg_molar_ratio: number;
    o_corg_molar_ratio: number;
    bet_surface_area_m2_g: number;
    ph: number;
  };

  // ─── Annual estimates at design capacity ──────────────────────────────
  annual_estimates: {
    feedstock_processed_t: number | null;
    biochar_output_t: number | null;
    net_co2_removals_t: number | null;
    corc_revenue_potential_usd: number | null;
    corc_reference_price_usd: number;
  };

  // ─── LCA / CORC breakdown (t CO2e per t feedstock) ────────────────────
  corc_breakdown_per_t_feedstock: {
    durability_class: string;
    stability_factor: number;
    gross: number;
    net: number;
  };

  // ─── Methodology compliance ───────────────────────────────────────────
  methodology_compliance: {
    auto_checks: Array<{
      id: string;
      label_key: string;
      passed: boolean;
      critical: boolean;
      detail: string | null;
    }>;
    manual_checks_pending: Array<{
      id: string;
      label_key: string;
      critical: boolean;
      description_key: string;
    }>;
    auto_passed_count: number;
    auto_total_count: number;
  };

  // ─── Methodology-specific fields ──────────────────────────────────────
  // Extra fields that only make sense for certain methodologies (e.g. IBI's
  // carbon class, Isometric's durability tier). Added at the bottom of the
  // JSON so it doesn't pollute the generic structure.
  methodology_specific?: Record<string, unknown>;

  // ─── Disclaimer / guidance for the recipient ──────────────────────────
  disclaimer: string;
  submission_guidance: string;
}

const GENERATOR_VERSION = "Biochar Optimizer Pro · submission exporter v1.0";

const DISCLAIMER =
  "This JSON file is a pre-submission package generated automatically by Biochar Optimizer Pro (biocharpro.io). " +
  "All auto-verifiable fields have been computed from the project's simulation inputs. Manual checks require independent " +
  "lab testing (heavy metals, PAH, H:Corg, BET surface) and additionality / monitoring documentation. This file IS NOT an " +
  "official ingestion schema for any certifier — it is structured supporting documentation meant to accompany an official " +
  "submission package.";

function guidanceFor(methodologyId: string): string {
  switch (methodologyId) {
    case "puro-earth":
      return "Attach this file to your Puro.earth Certify application under 'Supporting documentation · Project characterization'. Use the auto_checks array to prove compliance with Methodology Edition 2025 threshold requirements. Address any pending manual_checks before formal review.";
    case "isometric":
      return "Submit this file via Isometric Certify as supporting data for your durability class submission. Confirm the durability tier (200-yr vs 1,000-yr / BC-1) matches your internal LCA framework before uploading.";
    case "ebc":
      return "Include this file with your EBC application to Carbon Standards International. Note: EBC requires accredited lab testing for heavy metals, PAH, and H:Corg; the auto_checks here are a pre-audit heuristic, not a replacement for lab certificates.";
    case "ibi":
      return "Attach this file to your IBI biochar testing declaration. The auto-computed carbon class (1/2/3) is a preliminary classification — verify with an IBI-recognized analytical laboratory before publishing.";
    default:
      return "Attach this file to the official certifier intake process as supporting documentation. Verify all manual checks with the relevant lab / auditor before submission.";
  }
}

/**
 * Builds the methodology-specific extras block.
 */
function methodologySpecifics(opts: SubmissionExportOptions): Record<string, unknown> | undefined {
  const { methodologyId, result } = opts;
  switch (methodologyId) {
    case "isometric":
      return {
        durability_tier_eligible: result.H_Corg < 0.4 ? "BC-1 (1,000-yr)" : "BC-2 (200-yr)",
        h_corg_threshold_bc1: 0.4,
        bet_minimum: 100,
      };
    case "ibi": {
      const c = result.C;
      const ibiClass =
        c >= 60 ? "Class 1 (≥60% C)" :
        c >= 30 ? "Class 2 (30-60% C)" :
        c >= 10 ? "Class 3 (10-30% C)" :
        "Below Class 3 threshold";
      return {
        ibi_carbon_class: ibiClass,
        carbon_content_pct: c,
        classification_thresholds: { class_1: 60, class_2: 30, class_3: 10 },
      };
    }
    case "ebc":
      return {
        ebc_class_inferred:
          result.C >= 80 ? "Premium class" :
          result.C >= 60 ? "AgroBio / Agro class" :
          result.C >= 50 ? "Basic class" :
          "Below EBC Basic threshold",
        ebc_ph_range: "6-11 acceptable",
      };
    case "puro-earth":
      return {
        corc_edition: "2025",
        h_corg_threshold: 0.7,
        temperature_minimum_c: 350,
      };
    default:
      return undefined;
  }
}

export function buildSubmissionPayload(opts: SubmissionExportOptions): SubmissionPayload {
  const { project, result, feedstock, methodology, autoCheckResults, methodologyId } = opts;

  // Only auto checks go in auto_checks. Manual checks go in manual_checks_pending.
  const autoChecks = opts.methodology.checks.filter((c) => c.type === "auto");
  const manualChecks = opts.methodology.checks.filter((c) => c.type === "manual");

  // Map autoCheckResults back into full payload rows
  const autoCheckPayload = autoChecks.map((c) => {
    const hit = autoCheckResults.find((r) => r.id === c.id);
    return {
      id: c.id,
      label_key: c.labelKey,
      passed: hit?.passed ?? false,
      critical: c.critical,
      detail: hit?.detail ?? null,
    };
  });

  const autoPassed = autoCheckPayload.filter((x) => x.passed).length;

  // Annual estimates — only meaningful when plantCapacityTph is known.
  const cap = project.plantCapacityTph;
  const annualFeedstock = cap ? cap * ANNUAL_OPERATING_HOURS : null;
  const annualBiochar = annualFeedstock ? annualFeedstock * (result.yield_ / 100) : null;
  const annualCO2 = annualFeedstock ? annualFeedstock * result.credits.net : null;
  const annualRevenue = annualCO2 ? annualCO2 * CORC_PRICE_USD : null;

  return {
    schema_version: "bop.submission.v1",
    generator: GENERATOR_VERSION,
    generated_at: new Date().toISOString(),
    bop_id: project.bopId ?? null,
    verification_url: project.bopId ? `https://biocharpro.io/verify/${project.bopId}` : null,

    methodology: {
      id: methodology.id,
      name: methodology.name,
      short_name: methodology.shortName,
      reference_market_price_usd: methodology.priceRange,
      durability_claim: methodology.durability,
    },

    project: {
      name: project.name,
      description: project.description ?? null,
      location: project.location ?? null,
      country: project.country ?? null,
      status: project.status ?? "draft",
      created_at: project.createdAt instanceof Date ? project.createdAt.toISOString() : String(project.createdAt),
      updated_at: project.updatedAt instanceof Date ? project.updatedAt.toISOString() : String(project.updatedAt),
    },

    feedstock: {
      id: feedstock.id ?? project.feedstockId ?? null,
      name: feedstock.name,
      category: feedstock.category ?? null,
      elemental_composition: {
        C_pct: feedstock.elemental?.C ?? null,
        H_pct: feedstock.elemental?.H ?? null,
        N_pct: feedstock.elemental?.N ?? null,
        S_pct: feedstock.elemental?.S ?? null,
        O_pct: feedstock.elemental?.O ?? null,
      },
      ash_pct: feedstock.ash_pct ?? null,
      moisture_pct: feedstock.moisture_pct ?? null,
    },

    pyrolysis: {
      plant_capacity_tph: cap ?? null,
      annual_operating_hours: ANNUAL_OPERATING_HOURS,
      temperature_c: project.temperature ?? null,
      residence_time_min: project.residenceTime ?? null,
      quality_goal: project.qualityGoal ?? null,
    },

    biochar_characteristics: {
      yield_pct: round(result.yield_, 2),
      carbon_pct: round(result.C, 2),
      hydrogen_pct: round(result.H, 3),
      h_corg_molar_ratio: round(result.H_Corg, 4),
      o_corg_molar_ratio: round(result.O_Corg, 4),
      bet_surface_area_m2_g: round(result.BET, 0),
      ph: round(result.pH, 2),
    },

    annual_estimates: {
      feedstock_processed_t: annualFeedstock ? round(annualFeedstock, 0) : null,
      biochar_output_t: annualBiochar ? round(annualBiochar, 1) : null,
      net_co2_removals_t: annualCO2 ? round(annualCO2, 1) : null,
      corc_revenue_potential_usd: annualRevenue ? round(annualRevenue, 0) : null,
      corc_reference_price_usd: CORC_PRICE_USD,
    },

    corc_breakdown_per_t_feedstock: {
      durability_class: result.credits.class,
      stability_factor: round(result.credits.sf, 3),
      gross: round(result.credits.gross, 4),
      net: round(result.credits.net, 4),
    },

    methodology_compliance: {
      auto_checks: autoCheckPayload,
      manual_checks_pending: manualChecks.map((c) => ({
        id: c.id,
        label_key: c.labelKey,
        critical: c.critical,
        description_key: c.descKey,
      })),
      auto_passed_count: autoPassed,
      auto_total_count: autoChecks.length,
    },

    methodology_specific: methodologySpecifics(opts),

    disclaimer: DISCLAIMER,
    submission_guidance: guidanceFor(methodologyId),
  };
}

function round(n: number, decimals: number): number {
  const m = Math.pow(10, decimals);
  return Math.round(n * m) / m;
}
