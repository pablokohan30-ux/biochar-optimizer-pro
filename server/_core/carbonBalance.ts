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

/**
 * Given a lab-measured H:Corg molar ratio + selected methodology, derive
 * the permanence factor. Returns undefined when the lab didn't measure
 * H:Corg so the caller falls back to the methodology default.
 *
 * Ratios come from the certifiers' published tiers:
 *   - Puro.earth / EBC / Verra VM0044: H:Corg ≤ 0.7 required, ≤ 0.4 = premium tier
 *   - Isometric: ≤ 0.4 unlocks 1000-yr durability (higher permanence),
 *                0.4-0.7 = 100-yr, > 0.7 = rejected
 *
 * We stay conservative — a bad lab reading shouldn't push permanence
 * higher than the methodology default; only *lower* it when H:Corg is
 * marginal, or raise it modestly when the lab proves premium tier.
 */
export function deriveLabPermanence(
  hCorgMolar: number | null | undefined,
  methodology: string | null | undefined,
): number | undefined {
  if (hCorgMolar == null || !Number.isFinite(hCorgMolar) || hCorgMolar <= 0) return undefined;
  // Reject values that would be certified as non-biochar
  if (hCorgMolar > 0.7) return 0.60; // steep discount — user has to know
  if (methodology === "isometric") {
    // Isometric tiers: ≤ 0.4 → 1000-yr, > 0.4 → 100-yr
    return hCorgMolar <= 0.4 ? 0.95 : 0.85;
  }
  // Puro / EBC / Verra / GS: premium (0.9) for ≤ 0.4, standard (0.85) otherwise
  return hCorgMolar <= 0.4 ? 0.90 : 0.85;
}
const DEFAULT_C_ORG_PCT = 75;    // safe fallback for unknown biomass
const DEFAULT_MOISTURE_PCT = 15; // typical dried feedstock
const DEFAULT_BIOCHAR_YIELD_DRY = 0.30;
/**
 * Typical fraction of gross sequestered CO2 that gets "eaten" by project-side
 * LCA emissions (feedstock transport + pre-processing + auxiliary electricity
 * + biochar delivery). Calibrated against the Puro.earth registry audit
 * statements we have on file:
 *
 *   Wakefield Biochar (US wood residues) →  2.81 tCO₂e/t · ~5-8% LCA share
 *   Aperam Bioenergia (BR eucalyptus)    →  1.30-1.84 t/t · ~15-25%
 *   American BioCarbon (US bagasse)      →  1.12 t/t · higher C_org loss
 *   Alcom (PH coconut/rice husk)         →  0.86 t/t · low C_org + grid-heavy
 *
 * The peer-reviewed range for cradle-to-gate biochar is 10-25%; 15% is the
 * median for a moderately-integrated project (typical wood feedstock, grid
 * of intermediate CO₂ intensity, biochar delivered within a few hundred km).
 *
 * Callers should override with a real LCA number when available:
 *   - long-haul feedstock / dirty grid → 25-30%
 *   - onsite waste-heat + short-radius delivery → 8-12%
 */
const DEFAULT_LCA_EMISSIONS_FRACTION = 0.15;
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
  /** Fraction (0..1) of gross CDR that gets consumed by project LCA
   *  emissions (transport + pre-processing + aux electricity + delivery).
   *  Default 0.20; override with a real LCA number when available. */
  lcaEmissionsFraction?: number;
}

