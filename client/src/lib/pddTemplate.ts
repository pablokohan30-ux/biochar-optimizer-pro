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
 *
 * Question `type` can be:
 *   - "text" / "textarea" / "select" / "boolean" — single value serialized as string
 *   - "table" — repeatable rows; value is a JSON-stringified array of column objects
 *
 * Table columns are declared per question. This lets a workstream ask for a
 * Risk Register, Permitting Status, Equipment BOM, etc. in the structured
 * form that real Microsoft-grade DD packages use, rather than a single
 * free-text textarea that the user has to structure on their own.
 */

// ============================================================================
// TYPES
// ============================================================================

export type PddQuestionType = "text" | "textarea" | "select" | "boolean" | "table";

export type PddTableColumnType = "text" | "textarea" | "number" | "select";

export interface PddTableColumn {
  id: string;
  labelKey: string;
  type: PddTableColumnType;
  options?: string[];
  required?: boolean;
  /** Display width hint: sm ≈ 100px, md ≈ 160px, lg ≈ 260px, xl ≈ 360px */
  width?: "sm" | "md" | "lg" | "xl";
  placeholderKey?: string;
}

export interface PddQuestion {
  id: string;
  labelKey: string;
  hintKey: string;
  type: PddQuestionType;
  required: boolean;
  options?: string[];
  /** For type="table": column definitions */
  columns?: PddTableColumn[];
  /** Minimum meaningful rows for a "table" question to count as filled */
  minRows?: number;
  /** Optional reference template id; renders a "Load reference template" panel
   *  next to the guidance hint. See PDD_REFERENCE_TEMPLATES. */
  referenceKey?: string;
}

export interface PddSection {
  id: string;
  titleKey: string;
  questions: PddQuestion[];
}

/** Row payload for table questions. Keys match column ids. */
export type PddTableRow = Record<string, string>;

// ============================================================================
// HELPER — build i18n keys for a section + question pair
// ============================================================================

function q(
  sectionId: string,
  questionId: string,
  type: PddQuestionType = "textarea",
  required = true,
  extras?: Partial<Omit<PddQuestion, "id" | "labelKey" | "hintKey" | "type" | "required">>,
): PddQuestion {
  return {
    id: questionId,
    labelKey: `sections.${sectionId}.questions.${questionId}.label`,
    hintKey: `sections.${sectionId}.questions.${questionId}.hint`,
    type,
    required,
    ...extras,
  };
}

/** Shortcut for column definitions — labels live under
 *  `pdd.sections.<section>.questions.<question>.columns.<colId>`. */
function col(
  sectionId: string,
  questionId: string,
  colId: string,
  type: PddTableColumnType = "text",
  extras?: Omit<PddTableColumn, "id" | "labelKey" | "type">,
): PddTableColumn {
  return {
    id: colId,
    labelKey: `sections.${sectionId}.questions.${questionId}.columns.${colId}`,
    type,
    ...extras,
  };
}

// ============================================================================
// TABLE HELPERS — parse / stringify / detect-filled
// ============================================================================

/** Parse a stored table value, gracefully falling back to empty when the
 *  string is a legacy free-text response or corrupted JSON. */
export function parseTableRows(raw: string): PddTableRow[] {
  if (!raw || raw.trim().length === 0) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((r) => r && typeof r === "object" && !Array.isArray(r))
        .map((r) => {
          const clean: PddTableRow = {};
          for (const [k, v] of Object.entries(r)) {
            clean[k] = v == null ? "" : String(v);
          }
          return clean;
        });
    }
  } catch {
    // legacy plain text — signal via empty array; callers can also inspect raw
  }
  return [];
}

/** True if a row has at least one non-empty cell. */
export function isTableRowFilled(row: PddTableRow): boolean {
  return Object.values(row).some((v) => v.trim().length > 0);
}

/** Count filled rows in a serialized table value. */
export function countTableRows(raw: string): number {
  return parseTableRows(raw).filter(isTableRowFilled).length;
}

/** True when the stored value looks like a legacy free-text response
 *  (non-empty, not JSON-parseable to a rows array). */
export function hasLegacyTextValue(raw: string): boolean {
  if (!raw || raw.trim().length === 0) return false;
  try {
    const parsed = JSON.parse(raw);
    return !Array.isArray(parsed);
  } catch {
    return true;
  }
}

/** True when a question's stored value should be treated as "answered". */
export function isQuestionFilled(question: PddQuestion, raw: string): boolean {
  const value = (raw ?? "").trim();
  if (value.length === 0) return false;
  if (question.type !== "table") return true;
  // For tables: allow either at least one filled row OR a legacy text carry-over
  // so we do not regress the completion percentage for existing users.
  return countTableRows(raw) >= (question.minRows ?? 1) || hasLegacyTextValue(raw);
}

