/**
 * Deterministic carbon-mass balance for the AI Project Builder.
 *
 * Every AI-generated document (executive summary, LCA, masterplan, financial
 * summary, methodology compliance…) used to compute biochar output + CORCs
 * inline inside the LLM prompt as `capacityTnYear * 0.30 * 3 * 0.85`. Two
 * bugs stacked in that pattern:
 *
 *   1. The 30% biochar yield is on DRY biomass — but capacityTnYear is the
 *      operator's wet-basis input. For a Uruguay pine project with 46%
 *      moisture, applying 30% to the wet number over-reports biochar by
 *      almost 2× (19,935 t/yr instead of the correct 10,765 t/yr).
 *
 *   2. The 3.0 tCO2e/t biochar factor is a theoretical ceiling. It should
 *      be derived from the biochar's actual organic-carbon content and the
 *      methodology's permanence factor. A pine biochar at 78% C_org lands
 *      around 2.4 tCO2e/t, not 3.0.
 *
 * Fixing this once in a prompt would still let each doc drift — the LCA
 * and financial docs would recompute independently. The structural fix is
 * to compute the balance ONCE here, in code, and hand the result to every
 * doc as a fixed grounding block. The LLM's job is narrative, never math.
 */

/** Typical biochar carbon content per feedstock family. Used only when the
 *  lab hasn't provided a measured C_org value. Sources: peer-reviewed
 *  averages from CINDECA/CONICET and PYREG/EBC operator data. */
const TYPICAL_C_ORG_PCT: Record<string, number> = {
  // Woody biomass
  pine: 78, eucalyptus: 79, oak: 78, birch: 77, willow: 76, poplar: 76,
  teak: 78, bamboo: 72,
  // Softwood/hardwood generic
  softwood: 78, hardwood: 77,
  // Nut shells (very high fixed C)
  coconut_shell: 82, palm_kernel_shell: 80, walnut_shell: 78,
  almond_shell: 77, hazelnut_shell: 77, macadamia_shell: 79,
  peanut_shell: 68, coffee_husk: 68,
  // Agricultural residues (lower)
  rice_husk: 55, rice_straw: 52, wheat_straw: 60, corn_stover: 60,
  corn_cob: 68, sugarcane_bagasse: 65, cotton_stalk: 63,
  // Grasses
  miscanthus: 68, switchgrass: 65,
  // Manure & sludge (much lower)
  chicken_manure: 45, cow_manure: 42, pig_manure: 42, sewage_sludge: 40,
};

/** Default permanence factor per methodology (fraction of CORCs claimable
 *  once buffer / durability discount is applied). Conservative — real
 *  methodologies use tiered curves; these are the "typical outcome" for
 *  standard wood-based biochar with H:Corg ≤ 0.7. */
const DEFAULT_PERMANENCE_BY_METHODOLOGY: Record<string, number> = {
  "puro-earth": 0.85,      // Puro Ed. 2025 buffer for 100-yr durability
  "isometric": 0.90,       // stoichiometric — batch-specific; 0.90 = wood, H:Corg ~0.4
  "verra-vm0044": 0.80,    // IPCC framework with reversal buffer
  "ebc": 0.85,             // similar to Puro
  "gold-standard": 0.85,   // PARC draft
  "rainbow-standard": 0.80,
};

const DEFAULT_PERMANENCE = 0.85;
const DEFAULT_C_ORG_PCT = 75;    // safe fallback for unknown biomass
const DEFAULT_MOISTURE_PCT = 15; // typical dried feedstock
const DEFAULT_BIOCHAR_YIELD_DRY = 0.30;
/** Chemistry: 1 tonne of C = 44/12 tonnes of CO2. */
const CO2_PER_C = 44 / 12;

