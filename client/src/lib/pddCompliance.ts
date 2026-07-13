/**
 * PDD Compliance — maps methodology requirements onto PDD Builder questions.
 *
 * Each methodology (Puro.earth, Isometric, Verra VM0044, EBC, Gold Standard)
 * has a profile listing which PDD questions must be answered for the project
 * to be "certification-ready" for that methodology.
 *
 * This module is deliberately independent from the biochar-model-based
 * `methodologies.ts` — those checks validate the *simulation output* (H:C
 * ratio, temperature, capacity). This one validates the *document package*
 * (has the user filled in the risk register, permitting, LCA emission
 * factors, etc.).
 *
 * Score: passed / total × 100. No "critical" caps in this pass; that can be
 * added later if a specific methodology says "no risk register → auto-fail".
 */
import { isQuestionFilled, PDD_TEMPLATE, countTableRows } from "./pddTemplate";
import type { PddQuestion } from "./pddTemplate";

// ============================================================================
// TYPES
// ============================================================================

export type PddCompliancePillar =
  | "biomass-sourcing"
  | "risk-management"
  | "permitting"
  | "technology-readiness"
  | "lca-mrv"
  | "quality-control"
  | "community-esg"
  | "financial";

export type PddCompliMethodology =
  | "puro-earth"
  | "isometric"
  | "verra-vm0044"
  | "ebc"
  | "gold-standard";

/** A requirement is satisfied when every referenced question is filled
 *  (and, for tables, meets the row threshold). */
export interface PddComplianceRequirement {
  id: string;
  pillar: PddCompliancePillar;
  labelEs: string;
  labelEn: string;
  /** Whether this is a hard requirement or a soft best-practice. */
  critical?: boolean;
  requires: Array<{
    sectionId: string;
    questionId: string;
    /** For "table" questions: at least this many filled rows. Default 1. */
    minRows?: number;
  }>;
}

export interface PddMethodologyProfile {
  methodology: PddCompliMethodology;
  labelEs: string;
  labelEn: string;
  color: string;
  requirements: PddComplianceRequirement[];
}

export interface PddRequirementStatus {
  requirement: PddComplianceRequirement;
  pass: boolean;
  /** Which of the referenced questions are still missing/underfilled. */
  missing: Array<{ sectionId: string; questionId: string; reason: string }>;
}

export interface PddComplianceReport {
  methodology: PddCompliMethodology;
  labelEs: string;
  labelEn: string;
  passed: number;
  total: number;
  score: number; // 0-100
  requirements: PddRequirementStatus[];
}

// ============================================================================
// PROFILES — one per methodology
// ============================================================================

