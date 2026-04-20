/**
 * PDD Template — Project Design Document Builder
 *
 * Complete biochar project package with 11 workstreams covering everything
 * needed to develop, permit, and certify a biochar carbon removal project.
 *
 * Structured from real-world due diligence frameworks and operational
 * project data. Sections A–I cover due diligence; J–K cover engineering.
 *
 * Every label and hint uses i18n keys so the UI can render in any locale.
 * Key pattern: pdd.sections.{sectionId}.questions.{questionId}.label / .hint
 */

// ============================================================================
// TYPES
// ============================================================================

export type PddQuestionType = "text" | "textarea" | "select" | "boolean";

export interface PddQuestion {
  id: string;
  labelKey: string;
  hintKey: string;
  type: PddQuestionType;
  required: boolean;
  options?: string[];
}

export interface PddSection {
  id: string;
  titleKey: string;
  questions: PddQuestion[];
}

// ============================================================================
// HELPER — build i18n keys for a section + question pair
// ============================================================================

function q(
  sectionId: string,
  questionId: string,
  type: PddQuestionType = "textarea",
  required = true,
  options?: string[],
): PddQuestion {
  return {
    id: questionId,
    labelKey: `sections.${sectionId}.questions.${questionId}.label`,
    hintKey: `sections.${sectionId}.questions.${questionId}.hint`,
    type,
    required,
    ...(options ? { options } : {}),
  };
}

// ============================================================================
// PDD TEMPLATE — 11 Workstreams (A–K)
// ============================================================================

export const PDD_TEMPLATE: PddSection[] = [
  // ── A: Parties Involved ──────────────────────────────────────────────
  {
    id: "parties",
    titleKey: "sections.parties.title",
    questions: [
      q("parties", "projectDeveloper"),
      q("parties", "commercialPartners"),
      q("parties", "technicalPartners"),
    ],
  },

  // ── B: Project Qualities ─────────────────────────────────────────────
  {
    id: "qualities",
    titleKey: "sections.qualities.title",
    questions: [
      q("qualities", "facilityLocation"),
      q("qualities", "landUse"),
      q("qualities", "permittingStatus"),
      q("qualities", "commercial"),
    ],
  },

  // ── C: Implementation Plan ───────────────────────────────────────────
  {
    id: "implementation",
    titleKey: "sections.implementation.title",
    questions: [
      q("implementation", "timeline"),
      q("implementation", "executionPlan"),
      q("implementation", "procurementStrategy"),
      q("implementation", "omArrangements"),
    ],
  },

  // ── D: Biomass Feedstock ─────────────────────────────────────────────
  {
    id: "feedstock",
    titleKey: "sections.feedstock.title",
    questions: [
      q("feedstock", "sourcingStrategy"),
      q("feedstock", "supplyDemand"),
      q("feedstock", "kpis"),
      q("feedstock", "tonnageRequired"),
      q("feedstock", "certifications"),
    ],
  },

  // ── E: Biochar Product ──────────────────────────────────────────────
  {
    id: "biochar",
    titleKey: "sections.biochar.title",
    questions: [
      q("biochar", "endUse"),
      q("biochar", "customers"),
      q("biochar", "purityComposition"),
      q("biochar", "transportation"),
    ],
  },

  // ── F: Financial Analysis ───────────────────────────────────────────
  {
    id: "financial",
    titleKey: "sections.financial.title",
    questions: [
      q("financial", "revenueStack"),
      q("financial", "carbonCredits"),
      q("financial", "capex"),
      q("financial", "opex"),
      q("financial", "financing"),
    ],
  },

  // ── G: Technology & Process ─────────────────────────────────────────
  {
    id: "technology",
    titleKey: "sections.technology.title",
    questions: [
      q("technology", "facilityDesign"),
      q("technology", "pyrolysisSpecs"),
      q("technology", "operationalHistory"),
      q("technology", "energyRequirements"),
    ],
  },

  // ── H: LCA & Certification ─────────────────────────────────────────
  {
    id: "lca",
    titleKey: "sections.lca.title",
    questions: [
      q("lca", "lcaMethodology"),
      q("lca", "systemBoundary"),
      q("lca", "mmrvPlan"),
      q("lca", "certificationPartner"),
    ],
  },

  // ── I: Community & Environment ──────────────────────────────────────
  {
    id: "community",
    titleKey: "sections.community.title",
    questions: [
      q("community", "environmentalImpact"),
      q("community", "communityEngagement"),
      q("community", "harmsBenefits"),
    ],
  },

  // ── J: Equipment & Plant Layout ─────────────────────────────────────
  {
    id: "equipment",
    titleKey: "sections.equipment.title",
    questions: [
      q("equipment", "preProcessing"),
      q("equipment", "pyrolysisUnits"),
      q("equipment", "postProcessing"),
      q("equipment", "ancillaryEquipment"),
      q("equipment", "plantLayout"),
      q("equipment", "supplierWarranty"),
    ],
  },

  // ── K: Electrical & Quality Control ─────────────────────────────────
  {
    id: "electrical",
    titleKey: "sections.electrical.title",
    questions: [
      q("electrical", "powerDistribution"),
      q("electrical", "motorControlCenters"),
      q("electrical", "emergencyPower"),
      q("electrical", "qualityParameters"),
      q("electrical", "labAnalysis"),
      q("electrical", "certificationStandards"),
    ],
  },
];