// ============================================================================
// FALLBACK LABELS — used when i18n does not define a key.
//
// The regular translation lookup happens first (t(key, { defaultValue })).
// If someone later adds a proper i18n entry it takes precedence.
// This keeps the giant i18n/index.ts file free of ~200 boilerplate keys
// for every column and select option in the template while still shipping
// human-readable labels today.
// ============================================================================

type Lang = "en" | "es";
type FallbackLabel = Record<Lang, string>;

const COLUMN_LABELS: Record<string, FallbackLabel> = {
  role: { en: "Role", es: "Rol" },
  entity: { en: "Entity", es: "Entidad" },
  status: { en: "Status", es: "Estado" },
  notes: { en: "Notes", es: "Notas" },
  permit: { en: "Permit", es: "Permiso" },
  authority: { en: "Issuing Authority", es: "Autoridad emisora" },
  expectedDate: { en: "Expected Date", es: "Fecha estimada" },
  type: { en: "Type", es: "Tipo" },
  description: { en: "Description", es: "Descripción" },
  mitigation: { en: "Mitigation", es: "Mitigación" },
  level: { en: "Level", es: "Nivel" },
  supportingDoc: { en: "Supporting Doc", es: "Documento de respaldo" },
  standard: { en: "Standard", es: "Estándar" },
  certificateNumber: { en: "Certificate #", es: "N° certificado" },
  scope: { en: "Scope", es: "Alcance" },
  validUntil: { en: "Valid Until", es: "Válido hasta" },
  verifier: { en: "Verifier", es: "Verificador" },
  item: { en: "Item", es: "Ítem" },
  phase: { en: "Phase", es: "Fase" },
  costUsd: { en: "Cost (USD)", es: "Costo (USD)" },
  annualUsd: { en: "Annual (USD)", es: "Anual (USD)" },
  assumptions: { en: "Assumptions", es: "Supuestos" },
  source: { en: "Source", es: "Fuente" },
  value: { en: "Value", es: "Valor" },
  unit: { en: "Unit", es: "Unidad" },
  reference: { en: "Reference", es: "Referencia" },
  makeModel: { en: "Make & Model", es: "Marca y modelo" },
  capacity: { en: "Capacity", es: "Capacidad" },
  powerKw: { en: "Power (kW)", es: "Potencia (kW)" },
  unitId: { en: "Unit ID", es: "ID de unidad" },
  capacityKgh: { en: "Capacity (kg/h)", es: "Capacidad (kg/h)" },
  tempC: { en: "Temp (°C)", es: "Temp. (°C)" },
  residenceMin: { en: "Residence (min)", es: "Tiempo de residencia (min)" },
  throughput: { en: "Throughput", es: "Caudal" },
  function: { en: "Function", es: "Función" },
  supplier: { en: "Supplier", es: "Proveedor" },
  equipment: { en: "Equipment", es: "Equipo" },
  warrantyYears: { en: "Warranty (yrs)", es: "Garantía (años)" },
  equipmentId: { en: "Equipment ID", es: "ID equipo" },
  voltage: { en: "Voltage", es: "Voltaje" },
  ratingKw: { en: "Rating (kW)", es: "Potencia (kW)" },
  cableSize: { en: "Cable Size", es: "Sección de cable" },
  breaker: { en: "Breaker", es: "Interruptor" },
  mccId: { en: "MCC ID", es: "ID CCM" },
  feeders: { en: "Feeders", es: "Alimentadores" },
  capacityKva: { en: "Capacity (kVA)", es: "Capacidad (kVA)" },
  autonomyH: { en: "Autonomy (h)", es: "Autonomía (h)" },
  criticalLoads: { en: "Critical Loads", es: "Cargas críticas" },
  parameter: { en: "Parameter", es: "Parámetro" },
  target: { en: "Target", es: "Objetivo" },
  testMethod: { en: "Test Method", es: "Método de ensayo" },
  frequency: { en: "Frequency", es: "Frecuencia" },
  analysis: { en: "Analysis", es: "Análisis" },
  labProvider: { en: "Lab Provider", es: "Laboratorio" },
  applicability: { en: "Applicability", es: "Aplicabilidad" },
  nextVerification: { en: "Next Verification", es: "Próxima verificación" },
};