export const PDD_COMPLIANCE_PROFILES: PddMethodologyProfile[] = [
  // ── Puro.earth CORCs ────────────────────────────────────────────────────
  {
    methodology: "puro-earth",
    labelEs: "Puro.earth",
    labelEn: "Puro.earth",
    color: "emerald",
    requirements: [
      {
        id: "puro-biomass-cert",
        pillar: "biomass-sourcing",
        labelEs: "Biomasa con certificación FSC/PEFC documentada",
        labelEn: "Biomass with documented FSC/PEFC certification",
        critical: true,
        requires: [{ sectionId: "feedstock", questionId: "certifications", minRows: 1 }],
      },
      {
        id: "puro-counterfactual",
        pillar: "biomass-sourcing",
        labelEs: "Uso contrafactual de la biomasa descrito",
        labelEn: "Counterfactual biomass use described",
        critical: true,
        requires: [{ sectionId: "feedstock", questionId: "counterfactualUse" }],
      },
      {
        id: "puro-risk-register",
        pillar: "risk-management",
        labelEs: "Registro de riesgos con al menos 8 tipos cubiertos",
        labelEn: "Risk register covering at least 8 risk types",
        requires: [{ sectionId: "qualities", questionId: "riskRegister", minRows: 8 }],
      },
      {
        id: "puro-permitting",
        pillar: "permitting",
        labelEs: "Matriz de permisos con al menos 3 permisos",
        labelEn: "Permitting matrix with at least 3 permits",
        requires: [{ sectionId: "qualities", questionId: "permittingStatus", minRows: 3 }],
      },
      {
        id: "puro-pyrolysis",
        pillar: "technology-readiness",
        labelEs: "Al menos una unidad de pirólisis identificada",
        labelEn: "At least one pyrolysis unit identified",
        critical: true,
        requires: [{ sectionId: "equipment", questionId: "pyrolysisUnits", minRows: 1 }],
      },
      {
        id: "puro-lca-factors",
        pillar: "lca-mrv",
        labelEs: "Factores de emisión declarados (mínimo 3)",
        labelEn: "Emission factors declared (min 3)",
        requires: [{ sectionId: "lca", questionId: "emissionFactors", minRows: 3 }],
      },
      {
        id: "puro-additionality",
        pillar: "financial",
        labelEs: "Adicionalidad financiera argumentada",
        labelEn: "Financial additionality argued",
        critical: true,
        requires: [{ sectionId: "financial", questionId: "additionality" }],
      },
      {
        id: "puro-stakeholder",
        pillar: "community-esg",
        labelEs: "Mapeo de stakeholders + engagement",
        labelEn: "Stakeholder mapping + engagement",
        requires: [
          { sectionId: "community", questionId: "stakeholderMapping" },
          { sectionId: "community", questionId: "communityEngagement" },
        ],
      },
    ],
  },

  // ── Isometric ──────────────────────────────────────────────────────────
  {
    methodology: "isometric",
    labelEs: "Isometric",
    labelEn: "Isometric",
    color: "purple",
    requirements: [
      {
        id: "iso-biomass-feedstock",
        pillar: "biomass-sourcing",
        labelEs: "Estrategia de biomasa + KPIs definidos",
        labelEn: "Biomass strategy + KPIs defined",
        critical: true,
        requires: [
          { sectionId: "feedstock", questionId: "sourcingStrategy" },
          { sectionId: "feedstock", questionId: "kpis" },
        ],
      },
      {
        id: "iso-pyrolyzer",
        pillar: "technology-readiness",
        labelEs: "Pirolizador declarado (bono si es pre-aprobado)",
        labelEn: "Pyrolyzer declared (bonus if pre-approved)",
        critical: true,
        requires: [{ sectionId: "equipment", questionId: "pyrolysisUnits", minRows: 1 }],
      },
      {
        id: "iso-quality-parameters",
        pillar: "quality-control",
        labelEs: "Parámetros de QC con targets y frecuencia",
        labelEn: "QC parameters with targets and frequency",
        critical: true,
        requires: [{ sectionId: "electrical", questionId: "qualityParameters", minRows: 4 }],
      },
      {
        id: "iso-lca-mrv",
        pillar: "lca-mrv",
        labelEs: "Plan MMRV declarado",
        labelEn: "MMRV plan declared",
        critical: true,
        requires: [{ sectionId: "lca", questionId: "mmrvPlan" }],
      },
      {
        id: "iso-lab-analysis",
        pillar: "quality-control",
        labelEs: "Protocolo de laboratorio con al menos 3 análisis",
        labelEn: "Lab analysis protocol with at least 3 analyses",
        requires: [{ sectionId: "electrical", questionId: "labAnalysis", minRows: 3 }],
      },
      {
        id: "iso-mass-energy",
        pillar: "technology-readiness",
        labelEs: "Balance de masa y energía",
        labelEn: "Mass & energy balance",
        requires: [{ sectionId: "technology", questionId: "massEnergyBalance" }],
      },
    ],
  },

  // ── Verra VM0044 ────────────────────────────────────────────────────────
  {
    methodology: "verra-vm0044",
    labelEs: "Verra VM0044",
    labelEn: "Verra VM0044",
    color: "orange",
    requirements: [
      {
        id: "verra-biomass",
        pillar: "biomass-sourcing",
        labelEs: "Certificaciones + uso contrafactual",
        labelEn: "Certifications + counterfactual",
        critical: true,
        requires: [
          { sectionId: "feedstock", questionId: "certifications", minRows: 1 },
          { sectionId: "feedstock", questionId: "counterfactualUse" },
        ],
      },
      {
        id: "verra-risk",
        pillar: "risk-management",
        labelEs: "Registro de riesgos exhaustivo (10+ tipos)",
        labelEn: "Exhaustive risk register (10+ types)",
        requires: [{ sectionId: "qualities", questionId: "riskRegister", minRows: 10 }],
      },
      {
        id: "verra-permitting",
        pillar: "permitting",
        labelEs: "Matriz de permitting (5+)",
        labelEn: "Permitting matrix (5+)",
        requires: [{ sectionId: "qualities", questionId: "permittingStatus", minRows: 5 }],
      },
      {
        id: "verra-tech-integration",
        pillar: "technology-readiness",
        labelEs: "Especificaciones de pirólisis + operational history",
        labelEn: "Pyrolysis specs + operational history",
        critical: true,
        requires: [
          { sectionId: "technology", questionId: "pyrolysisSpecs" },
          { sectionId: "technology", questionId: "operationalHistory" },
        ],
      },
      {
        id: "verra-lca",
        pillar: "lca-mrv",
        labelEs: "LCA con boundary + factores + revisión independiente",
        labelEn: "LCA with boundary + factors + independent review",
        critical: true,
        requires: [
          { sectionId: "lca", questionId: "systemBoundary" },
          { sectionId: "lca", questionId: "emissionFactors", minRows: 3 },
          { sectionId: "lca", questionId: "independentReview" },
        ],
      },
      {
        id: "verra-community",
        pillar: "community-esg",
        labelEs: "Comunidad: engagement + harms & benefits",
        labelEn: "Community: engagement + harms & benefits",
        requires: [
          { sectionId: "community", questionId: "communityEngagement" },
          { sectionId: "community", questionId: "harmsBenefits" },
        ],
      },
    ],
  },

  // ── EBC ─────────────────────────────────────────────────────────────────
  {
    methodology: "ebc",
    labelEs: "EBC",
    labelEn: "EBC",
    color: "yellow",
    requirements: [
      {
        id: "ebc-pyrolysis-specs",
        pillar: "technology-readiness",
        labelEs: "Specs de pirólisis (>500°C, ≥3 min residencia)",
        labelEn: "Pyrolysis specs (>500°C, ≥3 min residence)",
        critical: true,
        requires: [
          { sectionId: "technology", questionId: "pyrolysisSpecs" },
          { sectionId: "equipment", questionId: "pyrolysisUnits", minRows: 1 },
        ],
      },
      {
        id: "ebc-quality-params",
        pillar: "quality-control",
        labelEs: "QC parameters con targets (C, H:C, ceniza)",
        labelEn: "QC parameters with targets (C, H:C, ash)",
        critical: true,
        requires: [{ sectionId: "electrical", questionId: "qualityParameters", minRows: 4 }],
      },
      {
        id: "ebc-lab-analysis",
        pillar: "quality-control",
        labelEs: "Lab analysis con provider acreditado",
        labelEn: "Lab analysis with accredited provider",
        requires: [{ sectionId: "electrical", questionId: "labAnalysis", minRows: 2 }],
      },
      {
        id: "ebc-biomass",
        pillar: "biomass-sourcing",
        labelEs: "Biomasa con trazabilidad (FSC/PEFC)",
        labelEn: "Biomass with traceability (FSC/PEFC)",
        critical: true,
        requires: [{ sectionId: "feedstock", questionId: "certifications", minRows: 1 }],
      },
      {
        id: "ebc-purity",
        pillar: "quality-control",
        labelEs: "Composición y pureza del biochar",
        labelEn: "Biochar purity & composition",
        requires: [{ sectionId: "biochar", questionId: "purityComposition" }],
      },
    ],
  },

  // ── Gold Standard PARC (consultation) ───────────────────────────────────
  {
    methodology: "gold-standard",
    labelEs: "Gold Standard PARC",
    labelEn: "Gold Standard PARC",
    color: "amber",
    requirements: [
      {
        id: "gs-community",
        pillar: "community-esg",
        labelEs: "Stakeholder mapping + harms & benefits",
        labelEn: "Stakeholder mapping + harms & benefits",
        critical: true,
        requires: [
          { sectionId: "community", questionId: "stakeholderMapping" },
          { sectionId: "community", questionId: "harmsBenefits" },
        ],
      },
      {
        id: "gs-biomass",
        pillar: "biomass-sourcing",
        labelEs: "Biomasa + contrafactual",
        labelEn: "Biomass + counterfactual",
        critical: true,
        requires: [
          { sectionId: "feedstock", questionId: "certifications", minRows: 1 },
          { sectionId: "feedstock", questionId: "counterfactualUse" },
        ],
      },
      {
        id: "gs-lca",
        pillar: "lca-mrv",
        labelEs: "LCA con emission factors y revisión",
        labelEn: "LCA with emission factors and review",
        requires: [
          { sectionId: "lca", questionId: "emissionFactors", minRows: 3 },
          { sectionId: "lca", questionId: "independentReview" },
        ],
      },
      {
        id: "gs-tech",
        pillar: "technology-readiness",
        labelEs: "Pirolizador + operational history",
        labelEn: "Pyrolyzer + operational history",
        requires: [
          { sectionId: "equipment", questionId: "pyrolysisUnits", minRows: 1 },
          { sectionId: "technology", questionId: "operationalHistory" },
        ],
      },
    ],
  },
];