export interface CarbonBalanceResult {
  /** Inputs echoed back for transparency in downstream prompts. */
  inputs: {
    wetTnYear: number;
    moisturePct: number;
    cOrgPct: number;
    biocharYieldDry: number;
    permanenceFactor: number;
    lcaEmissionsFraction: number;
    /** Where each number came from — "input" (user/lab) or "default" (fallback). */
    provenance: {
      moisture: "input" | "default";
      cOrg: "input" | "typical" | "default";
      biocharYield: "input" | "default";
      permanence: "input" | "methodology" | "default";
      lcaEmissions: "input" | "default";
    };
  };
  /** Dry biomass tonnes/year (wet × (1 - moisture/100)). */
  dryBiomassTnYear: number;
  /** Biochar tonnes/year (dry biomass × yield). */
  biocharTnYear: number;
  /** Tier 1 — CO2 sequestered before any discount. Chemistry-only:
   *  biochar × C_org × 44/12. Not sellable, just the physics ceiling. */
  corcTnYearGross: number;
  /** Tier 2 — after methodology permanence discount, BEFORE project-side
   *  LCA emissions are netted. Do NOT quote this as the sellable CORC —
   *  it still needs the LCA emissions subtraction. */
  corcTnYearNet: number;
  /** Tier 3 — the number the operator can actually sell: post-permanence
   *  AND net of project LCA emissions (feedstock transport, pre-processing,
   *  aux electricity, biochar delivery). This is what feeds revenue and
   *  what the Financial Summary / Executive Summary must quote. If a
   *  downstream LCA computes a precise number, prefer that; otherwise
   *  this default (20% LCA-emissions haircut) is the honest headline. */
  corcTnYearNetOfLca: number;
  /** Effective tCO2e per tonne biochar POST-permanence, PRE-LCA-emissions.
   *  Kept for backwards compatibility; new callers should use
   *  netTco2ePerTonneBiochar. */
  tCO2ePerTonneBiochar: number;
  /** Effective tCO2e per tonne biochar AFTER both permanence and LCA
   *  emissions. This is the "real" per-tonne factor for pricing and TIR. */
  netTco2ePerTonneBiochar: number;
  /** Rolled-up readiness signal for the whole balance. `submittable` means
   *  every critical input came from the operator (lab or explicit override);
   *  `estimate` means at least one input is a family typical or the
   *  helper default. The AiBuilderProject UI reads this to pick between
   *  a green "submittable" badge and an amber "estimate" one, and the
   *  Financial Summary prompt uses it to decide whether to append
   *  "(est.)" to every CDR figure. */
  readinessLevel: "submittable" | "estimate";
  /** Structured provenance rows for the "trazabilidad" table the AI
   *  emits at the top of every doc. One row per critical parameter. */
  provenanceTable: Array<{ parameter: string; value: string; source: "measured" | "catalog" | "typical" | "default" | "methodology" }>;
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

  // ─── LCA emissions fraction (project-side haircut) ────────────────────
  let lcaEmissionsFraction: number;
  let lcaEmissionsProvenance: "input" | "default";
  if (
    input.lcaEmissionsFraction != null &&
    input.lcaEmissionsFraction >= 0 &&
    input.lcaEmissionsFraction < 1
  ) {
    lcaEmissionsFraction = input.lcaEmissionsFraction;
    lcaEmissionsProvenance = "input";
  } else {
    lcaEmissionsFraction = DEFAULT_LCA_EMISSIONS_FRACTION;
    lcaEmissionsProvenance = "default";
  }

  // ─── Mass balance ─────────────────────────────────────────────────────
  const dryBiomassTnYear = wetTnYear * (1 - moisturePct / 100);
  const biocharTnYear = dryBiomassTnYear * biocharYieldDry;

  // Tier 1 — chemistry-only ceiling. Physics upper bound, not sellable.
  const corcTnYearGross = biocharTnYear * (cOrgPct / 100) * CO2_PER_C;
  // Tier 2 — after methodology permanence discount, BEFORE LCA emissions.
  // Don't quote this as sellable — that's tier 3.
  const corcTnYearNet = corcTnYearGross * permanenceFactor;
  // Tier 3 — sellable / bankable CORCs. Post-permanence AND net of
  // project-side LCA emissions. THIS is what Financial Summary uses.
  const corcTnYearNetOfLca = corcTnYearNet * (1 - lcaEmissionsFraction);

  const tCO2ePerTonneBiochar = biocharTnYear > 0
    ? corcTnYearNet / biocharTnYear
    : 0;
  const netTco2ePerTonneBiochar = biocharTnYear > 0
    ? corcTnYearNetOfLca / biocharTnYear
    : 0;