const OPTION_LABELS: Record<string, FallbackLabel> = {
  // Commercial partners
  "feedstock-supplier": { en: "Feedstock supplier", es: "Proveedor de biomasa" },
  "biochar-offtaker": { en: "Biochar offtaker", es: "Comprador de biochar" },
  "credit-buyer": { en: "Credit buyer", es: "Comprador de créditos" },
  epc: { en: "EPC", es: "EPC" },
  financier: { en: "Financier", es: "Financista" },
  other: { en: "Other", es: "Otro" },
  // Partner status
  exploring: { en: "Exploring", es: "Explorando" },
  loi: { en: "LOI signed", es: "LOI firmada" },
  signed: { en: "Signed", es: "Firmado" },
  "under-negotiation": { en: "Under negotiation", es: "En negociación" },
  // Permit status
  "not-started": { en: "Not started", es: "Sin iniciar" },
  "in-progress": { en: "In progress", es: "En curso" },
  submitted: { en: "Submitted", es: "Presentado" },
  approved: { en: "Approved", es: "Aprobado" },
  rejected: { en: "Rejected", es: "Rechazado" },
  // Risk types
  financial: { en: "Financial", es: "Financiero" },
  management: { en: "Management", es: "Gestión" },
  social: { en: "Social", es: "Social" },
  political: { en: "Political", es: "Político" },
  regulatory: { en: "Regulatory", es: "Regulatorio" },
  natural: { en: "Natural", es: "Natural" },
  reversal: { en: "Reversal", es: "Reversión" },
  quantitative: { en: "Quantitative", es: "Cuantitativo" },
  commercial: { en: "Commercial", es: "Comercial" },
  "site-control": { en: "Site control", es: "Control del sitio" },
  technology: { en: "Technology", es: "Tecnología" },
  // Risk levels
  low: { en: "Low", es: "Bajo" },
  medium: { en: "Medium", es: "Medio" },
  high: { en: "High", es: "Alto" },
  // Feedstock certs
  FSC: { en: "FSC", es: "FSC" },
  PEFC: { en: "PEFC", es: "PEFC" },
  SBP: { en: "SBP", es: "SBP" },
  ISCC: { en: "ISCC", es: "ISCC" },
  REDcert: { en: "REDcert", es: "REDcert" },
  // CAPEX phase
  "phase-1": { en: "Phase 1", es: "Fase 1" },
  "phase-2": { en: "Phase 2", es: "Fase 2" },
  both: { en: "Both", es: "Ambas" },
  // Pyrolysis status
  quoted: { en: "Quoted", es: "Cotizado" },
  ordered: { en: "Ordered", es: "Ordenado" },
  delivered: { en: "Delivered", es: "Entregado" },
  installed: { en: "Installed", es: "Instalado" },
  commissioned: { en: "Commissioned", es: "En operación" },
  // Emergency power source
  "diesel-generator": { en: "Diesel generator", es: "Grupo electrógeno diésel" },
  ups: { en: "UPS", es: "UPS" },
  battery: { en: "Battery", es: "Banco de baterías" },
  "grid-backup": { en: "Grid backup", es: "Respaldo de red" },
  // Certification standards
  "puro-earth": { en: "Puro.earth", es: "Puro.earth" },
  isometric: { en: "Isometric", es: "Isometric" },
  "verra-vm0044": { en: "Verra VM0044", es: "Verra VM0044" },
  ebc: { en: "EBC", es: "EBC" },
  "gold-standard": { en: "Gold Standard", es: "Gold Standard" },
  iso: { en: "ISO", es: "ISO" },
  // Cert status
  endorsed: { en: "Endorsed", es: "Endosado" },
  certified: { en: "Certified", es: "Certificado" },
};

function pickLang(lang: string | undefined): Lang {
  return lang && lang.startsWith("es") ? "es" : "en";
}

/** Human-readable column label — used as `defaultValue` when i18n has no entry. */
export function columnLabelFallback(columnId: string, lang: string | undefined): string {
  const entry = COLUMN_LABELS[columnId];
  if (!entry) return columnId;
  return entry[pickLang(lang)];
}

/** Human-readable label for a select option value. */
export function optionLabelFallback(optionValue: string, lang: string | undefined): string {
  const entry = OPTION_LABELS[optionValue];
  if (!entry) return optionValue;
  return entry[pickLang(lang)];
}