export interface CarbonBalanceInput {
  /** Wet-basis biomass processed per year (as the operator enters it). */
  capacityTnYearWet: number;
  /** Biomass moisture % on wet basis. If the lab measured it, use that;
   *  otherwise callers should pass the typical drying target. Range 0-100. */
  moisturePct?: number;
  /** Biochar organic carbon content, %. From the lab if available; otherwise
   *  we look it up in TYPICAL_C_ORG_PCT by feedstock id or use the fallback. */
  cOrgPct?: number;
  /** Biochar yield on DRY basis. Defaults to 0.30 (30%) — the peer-reviewed
   *  average for rotary/screw pyrolysis at 500-650 °C. */
  biocharYieldDry?: number;
  /** Methodology → permanence factor lookup. Overrideable per project. */
  methodology?: string;
  /** Explicit permanence factor override (0..1). Takes precedence over
   *  methodology lookup. Use when a lab-measured H:Corg drops the row into
   *  a different Puro/Isometric tier. */
  permanenceFactor?: number;
  /** Feedstock identifier used to look up typical C_org when the lab
   *  didn't provide one. Matches TYPICAL_C_ORG_PCT keys or falls back to
   *  fuzzy matching on the biomass name. */
  feedstockId?: string;
  biomassName?: string;
}

export interface CarbonBalanceResult {
  /** Inputs echoed back for transparency in downstream prompts. */
  inputs: {
    wetTnYear: number;
    moisturePct: number;
    cOrgPct: number;
    biocharYieldDry: number;
    permanenceFactor: number;
    /** Where each number came from — "input" (user/lab) or "default" (fallback). */
    provenance: {
      moisture: "input" | "default";
      cOrg: "input" | "typical" | "default";
      biocharYield: "input" | "default";
      permanence: "input" | "methodology" | "default";
    };
  };
  /** Dry biomass tonnes/year (wet × (1 - moisture/100)). */
  dryBiomassTnYear: number;
  /** Biochar tonnes/year (dry biomass × yield). */
  biocharTnYear: number;
  /** CORCs before any project-emissions netting (gross claimable). */
  corcTnYearGross: number;
  /** CORCs after applying the methodology permanence factor.
   *  Project-level LCA emissions (feedstock transport, aux electricity,
   *  drying fuel, etc.) still need to be netted downstream. */
  corcTnYearNet: number;
  /** Effective tCO2e per tonne of biochar produced for this project.
   *  This is what the AI should quote as "carbon credit factor" instead
   *  of the generic 3.0 t/t figure. */
  tCO2ePerTonneBiochar: number;
  /** Human-readable summary block the AI prompts embed verbatim. */
  groundingBlock: string;
}

/** Look up a typical C_org for the feedstock. Case-insensitive fuzzy
 *  match on both id and name so callers don't need to normalise. */
function lookupTypicalCOrg(feedstockId?: string, biomassName?: string): number | null {
  const candidates = [feedstockId, biomassName]
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .map((s) => s.toLowerCase());
  for (const key of Object.keys(TYPICAL_C_ORG_PCT)) {
    for (const candidate of candidates) {
      if (candidate.includes(key.replace(/_/g, " ")) || candidate.includes(key)) {
        return TYPICAL_C_ORG_PCT[key];
      }
    }
  }
  return null;
}