  // Readiness = every critical input measured (input) OR user override.
  // Yield stays "default" for most operators; not treating it as
  // submittable-blocking because 30% is peer-reviewed and rarely wrong
  // by more than a few points. The four blockers are moisture, C_org,
  // permanence, and LCA emissions — those are the ones a VVB actually
  // audits per project.
  const criticalMeasured = [moistureProvenance, cOrgProvenance, permanenceProvenance, lcaEmissionsProvenance]
    .every((p) => p === "input");
  const readinessLevel: "submittable" | "estimate" = criticalMeasured ? "submittable" : "estimate";

  const provenanceTable: CarbonBalanceResult["provenanceTable"] = [
    { parameter: "Biomasa procesada (wet)", value: `${fmt(wetTnYear)} tn/año`, source: "measured" },
    { parameter: "Humedad", value: `${moisturePct.toFixed(2)}%`, source: mapProvenance(moistureProvenance) },
    { parameter: "Biochar C_org", value: `${cOrgPct.toFixed(2)}%`, source: mapProvenance(cOrgProvenance) },
    { parameter: "Biochar yield (dry basis)", value: `${(biocharYieldDry * 100).toFixed(1)}%`, source: mapProvenance(yieldProvenance) },
    { parameter: "Permanence factor", value: `${(permanenceFactor * 100).toFixed(1)}%`, source: mapProvenance(permanenceProvenance) },
    { parameter: "LCA emissions haircut", value: `${(lcaEmissionsFraction * 100).toFixed(1)}%`, source: mapProvenance(lcaEmissionsProvenance) },
  ];

  const groundingBlock = buildGroundingBlock({
    wetTnYear, moisturePct, dryBiomassTnYear, biocharYieldDry, biocharTnYear,
    cOrgPct, permanenceFactor, corcTnYearGross, corcTnYearNet, corcTnYearNetOfLca,
    tCO2ePerTonneBiochar, netTco2ePerTonneBiochar, lcaEmissionsFraction,
    cOrgProvenance, permanenceProvenance, moistureProvenance, lcaEmissionsProvenance,
    readinessLevel, provenanceTable,
  });