// ============================================================================
// EVALUATION
// ============================================================================

/** Find a question definition by section+question id. Cheap lookup at eval
 *  time — the template is only ~65 questions total. */
function findQuestion(sectionId: string, questionId: string): PddQuestion | null {
  for (const s of PDD_TEMPLATE) {
    if (s.id !== sectionId) continue;
    for (const q of s.questions) if (q.id === questionId) return q;
  }
  return null;
}

/** True when the response fulfills the requirement for one referenced question. */
function isQuestionSatisfied(
  responses: Record<string, string>,
  ref: { sectionId: string; questionId: string; minRows?: number },
): { pass: boolean; reason: string } {
  const question = findQuestion(ref.sectionId, ref.questionId);
  if (!question) return { pass: false, reason: "unknown-question" };
  const raw = responses[ref.questionId] ?? "";
  if (question.type === "table") {
    const need = ref.minRows ?? 1;
    const rows = countTableRows(raw);
    if (rows >= need) return { pass: true, reason: `${rows}/${need} rows` };
    return { pass: false, reason: `${rows}/${need} rows` };
  }
  return { pass: isQuestionFilled(question, raw), reason: raw.trim().length > 0 ? "filled" : "empty" };
}

export function evaluatePddCompliance(
  responses: Record<string, string>,
  profile: PddMethodologyProfile,
): PddComplianceReport {
  const statuses: PddRequirementStatus[] = profile.requirements.map((req) => {
    const results = req.requires.map((ref) => ({
      ref,
      ...isQuestionSatisfied(responses, ref),
    }));
    const missing = results
      .filter((r) => !r.pass)
      .map((r) => ({
        sectionId: r.ref.sectionId,
        questionId: r.ref.questionId,
        reason: r.reason,
      }));
    return { requirement: req, pass: missing.length === 0, missing };
  });
  const passed = statuses.filter((s) => s.pass).length;
  const total = statuses.length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;
  return {
    methodology: profile.methodology,
    labelEs: profile.labelEs,
    labelEn: profile.labelEn,
    passed,
    total,
    score,
    requirements: statuses,
  };
}

/** Batch evaluate every active methodology profile. */
export function evaluateAllProfiles(
  responses: Record<string, string>,
): PddComplianceReport[] {
  return PDD_COMPLIANCE_PROFILES.map((p) => evaluatePddCompliance(responses, p));
}