export function computeCarbonBalance(input: CarbonBalanceInput): CarbonBalanceResult {
  const wetTnYear = input.capacityTnYearWet;

  // ─── Moisture ─────────────────────────────────────────────────────────
  const moistureInput = clampPct(input.moisturePct);
  const moisturePct = moistureInput ?? DEFAULT_MOISTURE_PCT;
  const moistureProvenance: "input" | "default" = moistureInput != null ? "input" : "default";

  // ─── Biochar yield ────────────────────────────────────────────────────
  const yieldInput = input.biocharYieldDry;
  const biocharYieldDry = yieldInput != null && yieldInput > 0 && yieldInput <= 1
    ? yieldInput
    : DEFAULT_BIOCHAR_YIELD_DRY;
  const yieldProvenance: "input" | "default" = yieldInput != null ? "input" : "default";

  // ─── C_org (biochar carbon content) ───────────────────────────────────
  let cOrgPct: number;
  let cOrgProvenance: "input" | "typical" | "default";
  const cOrgInput = clampPct(input.cOrgPct);
  if (cOrgInput != null) {
    cOrgPct = cOrgInput;
    cOrgProvenance = "input";
  } else {
    const typical = lookupTypicalCOrg(input.feedstockId, input.biomassName);
    if (typical != null) {
      cOrgPct = typical;
      cOrgProvenance = "typical";
    } else {
      cOrgPct = DEFAULT_C_ORG_PCT;
      cOrgProvenance = "default";
    }
  }

  // ─── Permanence factor ────────────────────────────────────────────────
  let permanenceFactor: number;
  let permanenceProvenance: "input" | "methodology" | "default";
  if (input.permanenceFactor != null && input.permanenceFactor > 0 && input.permanenceFactor <= 1) {
    permanenceFactor = input.permanenceFactor;
    permanenceProvenance = "input";
  } else if (input.methodology && DEFAULT_PERMANENCE_BY_METHODOLOGY[input.methodology] != null) {
    permanenceFactor = DEFAULT_PERMANENCE_BY_METHODOLOGY[input.methodology];
    permanenceProvenance = "methodology";
  } else {
    permanenceFactor = DEFAULT_PERMANENCE;
    permanenceProvenance = "default";
  }

  // ─── Mass balance ─────────────────────────────────────────────────────
  const dryBiomassTnYear = wetTnYear * (1 - moisturePct / 100);
  const biocharTnYear = dryBiomassTnYear * biocharYieldDry;

  // Gross CORCs before permanence discount — this is the pure stoichiometric
  // upper bound (1 t C in biochar = 44/12 t CO2 sequestered).
  const corcTnYearGross = biocharTnYear * (cOrgPct / 100) * CO2_PER_C;
  const corcTnYearNet = corcTnYearGross * permanenceFactor;
  const tCO2ePerTonneBiochar = biocharTnYear > 0
    ? corcTnYearNet / biocharTnYear
    : 0;

  const groundingBlock = buildGroundingBlock({
    wetTnYear, moisturePct, dryBiomassTnYear, biocharYieldDry, biocharTnYear,
    cOrgPct, permanenceFactor, corcTnYearGross, corcTnYearNet,
    tCO2ePerTonneBiochar, cOrgProvenance, permanenceProvenance, moistureProvenance,
  });

  return {
    inputs: {
      wetTnYear,
      moisturePct,
      cOrgPct,
      biocharYieldDry,
      permanenceFactor,
      provenance: {
        moisture: moistureProvenance,
        cOrg: cOrgProvenance,
        biocharYield: yieldProvenance,
        permanence: permanenceProvenance,
      },
    },
    dryBiomassTnYear,
    biocharTnYear,
    corcTnYearGross,
    corcTnYearNet,
    tCO2ePerTonneBiochar,
    groundingBlock,
  };
}

function clampPct(v: number | undefined): number | null {
  if (v == null) return null;
  if (!Number.isFinite(v)) return null;
  if (v < 0 || v > 100) return null;
  return v;
}

function fmt(n: number, digits = 0): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function buildGroundingBlock(g: {
  wetTnYear: number; moisturePct: number; dryBiomassTnYear: number;
  biocharYieldDry: number; biocharTnYear: number; cOrgPct: number;
  permanenceFactor: number; corcTnYearGross: number; corcTnYearNet: number;
  tCO2ePerTonneBiochar: number;
  cOrgProvenance: string; permanenceProvenance: string; moistureProvenance: string;
}): string {
  const yieldPct = (g.biocharYieldDry * 100).toFixed(0);
  return `CARBON BALANCE (computed deterministically in code — DO NOT recalculate; use these numbers verbatim in every document):
- Wet biomass processed: ${fmt(g.wetTnYear)} tn/yr (operator input)
- Moisture content: ${g.moisturePct.toFixed(1)}% (source: ${g.moistureProvenance})
- Dry biomass: ${fmt(g.dryBiomassTnYear)} tn/yr = wet × (1 − moisture)
- Biochar yield: ${yieldPct}% of DRY biomass (NOT wet)
- Biochar output: ${fmt(g.biocharTnYear)} tn/yr = dry biomass × ${yieldPct}%
- Biochar organic carbon: ${g.cOrgPct.toFixed(1)}% (source: ${g.cOrgProvenance})
- Gross CO₂ sequestered: ${fmt(g.corcTnYearGross)} tCO₂e/yr = biochar × C_org × (44/12)
- Permanence factor: ${(g.permanenceFactor * 100).toFixed(0)}% (source: ${g.permanenceProvenance})
- Net CORCs claimable: ${fmt(g.corcTnYearNet)} tCO₂e/yr (before subtracting project LCA emissions)
- Effective factor: ${g.tCO2ePerTonneBiochar.toFixed(2)} tCO₂e per tonne biochar (NOT the generic 3.0 figure)

If any document needs to reference biochar output, CO₂ credits or the carbon factor, quote these numbers exactly. Do not multiply, round, or re-derive them.`;
}