  return {
    inputs: {
      wetTnYear,
      moisturePct,
      cOrgPct,
      biocharYieldDry,
      permanenceFactor,
      lcaEmissionsFraction,
      provenance: {
        moisture: moistureProvenance,
        cOrg: cOrgProvenance,
        biocharYield: yieldProvenance,
        permanence: permanenceProvenance,
        lcaEmissions: lcaEmissionsProvenance,
      },
    },
    dryBiomassTnYear,
    biocharTnYear,
    corcTnYearGross,
    corcTnYearNet,
    corcTnYearNetOfLca,
    tCO2ePerTonneBiochar,
    netTco2ePerTonneBiochar,
    readinessLevel,
    provenanceTable,
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

/** Maps the internal provenance token to the trazabilidad-table
 *  vocabulary — keeps the UI/prompt view stable even if we rename
 *  the internal enum later. */
function mapProvenance(p: string): "measured" | "catalog" | "typical" | "default" | "methodology" {
  switch (p) {
    case "input": return "measured";
    case "typical": return "typical";
    case "methodology": return "methodology";
    case "default": return "default";
    default: return "default";
  }
}

/** Human-readable qualifier appended to any number whose provenance is
 *  a default or a family typical, so the AI narrative doesn't present
 *  estimated values as measured facts. VVBs reject dossiers that claim
 *  CDR headline figures without a project-specific study — being loud
 *  about what's a placeholder is the whole point. */
function provenanceQualifier(provenance: string): string {
  switch (provenance) {
    case "input":
      return "measured";
    case "methodology":
      return "methodology default, no batch measurement";
    case "typical":
      return "feedstock-family typical, no lab measurement";
    case "default":
      return "ESTIMATE — no project-specific data, requires validation before VVB submission";
    default:
      return provenance;
  }
}

/** True if any headline input for a tier is not measured. Used to trigger
 *  a prominent disclaimer at the top of every doc that quotes CORCs. */
function hasAnyEstimates(g: { cOrgProvenance: string; permanenceProvenance: string; lcaEmissionsProvenance: string; moistureProvenance: string }): boolean {
  return [g.cOrgProvenance, g.permanenceProvenance, g.lcaEmissionsProvenance, g.moistureProvenance].some((p) => p !== "input");
}

/** Comma-separated list of the inputs the operator actually measured for this project. */
function listMeasured(g: { cOrgProvenance: string; permanenceProvenance: string; lcaEmissionsProvenance: string; moistureProvenance: string }): string {
  const parts: string[] = [];
  if (g.moistureProvenance === "input") parts.push("moisture");
  if (g.cOrgProvenance === "input") parts.push("biochar C_org");
  if (g.permanenceProvenance === "input") parts.push("permanence factor (from H:Corg)");
  if (g.lcaEmissionsProvenance === "input") parts.push("LCA emissions fraction");
  return parts.length ? parts.join(", ") : "biomass capacity only";
}

/** Comma-separated list of the inputs that are still using industry defaults or family typicals. */
function listEstimates(g: { cOrgProvenance: string; permanenceProvenance: string; lcaEmissionsProvenance: string; moistureProvenance: string }): string {
  const parts: string[] = [];
  if (g.moistureProvenance !== "input") parts.push(`moisture (${g.moistureProvenance})`);
  if (g.cOrgProvenance !== "input") parts.push(`biochar C_org (${g.cOrgProvenance})`);
  if (g.permanenceProvenance !== "input") parts.push(`permanence factor (${g.permanenceProvenance})`);
  if (g.lcaEmissionsProvenance !== "input") parts.push(`LCA emissions fraction (${g.lcaEmissionsProvenance})`);
  return parts.join(", ");
}

function buildGroundingBlock(g: {
  wetTnYear: number; moisturePct: number; dryBiomassTnYear: number;
  biocharYieldDry: number; biocharTnYear: number; cOrgPct: number;
  permanenceFactor: number; corcTnYearGross: number; corcTnYearNet: number;
  corcTnYearNetOfLca: number;
  tCO2ePerTonneBiochar: number; netTco2ePerTonneBiochar: number;
  lcaEmissionsFraction: number;
  cOrgProvenance: string; permanenceProvenance: string; moistureProvenance: string;
  lcaEmissionsProvenance: string;
  readinessLevel: "submittable" | "estimate";
  provenanceTable: Array<{ parameter: string; value: string; source: string }>;
}): string {
  const yieldPct = (g.biocharYieldDry * 100).toFixed(0);
  const anyEstimates = hasAnyEstimates(g);
  const disclaimerBanner = anyEstimates
    ? `\n⚠ MANDATORY DISCLAIMER — the CDR headline in this document mixes measured and estimated inputs. Every document that quotes a CORC or per-tonne factor MUST include the following disclaimer, verbatim, near the number:\n"This CDR estimate combines measured inputs (${listMeasured(g)}) with industry-typical assumptions (${listEstimates(g)}). Project-specific validation of the estimated values is required before VVB submission — the numbers below are indicative, not certifiable as reported."\n`
    : `\n✓ All inputs are project-measured (from lab report or operator study). This CDR figure is submittable subject to standard VVB verification.\n`;
  return `CARBON BALANCE (computed deterministically in code — DO NOT recalculate; use these numbers verbatim in every document):
- Wet biomass processed: ${fmt(g.wetTnYear)} tn/yr (measured)
- Moisture content: ${g.moisturePct.toFixed(1)}% (${provenanceQualifier(g.moistureProvenance)})
- Dry biomass: ${fmt(g.dryBiomassTnYear)} tn/yr = wet × (1 − moisture)
- Biochar yield: ${yieldPct}% of DRY biomass (NOT wet)
- Biochar output: ${fmt(g.biocharTnYear)} tn/yr = dry biomass × ${yieldPct}%
- Biochar organic carbon: ${g.cOrgPct.toFixed(1)}% (${provenanceQualifier(g.cOrgProvenance)})
${disclaimerBanner}
THREE TIERS of CO₂ removal — quote the right one for each context:
  1. Gross sequestered (physics ceiling): ${fmt(g.corcTnYearGross)} tCO₂e/yr = biochar × C_org × (44/12). Not sellable — theoretical.
  2. Post-permanence: ${fmt(g.corcTnYearNet)} tCO₂e/yr = gross × ${(g.permanenceFactor * 100).toFixed(0)}% permanence (${provenanceQualifier(g.permanenceProvenance)}). NOT yet net of project LCA emissions.
  3. Net-of-LCA (SELLABLE — headline number): ${fmt(g.corcTnYearNetOfLca)} tCO₂e/yr = post-permanence × (1 − ${(g.lcaEmissionsFraction * 100).toFixed(0)}% LCA emissions haircut, ${provenanceQualifier(g.lcaEmissionsProvenance)}).

Which tier to quote by document type:
- Executive Summary, Financial Summary (revenue/TIR/NPV), Masterplan headline: quote TIER 3 (${fmt(g.corcTnYearNetOfLca)} tCO₂e/yr, factor ${g.netTco2ePerTonneBiochar.toFixed(2)} tCO₂e/t biochar). This is what actually feeds credit sales.
- LCA report: reproduce the full chain gross → post-permanence → net-of-LCA. If the LCA computes a more precise project-side emissions number, USE THAT and note it may differ from the ${(g.lcaEmissionsFraction * 100).toFixed(0)}% default.
- Technical Overview: mass balance chain only; do NOT quote CORCs here — leave that to the LCA and Financial docs.
- Never quote the generic "3.0 tCO₂e per tonne biochar" figure — the correct project-specific factor is above.

Every document must be internally consistent. If Financial Summary quotes X tCO₂e/yr for revenue, the Executive Summary headline must show the same X.

INDUSTRY CONTEXT (real Puro.earth registry factors per dry tonne biochar — use as sanity check when narrating):
  Wakefield Biochar (US wood residues)  →  2.81 t/t  (high end: premium C_org + short haul + clean grid)
  Aperam Bioenergia (BR eucalyptus)      →  1.30-1.84 t/t  (mid: additionality discount + moderate haul)
  American BioCarbon (US bagasse)        →  1.12 t/t
  Alcom (PH coconut/rice husk)           →  0.86 t/t  (low: low C_org + grid-heavy)
If this project's TIER 3 factor lands outside this 0.85-2.85 window, flag the deviation in the narrative (e.g. "well above / below typical Puro registry range") — do NOT quietly round to the middle.

MANDATORY: RENDER THIS TRACEABILITY TABLE AT THE TOP OF THE EXECUTIVE SUMMARY VERBATIM
(VVBs ask for exactly this — parameter, value, and where it came from — as the very first thing they read):

| Parámetro | Valor | Origen |
|---|---|---|
${g.provenanceTable.map((row) => `| ${row.parameter} | ${row.value} | ${row.source} |`).join("\n")}
| Readiness level | ${g.readinessLevel === "submittable" ? "✓ SUBMITTABLE" : "⚠ ESTIMATE — requires validation"} | computed |

FINANCIAL / EXECUTIVE COPY RULE — since readinessLevel is "${g.readinessLevel}":
${g.readinessLevel === "submittable"
    ? '  Every CDR figure may be quoted straight ("X tCO₂e/yr"). Add a small green pill/badge "SUBMITTABLE" next to the headline KPI in the Financial Summary card so an investor sees at a glance that the number is measurement-backed.'
    : '  Every CDR figure in the Financial Summary (KPI cards, revenue tables, TIR/NPV inputs) MUST carry a visible "(est.)" or "(estimado)" suffix. Do NOT show a raw number in the KPI card — either "10,040 tCO₂e/yr (est.)" or "10,040 tCO₂e/yr · estimado, ver disclaimer arriba". A VVB will see this pass through to the investor and reject the dossier if the estimate is presented as a hard commitment.'}`;
}