/** Convert a table value to a Markdown table for export. */
export function tableToMarkdown(
  raw: string,
  columns: PddTableColumn[],
  headers: string[],
): string {
  const rows = parseTableRows(raw).filter(isTableRowFilled);
  if (rows.length === 0) return "";
  const escape = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const head = `| ${headers.map(escape).join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((r) => `| ${columns.map((c) => escape(r[c.id] ?? "")).join(" | ")} |`)
    .join("\n");
  return [head, sep, body].join("\n");
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
      q("parties", "commercialPartners", "table", true, {
        columns: [
          col("parties", "commercialPartners", "role", "select", {
            options: ["feedstock-supplier", "biochar-offtaker", "credit-buyer", "epc", "financier", "other"],
            width: "md",
          }),
          col("parties", "commercialPartners", "entity", "text", { width: "lg" }),
          col("parties", "commercialPartners", "status", "select", {
            options: ["exploring", "loi", "signed", "under-negotiation"],
            width: "md",
          }),
          col("parties", "commercialPartners", "notes", "textarea", { width: "xl" }),
        ],
      }),
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
      q("qualities", "gridConnection"),
      q("qualities", "permittingStatus", "table", true, {
        referenceKey: "permitting-biochar-facility",
        columns: [
          col("qualities", "permittingStatus", "permit", "text", { width: "lg" }),
          col("qualities", "permittingStatus", "authority", "text", { width: "md" }),
          col("qualities", "permittingStatus", "status", "select", {
            options: ["not-started", "in-progress", "submitted", "approved", "rejected"],
            width: "md",
          }),
          col("qualities", "permittingStatus", "expectedDate", "text", { width: "sm" }),
          col("qualities", "permittingStatus", "notes", "textarea", { width: "lg" }),
        ],
      }),
      q("qualities", "eiaAssessment"),
      q("qualities", "commercial"),
      q("qualities", "riskRegister", "table", true, {
        referenceKey: "risk-register-microsoft",
        columns: [
          col("qualities", "riskRegister", "type", "select", {
            options: [
              "financial",
              "management",
              "social",
              "political",
              "regulatory",
              "natural",
              "reversal",
              "quantitative",
              "commercial",
              "site-control",
              "technology",
              "other",
            ],
            width: "md",
          }),
          col("qualities", "riskRegister", "description", "textarea", { width: "lg" }),
          col("qualities", "riskRegister", "mitigation", "textarea", { width: "lg" }),
          col("qualities", "riskRegister", "level", "select", {
            options: ["low", "medium", "high"],
            width: "sm",
          }),
          col("qualities", "riskRegister", "supportingDoc", "text", { width: "md" }),
        ],
      }),
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
      q("feedstock", "certifications", "table", true, {
        referenceKey: "feedstock-certifications",
        columns: [
          col("feedstock", "certifications", "standard", "select", {
            options: ["FSC", "PEFC", "SBP", "ISCC", "REDcert", "other"],
            width: "sm",
          }),
          col("feedstock", "certifications", "certificateNumber", "text", { width: "md" }),
          col("feedstock", "certifications", "scope", "text", { width: "lg" }),
          col("feedstock", "certifications", "validUntil", "text", { width: "sm" }),
          col("feedstock", "certifications", "verifier", "text", { width: "md" }),
        ],
      }),
      q("feedstock", "counterfactualUse"),
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
      q("financial", "capex", "table", true, {
        columns: [
          col("financial", "capex", "item", "text", { width: "lg" }),
          col("financial", "capex", "phase", "select", {
            options: ["phase-1", "phase-2", "both"],
            width: "sm",
          }),
          col("financial", "capex", "costUsd", "text", { width: "md" }),
          col("financial", "capex", "notes", "textarea", { width: "xl" }),
        ],
      }),
      q("financial", "opex", "table", true, {
        columns: [
          col("financial", "opex", "item", "text", { width: "lg" }),
          col("financial", "opex", "annualUsd", "text", { width: "md" }),
          col("financial", "opex", "assumptions", "textarea", { width: "xl" }),
        ],
      }),
      q("financial", "financing"),
      q("financial", "additionality"),
      q("financial", "unsubsidizedCost"),
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
      q("technology", "massEnergyBalance"),
      q("technology", "seasonalVariations"),
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
      q("lca", "sensitivityAnalysis"),
      q("lca", "independentReview"),
      q("lca", "emissionFactors", "table", true, {
        referenceKey: "emission-factors-baseline",
        columns: [
          col("lca", "emissionFactors", "source", "text", { width: "lg" }),
          col("lca", "emissionFactors", "value", "text", { width: "sm" }),
          col("lca", "emissionFactors", "unit", "text", { width: "sm" }),
          col("lca", "emissionFactors", "reference", "text", { width: "lg" }),
        ],
      }),
    ],
  },

  // ── I: Community & Environment ──────────────────────────────────────
  {
    id: "community",
    titleKey: "sections.community.title",
    questions: [
      q("community", "environmentalImpact"),
      q("community", "airEmissions"),
      q("community", "waterUsage"),
      q("community", "hazardousWaste"),
      q("community", "noiseModeling"),
      q("community", "sensitiveSites"),
      q("community", "communityEngagement"),
      q("community", "stakeholderMapping"),
      q("community", "harmsBenefits"),
    ],
  },

  // ── J: Equipment & Plant Layout ─────────────────────────────────────
  {
    id: "equipment",
    titleKey: "sections.equipment.title",
    questions: [
      q("equipment", "preProcessing", "table", true, {
        columns: [
          col("equipment", "preProcessing", "item", "text", { width: "md" }),
          col("equipment", "preProcessing", "makeModel", "text", { width: "md" }),
          col("equipment", "preProcessing", "capacity", "text", { width: "sm" }),
          col("equipment", "preProcessing", "powerKw", "text", { width: "sm" }),
          col("equipment", "preProcessing", "notes", "textarea", { width: "lg" }),
        ],
      }),
      q("equipment", "pyrolysisUnits", "table", true, {
        referenceKey: "pyrolysis-approved-methodology",
        columns: [
          col("equipment", "pyrolysisUnits", "unitId", "text", { width: "sm" }),
          col("equipment", "pyrolysisUnits", "makeModel", "text", { width: "md" }),
          col("equipment", "pyrolysisUnits", "capacityKgh", "text", { width: "sm" }),
          col("equipment", "pyrolysisUnits", "tempC", "text", { width: "sm" }),
          col("equipment", "pyrolysisUnits", "residenceMin", "text", { width: "sm" }),
          col("equipment", "pyrolysisUnits", "powerKw", "text", { width: "sm" }),
          col("equipment", "pyrolysisUnits", "status", "select", {
            options: ["quoted", "ordered", "delivered", "installed", "commissioned"],
            width: "sm",
          }),
        ],
      }),
      q("equipment", "postProcessing", "table", true, {
        columns: [
          col("equipment", "postProcessing", "item", "text", { width: "md" }),
          col("equipment", "postProcessing", "makeModel", "text", { width: "md" }),
          col("equipment", "postProcessing", "throughput", "text", { width: "sm" }),
          col("equipment", "postProcessing", "notes", "textarea", { width: "lg" }),
        ],
      }),
      q("equipment", "ancillaryEquipment", "table", true, {
        columns: [
          col("equipment", "ancillaryEquipment", "item", "text", { width: "md" }),
          col("equipment", "ancillaryEquipment", "function", "text", { width: "md" }),
          col("equipment", "ancillaryEquipment", "capacity", "text", { width: "sm" }),
          col("equipment", "ancillaryEquipment", "notes", "textarea", { width: "lg" }),
        ],
      }),
      q("equipment", "plantLayout"),
      q("equipment", "supplierWarranty", "table", true, {
        columns: [
          col("equipment", "supplierWarranty", "supplier", "text", { width: "md" }),
          col("equipment", "supplierWarranty", "equipment", "text", { width: "md" }),
          col("equipment", "supplierWarranty", "warrantyYears", "text", { width: "sm" }),
          col("equipment", "supplierWarranty", "scope", "textarea", { width: "lg" }),
        ],
      }),
    ],
  },

  // ── K: Electrical & Quality Control ─────────────────────────────────
  {
    id: "electrical",
    titleKey: "sections.electrical.title",
    questions: [
      q("electrical", "powerDistribution", "table", true, {
        columns: [
          col("electrical", "powerDistribution", "equipmentId", "text", { width: "sm" }),
          col("electrical", "powerDistribution", "voltage", "text", { width: "sm" }),
          col("electrical", "powerDistribution", "ratingKw", "text", { width: "sm" }),
          col("electrical", "powerDistribution", "cableSize", "text", { width: "sm" }),
          col("electrical", "powerDistribution", "breaker", "text", { width: "sm" }),
          col("electrical", "powerDistribution", "notes", "textarea", { width: "lg" }),
        ],
      }),
      q("electrical", "motorControlCenters", "table", true, {
        columns: [
          col("electrical", "motorControlCenters", "mccId", "text", { width: "sm" }),
          col("electrical", "motorControlCenters", "description", "text", { width: "md" }),
          col("electrical", "motorControlCenters", "feeders", "text", { width: "sm" }),
          col("electrical", "motorControlCenters", "notes", "textarea", { width: "lg" }),
        ],
      }),
      q("electrical", "emergencyPower", "table", true, {
        columns: [
          col("electrical", "emergencyPower", "source", "select", {
            options: ["diesel-generator", "ups", "battery", "grid-backup", "other"],
            width: "md",
          }),
          col("electrical", "emergencyPower", "capacityKva", "text", { width: "sm" }),
          col("electrical", "emergencyPower", "autonomyH", "text", { width: "sm" }),
          col("electrical", "emergencyPower", "criticalLoads", "textarea", { width: "xl" }),
        ],
      }),
      q("electrical", "qualityParameters", "table", true, {
        columns: [
          col("electrical", "qualityParameters", "parameter", "text", { width: "md" }),
          col("electrical", "qualityParameters", "target", "text", { width: "sm" }),
          col("electrical", "qualityParameters", "testMethod", "text", { width: "md" }),
          col("electrical", "qualityParameters", "frequency", "text", { width: "sm" }),
        ],
      }),
      q("electrical", "labAnalysis", "table", true, {
        columns: [
          col("electrical", "labAnalysis", "analysis", "text", { width: "md" }),
          col("electrical", "labAnalysis", "labProvider", "text", { width: "md" }),
          col("electrical", "labAnalysis", "frequency", "text", { width: "sm" }),
          col("electrical", "labAnalysis", "costUsd", "text", { width: "sm" }),
        ],
      }),
      q("electrical", "certificationStandards", "table", true, {
        referenceKey: "certification-standards-comparison",
        columns: [
          col("electrical", "certificationStandards", "standard", "select", {
            options: ["puro-earth", "isometric", "verra-vm0044", "ebc", "gold-standard", "iso", "other"],
            width: "md",
          }),
          col("electrical", "certificationStandards", "applicability", "text", { width: "lg" }),
          col("electrical", "certificationStandards", "status", "select", {
            options: ["not-started", "in-progress", "endorsed", "certified"],
            width: "sm",
          }),
          col("electrical", "certificationStandards", "nextVerification", "text", { width: "sm" }),
        ],
      }),
    ],
  },
];

// ============================================================================
// REFERENCE TEMPLATES
//
// Rich "how a Microsoft/Puro/Isometric-grade answer looks" for the tabular
// questions. Referenced from PddQuestion.referenceKey.
//
// Structure is bilingual inline (no i18n key indirection) so the content
// lives next to the schema. When we later expand these, the PDD Builder
// UI will show a collapsible panel with the bullets + a "Load template"
// button that pre-fills the table's rows from exampleRows.
// ============================================================================

export type PddMethodology =
  | "microsoft"
  | "puro-earth"
  | "isometric"
  | "verra-vm0044"
  | "ebc"
  | "gold-standard"
  | "generic";

export interface PddReferenceTemplate {
  id: string;
  methodology: PddMethodology;
  title: FallbackLabel;
  summary: FallbackLabel;
  bullets: FallbackLabel[];
  exampleRows?: PddTableRow[];
  source?: string;
}

export const PDD_REFERENCE_TEMPLATES: Record<string, PddReferenceTemplate> = {
  // ── Risk Register — Microsoft-grade 12-row matrix ─────────────────────────
  "risk-register-microsoft": {
    id: "risk-register-microsoft",
    methodology: "microsoft",
    title: {
      en: "Microsoft CDR-grade Risk Register",
      es: "Registro de Riesgos nivel Microsoft CDR",
    },
    summary: {
      en: "The Microsoft BiCRS DD template expects an exhaustive matrix covering 11+ risk categories. Each row must have type, description, mitigation, current risk level, and a supporting document reference.",
      es: "La plantilla DD BiCRS de Microsoft exige una matriz exhaustiva con 11+ categorías de riesgo. Cada fila debe tener tipo, descripción, mitigación, nivel de riesgo actual y un documento de respaldo.",
    },
    bullets: [
      { en: "Cover all 11 canonical risk types (financial, management, social, political, regulatory, natural, reversal, quantitative, commercial, site-control, technology)", es: "Cubrí los 11 tipos canónicos (financial, management, social, political, regulatory, natural, reversal, quantitative, commercial, site-control, technology)" },
      { en: "Each row needs a concrete mitigation — not just an acknowledgment", es: "Cada fila necesita una mitigación concreta — no basta con reconocer el riesgo" },
      { en: "Cite a supporting document for every non-LOW row (audit trail)", es: "Citá un documento de respaldo por cada fila que no sea BAJO (trazabilidad de auditoría)" },
      { en: "State current level AND target level if applicable", es: "Indicá el nivel actual Y el nivel objetivo si aplica" },
    ],
    exampleRows: [
      { type: "financial", description: "Funding gap until offtake is signed", mitigation: "Advanced investor discussions; offtake as trigger", level: "medium", supportingDoc: "Risk Assessment" },
      { type: "management", description: "Team bandwidth across carbon + tech ops", mitigation: "10+ yr avg experience; pyrolyzer operational track record", level: "low", supportingDoc: "Team CVs" },
      { type: "regulatory", description: "EIA / municipal permit delays", mitigation: "Early ICAA engagement; permits pre-mapped", level: "low", supportingDoc: "Permitting matrix" },
      { type: "reversal", description: "Unintentional carbon re-release", mitigation: "10% buffer credits; dMRV traceability", level: "medium", supportingDoc: "MRV plan" },
      { type: "technology", description: "Pyrolyzer performance & installation", mitigation: "Chinese OEM w/ supervision; operator has prior deployment", level: "low", supportingDoc: "Quotation + OEM support letter" },
    ],
    source: "Microsoft 2024 Carbon Removal Procurement Cycle — BiCRS DD Data Room",
  },

  // ── Permitting Status — Biochar facility permit stack ────────────────────
  "permitting-biochar-facility": {
    id: "permitting-biochar-facility",
    methodology: "generic",
    title: {
      en: "Standard permit stack for a biochar facility",
      es: "Stack estándar de permisos para una planta de biochar",
    },
    summary: {
      en: "Most jurisdictions require the following six permits before a biochar facility can be commissioned. Track each with its issuing authority, current status, and expected date.",
      es: "La mayoría de las jurisdicciones exige estos seis permisos antes de habilitar operaciones. Trackealos con su autoridad emisora, estado actual y fecha estimada.",
    },
    bullets: [
      { en: "EIA is usually the critical-path permit — start it first", es: "El EIA suele ser el permiso de camino crítico — arrancalo primero" },
      { en: "Industrial park entry & land-use approval before construction permit", es: "Habilitación de parque industrial + uso de suelo antes del permiso de obra" },
      { en: "Wastewater and air-emissions authorizations are often separate", es: "Efluentes y emisiones al aire suelen ser autorizaciones separadas" },
      { en: "The operational permit is the last one — issued after commissioning tests", es: "El permiso operativo es el último — se emite después de las pruebas de commissioning" },
    ],
    exampleRows: [
      { permit: "Environmental Impact Assessment (EIA)", authority: "Provincial environmental authority", status: "in-progress", expectedDate: "Q4 2025", notes: "Baseline studies complete" },
      { permit: "Industrial Park entry & land-use", authority: "Provincial industrial parks agency", status: "in-progress", expectedDate: "60 days after full docs", notes: "Preliminary approval granted" },
      { permit: "Water & wastewater authorization", authority: "Park administration + EIA body", status: "not-started", expectedDate: "Concurrent with operational permit", notes: "" },
      { permit: "Electricity grid connection", authority: "Provincial power utility", status: "not-started", expectedDate: "90 days from application", notes: "" },
      { permit: "Construction permit (civil works)", authority: "Municipality", status: "not-started", expectedDate: "30-45 days from submission", notes: "EPC to file" },
      { permit: "Operational permit", authority: "Provincial ministry / park", status: "not-started", expectedDate: "30 days post-commissioning", notes: "" },
    ],
  },

  // ── Feedstock Certifications ─────────────────────────────────────────────
  "feedstock-certifications": {
    id: "feedstock-certifications",
    methodology: "puro-earth",
    title: {
      en: "Forestry & biomass certifications required by CDR methodologies",
      es: "Certificaciones forestales / de biomasa que exigen las metodologías CDR",
    },
    summary: {
      en: "Puro.earth, Verra VM0044 and Isometric require chain-of-custody evidence for the biomass source. FSC or PEFC is the strongest signal for wood-based feedstocks; ISCC / SBP / REDcert cover non-wood streams.",
      es: "Puro.earth, Verra VM0044 e Isometric exigen evidencia de cadena de custodia del origen de la biomasa. FSC o PEFC son la señal más fuerte para biomasa maderera; ISCC / SBP / REDcert cubren corrientes no madereras.",
    },
    bullets: [
      { en: "FSC-FM certifies the forest management; FSC-CoC follows the material downstream", es: "FSC-FM certifica el manejo forestal; FSC-CoC sigue el material aguas abajo" },
      { en: "Attach the actual certificate PDF + include the certificate number", es: "Adjuntá el PDF del certificado + incluí el número de certificado" },
      { en: "Every certificate has an expiry — capture the valid-until date", es: "Todo certificado tiene vencimiento — capturá la fecha válida" },
      { en: "Include the accredited verifier (Rainforest Alliance, SGS, Bureau Veritas, etc.)", es: "Incluí el verificador acreditado (Rainforest Alliance, SGS, Bureau Veritas, etc.)" },
    ],
    exampleRows: [
      { standard: "FSC", certificateNumber: "RA-FM/COC-XXXXXX", scope: "Forest management + chain of custody", validUntil: "YYYY-MM-DD", verifier: "Rainforest Alliance" },
    ],
  },

  // ── Emission Factors — Baseline LCA ──────────────────────────────────────
  "emission-factors-baseline": {
    id: "emission-factors-baseline",
    methodology: "puro-earth",
    title: {
      en: "Baseline LCA emission factors",
      es: "Factores de emisión base para el ACV",
    },
    summary: {
      en: "Puro.earth LCA guidelines require every material and energy flow to be tied to an emission factor with a citable source (IPCC AR6, GHG Protocol, ecoinvent, or national inventory).",
      es: "Las guías LCA de Puro.earth exigen que todo flujo de material y energía esté ligado a un factor de emisión con fuente citable (IPCC AR6, GHG Protocol, ecoinvent, o inventario nacional).",
    },
    bullets: [
      { en: "Use IPCC AR6 defaults for CH4 & N2O global warming potentials (28 and 273)", es: "Usá los defaults IPCC AR6 para los GWP de CH4 y N2O (28 y 273)" },
      { en: "Grid electricity: cite the national or regional grid EF for the relevant year", es: "Electricidad de red: citá el EF nacional o regional del año correspondiente" },
      { en: "Diesel transport: kgCO2e/tonne-km with distance basis stated", es: "Transporte diésel: kgCO2e/tonelada-km con base de distancia declarada" },
      { en: "Pyrolysis: process CO2 is biogenic (excluded); syngas non-condensables count", es: "Pirólisis: el CO2 de proceso es biogénico (excluido); no-condensables del syngas cuentan" },
    ],
    exampleRows: [
      { source: "Grid electricity (national)", value: "0.334", unit: "kgCO2e/kWh", reference: "IEA 2024 country factor" },
      { source: "Diesel truck transport", value: "0.096", unit: "kgCO2e/tonne-km", reference: "GHG Protocol Transport 2024" },
      { source: "Diesel combustion", value: "2.68", unit: "kgCO2e/L", reference: "IPCC 2006 Vol.2 Ch.2" },
    ],
    source: "Puro.earth LCA Guidelines for Suppliers",
  },

  // ── Pyrolysis Units — approved / vetted models by methodology ────────────
  "pyrolysis-approved-methodology": {
    id: "pyrolysis-approved-methodology",
    methodology: "isometric",
    title: {
      en: "Pyrolyzers pre-approved or vetted by CDR methodologies",
      es: "Pyrolyzers pre-aprobados o vetados por metodologías CDR",
    },
    summary: {
      en: "Only two methodologies publish formal pre-approval lists. Using a pre-approved unit cuts 6-12 months from validation. Isometric lists Ankur PG Series, Beston BST-50, Pyrogreen BRKC 1000. EBC endorses PYREG, Syncraft and NGE. Puro.earth marks PYREG as 'Vetted'.",
      es: "Sólo dos metodologías publican listas formales de pre-aprobación. Usar una unidad pre-aprobada ahorra 6-12 meses de validación. Isometric lista Ankur PG Series, Beston BST-50, Pyrogreen BRKC 1000. EBC endosa PYREG, Syncraft y NGE. Puro.earth marca PYREG como 'Vetted'.",
    },
    bullets: [
      { en: "Isometric pre-approved shortcut applies if you use Ankur / Beston BST-50 / Pyrogreen BRKC 1000", es: "El shortcut Isometric aplica si usás Ankur / Beston BST-50 / Pyrogreen BRKC 1000" },
      { en: "PYREG is the only cross-approved brand (EBC endorsed + Puro Vetted)", es: "PYREG es la única marca con doble aprobación (EBC endorsed + Puro Vetted)" },
      { en: "Verra VM0044 has no pre-approvals — the unit must meet the high-tech performance criteria", es: "Verra VM0044 no tiene pre-aprobación — la unidad debe cumplir los criterios high-tech de desempeño" },
      { en: "Track status per unit (quoted / ordered / delivered / installed / commissioned) for the auditor", es: "Trackeá el estado de cada unidad (quoted / ordered / delivered / installed / commissioned) para el auditor" },
    ],
    exampleRows: [
      { unitId: "R-01", makeModel: "Beston BST-50", capacityKgh: "250", tempC: "600-700", residenceMin: "30", powerKw: "45", status: "quoted" },
      { unitId: "R-02", makeModel: "Beston BST-50", capacityKgh: "250", tempC: "600-700", residenceMin: "30", powerKw: "45", status: "quoted" },
    ],
    source: "Isometric Certify — Pyrolyzer Pre-Approval",
  },

  // ── Certification Standards — methodology comparison cheatsheet ──────────
  "certification-standards-comparison": {
    id: "certification-standards-comparison",
    methodology: "generic",
    title: {
      en: "Which methodology to target",
      es: "Qué metodología apuntar",
    },
    summary: {
      en: "Pick per market signal: Puro.earth = broadest corporate demand; Isometric = fastest-growing with pre-approved shortcut; EBC = strongest for European agricultural use; Verra VM0044 = compliance-market entry; Gold Standard 'PARC' = coming Q4-2026 (consultation open).",
      es: "Elegí según señal de mercado: Puro.earth = mayor demanda corporativa; Isometric = crecimiento más rápido con shortcut pre-aprobado; EBC = más fuerte para uso agrícola europeo; Verra VM0044 = entrada al mercado de compliance; Gold Standard 'PARC' = próxima Q4-2026 (consulta abierta).",
    },
    bullets: [
      { en: "Puro.earth CORCs are performance-based — meet H:C ≤ 0.7 and Puro's LCA rules", es: "Los CORCs de Puro.earth son performance-based — cumplí H:C ≤ 0.7 y las reglas LCA de Puro" },
      { en: "Isometric has a public Certify platform — issuance is faster if you use a pre-approved unit", es: "Isometric tiene una plataforma pública Certify — la emisión es más rápida con unidad pre-aprobada" },
      { en: "EBC agricultural use is regulated (mandatory in Switzerland; strong signal in DE/AT)", es: "El uso agrícola EBC está regulado (mandatorio en Suiza; señal fuerte en DE/AT)" },
      { en: "Verra VM0044 tiers by tech level — record your tier + tech justification", es: "Verra VM0044 categoriza por nivel tecnológico — registrá tu tier + justificación técnica" },
    ],
    exampleRows: [
      { standard: "puro-earth", applicability: "Voluntary corporate offtake (Microsoft, Shopify, Klarna)", status: "in-progress", nextVerification: "Annual facility audit" },
      { standard: "isometric", applicability: "Voluntary market with pre-approved pyrolyzer shortcut", status: "not-started", nextVerification: "Batch-level protocol" },
      { standard: "ebc", applicability: "European agricultural use (mandatory in CH)", status: "not-started", nextVerification: "Class-based audit per batch" },
    ],
    source: "Cross-methodology research — biocharpro.io",
  },
};

export function getReferenceTemplate(id: string | undefined): PddReferenceTemplate | null {
  if (!id) return null;
  return PDD_REFERENCE_TEMPLATES[id] ?? null;
}

/** Pick the right translation from a bilingual label based on i18n language. */
export function pickBilingual(label: FallbackLabel, lang: string | undefined): string {
  return label[pickLang(lang)];
}
