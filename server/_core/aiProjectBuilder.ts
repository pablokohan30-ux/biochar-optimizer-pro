/**
 * AI Project Builder — Expert tier ($999) flagship feature.
 *
 * Takes minimal user input (biomass, capacity, country) and generates a full
 * project package of ~15 documents suitable for investor pitches or submission
 * to carbon-credit certifiers (Puro.earth, Isometric, Verra VM0044, EBC,
 * Gold Standard).
 *
 * Each document is generated independently by Gemini 2.5 Flash, grounded in
 * curated reference data (equipment catalog, emission factors by country,
 * methodology requirements) to prevent hallucinations of non-existent
 * equipment or invented regulatory figures.
 *
 * This file defines:
 *   - DOC_DEFINITIONS: the catalog of doc types + their prompts
 *   - generateDoc(): run a single doc generation
 *   - generateProjectPackage(): orchestrate generation of all docs, tracking
 *     tokens and updating the DB row as each doc completes
 */

import { invokeLLM, buildLangDirective, type Message } from "./llm";

// ═══════════════════════════════════════════════════════════════════════════
// GROUNDING DATA — curated reference so AI doesn't invent numbers
// ═══════════════════════════════════════════════════════════════════════════

// Approximate emission factors for grid electricity by country (tCO2e/kWh).
// Sources: public gov/IEA data. For countries not listed, AI will default
// to a continental average with a clear caveat in the output.
export const GRID_EMISSION_FACTORS: Record<string, { factor: number; source: string }> = {
  // Americas
  AR: { factor: 0.00023, source: "Secretaría de Energía Argentina (2023)" },
  BR: { factor: 0.000074, source: "Brazil MME (2023) — hydro-dominated" },
  BO: { factor: 0.00038, source: "Ministerio de Hidrocarburos y Energía Bolivia (2023)" },
  CA: { factor: 0.00014, source: "ECCC Canada NIR (2023) — hydro-heavy provinces" },
  CL: { factor: 0.00028, source: "CNE Chile (2023)" },
  CO: { factor: 0.00018, source: "UPME Colombia (2023)" },
  EC: { factor: 0.00029, source: "ARCONEL Ecuador (2023)" },
  MX: { factor: 0.00047, source: "SEMARNAT Mexico (2023)" },
  PE: { factor: 0.00028, source: "MINEM Peru (2023)" },
  PY: { factor: 0.00004, source: "ANDE Paraguay (2023) — near 100% hydro" },
  UY: { factor: 0.00009, source: "UTE Uruguay (2023) — hydro + wind dominated" },
  US: { factor: 0.00038, source: "EPA eGRID (2022)" },
  // Europe
  DE: { factor: 0.000380, source: "UBA Germany (2023)" },
  ES: { factor: 0.000170, source: "REE Spain (2023)" },
  FR: { factor: 0.000060, source: "RTE France (2023) — nuclear-dominated" },
  IT: { factor: 0.000265, source: "ISPRA Italy (2023)" },
  NL: { factor: 0.000350, source: "CBS Netherlands (2023)" },
  PT: { factor: 0.000180, source: "DGEG Portugal (2023)" },
  UK: { factor: 0.000193, source: "BEIS UK (2023)" },
  // Asia-Pacific
  AU: { factor: 0.00066, source: "DCCEEW Australia (2023)" },
  CN: { factor: 0.000581, source: "MEE China (2023)" },
  ID: { factor: 0.000870, source: "MEMR Indonesia (2023) — coal-dominated" },
  IN: { factor: 0.000708, source: "CEA India (2023) — coal-dominated" },
  TH: { factor: 0.000513, source: "EGAT Thailand (2023)" },
  VN: { factor: 0.000545, source: "MOIT Vietnam (2023)" },
  // Africa
  GH: { factor: 0.000398, source: "Energy Commission Ghana (2023)" },
  KE: { factor: 0.000120, source: "EPRA Kenya (2023) — geothermal/hydro" },
  NG: { factor: 0.000418, source: "FMEnv Nigeria (2023)" },
  ZA: { factor: 0.000940, source: "DMRE South Africa (2023) — coal-dominated" },
};

// Country-specific regulatory authorities used to ground the Permit Matrix
// doc. Keys: ISO-2 country code. Values: { eia, zoning, construction,
// operating, utility, legalFramework }. The AI is instructed to use these
// names verbatim when generating the Permit Matrix.
export const REGULATORY_AUTHORITIES: Record<string, {
  eia: string;
  zoning: string;
  construction: string;
  operating: string;
  utility: string;
  legalFramework: string;
}> = {
  AR: {
    eia: "Autoridad ambiental provincial (ej: ICAA en Corrientes, OPDS en Buenos Aires, APN en nivel nacional para áreas protegidas)",
    zoning: "Dirección de Parques Industriales provincial + municipio",
    construction: "Municipio (Dirección de Obras Particulares)",
    operating: "Ministerio de Producción provincial",
    utility: "Distribuidora eléctrica provincial (ej: DPEC en Corrientes, EDENOR/EDESUR en Bs As, EPE en Santa Fe)",
    legalFramework: "Ley Nacional 25.675 (Ley General del Ambiente) + leyes provinciales",
  },
  UY: {
    eia: "DINACEA / DINAMA (Dirección Nacional de Calidad Ambiental, dependiente del Ministerio de Ambiente)",
    zoning: "Intendencia departamental + Ley Nº 18.308 de Ordenamiento Territorial",
    construction: "Intendencia departamental (Permiso de Construcción)",
    operating: "Autorización Ambiental de Operación (AAO) emitida por DINACEA",
    utility: "UTE (Administración Nacional de Usinas y Trasmisiones Eléctricas)",
    legalFramework: "Ley Nº 17.283 (Ley General del Ambiente) + Decreto 349/005 (EIA)",
  },
  PY: {
    eia: "MADES (Ministerio del Ambiente y Desarrollo Sostenible) — Licencia Ambiental",
    zoning: "Municipio local + Secretaría Técnica de Planificación del Desarrollo Económico y Social (STP)",
    construction: "Municipio (Permiso de Construcción)",
    operating: "MADES + Ministerio de Industria y Comercio",
    utility: "ANDE (Administración Nacional de Electricidad)",
    legalFramework: "Ley Nº 294/93 (EIA) + Ley Nº 6123/18 (creación MADES)",
  },
  EC: {
    eia: "MAATE (Ministerio del Ambiente, Agua y Transición Ecológica) — Licencia Ambiental",
    zoning: "GAD Municipal (Gobierno Autónomo Descentralizado) + MIDUVI",
    construction: "GAD Municipal (Permiso de Construcción)",
    operating: "MAATE + Agencia de Regulación y Control Ambiental",
    utility: "Empresa eléctrica regional (ej: CNEL EP — Corporación Nacional de Electricidad)",
    legalFramework: "Código Orgánico del Ambiente (COA, 2017) + Reglamento al COA",
  },
  FR: {
    eia: "DREAL (Direction régionale de l'Environnement, de l'Aménagement et du Logement) + Préfecture",
    zoning: "Commune (PLU — Plan Local d'Urbanisme)",
    construction: "Mairie (Permis de construire)",
    operating: "ICPE (Installation Classée pour la Protection de l'Environnement) — autorisation préfectorale",
    utility: "Enedis (distribution) + EDF (fournisseur historique) ou fournisseur alternatif",
    legalFramework: "Code de l'environnement (Livre V, Titre I — ICPE) + Directive IED",
  },
  IT: {
    eia: "Regione (VIA regional) o Ministero dell'Ambiente (MASE) per opere nazionali",
    zoning: "Comune + Piano Regolatore Generale",
    construction: "Comune (Permesso di Costruire)",
    operating: "AIA (Autorizzazione Integrata Ambientale) dalla Regione",
    utility: "E-distribuzione (ex-Enel) o altro DSO locale",
    legalFramework: "D.Lgs. 152/2006 (Testo Unico Ambientale) + Direttiva IED",
  },
  NL: {
    eia: "Provincie of Rijksoverheid afhankelijk van schaal (m.e.r. beoordeling)",
    zoning: "Gemeente (Bestemmingsplan)",
    construction: "Gemeente (Omgevingsvergunning)",
    operating: "Omgevingsvergunning (milieu) van provincie of gemeente",
    utility: "Liander, Stedin, Enexis (DSO regional)",
    legalFramework: "Omgevingswet (2024) + Wet milieubeheer",
  },
  PT: {
    eia: "APA (Agência Portuguesa do Ambiente) + CCDR regional",
    zoning: "Câmara Municipal + PDM (Plano Diretor Municipal)",
    construction: "Câmara Municipal (Licença de Construção)",
    operating: "APA — Licença Ambiental (regime PCIP para instalações PCIP-listed)",
    utility: "E-REDES (distribuidor) + EDP ou comercializador alternativo",
    legalFramework: "Decreto-Lei n.º 151-B/2013 (AIA) + Decreto-Lei n.º 127/2013 (PCIP)",
  },
  CN: {
    eia: "Ministry of Ecology and Environment (MEE) or provincial/municipal EEB (Ecology and Environment Bureau)",
    zoning: "Local Natural Resources Bureau + Municipal Planning Commission",
    construction: "Urban Construction Bureau (建设局)",
    operating: "Ecology and Environment Bureau — Pollutant Discharge Permit",
    utility: "State Grid Corporation of China or China Southern Power Grid",
    legalFramework: "Environmental Impact Assessment Law (2003, revised 2018) + Environmental Protection Law (2014)",
  },
  ID: {
    eia: "KLHK (Kementerian Lingkungan Hidup dan Kehutanan) — AMDAL for large projects; UKL-UPL for smaller",
    zoning: "Pemerintah Daerah + RTRW (Rencana Tata Ruang Wilayah)",
    construction: "Pemerintah Daerah — IMB (Izin Mendirikan Bangunan) now consolidated into PBG",
    operating: "Persetujuan Lingkungan (Environmental Approval) replacing prior Izin Lingkungan",
    utility: "PLN (Perusahaan Listrik Negara)",
    legalFramework: "UU No. 32/2009 (PPLH — Environmental Protection) + UU Cipta Kerja 2020",
  },
  ZA: {
    eia: "DFFE (Department of Forestry, Fisheries and Environment) — Environmental Authorisation",
    zoning: "Municipality + SPLUMA (Spatial Planning and Land Use Management Act)",
    construction: "Municipal Building Control (National Building Regulations Act)",
    operating: "NEMA Environmental Authorisation + NEM:AQA Atmospheric Emission Licence",
    utility: "Eskom (national) + municipal distributors (e.g. City Power Johannesburg)",
    legalFramework: "NEMA (National Environmental Management Act, 1998) + EIA Regulations 2014",
  },
  BR: {
    eia: "IBAMA (nacional) ou órgão estadual equivalente (ex: CETESB em SP, INEA no RJ, IEMA no ES, SEMAD em MG)",
    zoning: "Prefeitura Municipal + Plano Diretor Municipal",
    construction: "Prefeitura Municipal (Alvará de Construção)",
    operating: "Licença de Operação (LO) emitida pelo órgão ambiental",
    utility: "Concessionária estadual (ex: CEMIG em MG, CPFL em SP, Copel no PR, Celesc em SC)",
    legalFramework: "Resolução CONAMA 01/1986, Lei 6.938/1981",
  },
  CL: {
    eia: "SEA (Servicio de Evaluación Ambiental) — DIA o EIA según categorización",
    zoning: "Municipalidad + SEREMI de Vivienda y Urbanismo",
    construction: "Dirección de Obras Municipales (DOM)",
    operating: "SEREMI de Medio Ambiente + Superintendencia del Medio Ambiente (SMA)",
    utility: "Distribuidora concesionaria (ej: Enel Distribución, CGE, Saesa)",
    legalFramework: "Ley 19.300 (Bases Generales del Medio Ambiente)",
  },
  CO: {
    eia: "ANLA (Autoridad Nacional de Licencias Ambientales) o Corporación Autónoma Regional (CAR) según jurisdicción",
    zoning: "Alcaldía Municipal + POT (Plan de Ordenamiento Territorial)",
    construction: "Curaduría Urbana del municipio",
    operating: "Autoridad Ambiental (ANLA o CAR)",
    utility: "Empresa distribuidora (ej: Codensa, EPM, Afinia, Celsia)",
    legalFramework: "Decreto 1076 de 2015 (Único Reglamentario Ambiental)",
  },
  MX: {
    eia: "SEMARNAT (nacional) o Secretaría de Medio Ambiente estatal",
    zoning: "Municipio + Programa de Desarrollo Urbano",
    construction: "Municipio (Licencia de Construcción)",
    operating: "SEMARNAT + PROFEPA (inspección) + Secretaría estatal",
    utility: "CFE (Comisión Federal de Electricidad) + operador regional",
    legalFramework: "LGEEPA (Ley General del Equilibrio Ecológico y la Protección al Ambiente)",
  },
  PE: {
    eia: "SENACE (Servicio Nacional de Certificación Ambiental) o Autoridad Sectorial competente",
    zoning: "Municipalidad + Gobierno Regional",
    construction: "Municipalidad Distrital",
    operating: "OEFA (Organismo de Evaluación y Fiscalización Ambiental)",
    utility: "Distribuidora concesionaria (ej: Luz del Sur, Enel Distribución Perú)",
    legalFramework: "Ley 27446 (Sistema Nacional de Evaluación de Impacto Ambiental)",
  },
  BO: {
    eia: "MMAyA (Ministerio de Medio Ambiente y Agua) + Autoridad Ambiental Competente",
    zoning: "Gobierno Municipal + Gobernación departamental",
    construction: "Gobierno Municipal (Licencia de Construcción)",
    operating: "AACN (Autoridad Ambiental Competente Nacional)",
    utility: "Distribuidora regional (ej: CRE en Santa Cruz, ELFEC en Cochabamba, Electropaz en La Paz)",
    legalFramework: "Ley 1333 (Ley del Medio Ambiente)",
  },
  US: {
    eia: "EPA (federal) + state environmental agency (e.g. CalEPA, NYSDEC, TCEQ)",
    zoning: "County/city zoning board + state land use office",
    construction: "Local Building Department",
    operating: "State environmental agency operating permit (Title V air permit if applicable)",
    utility: "Investor-owned utility or cooperative (e.g. PG&E, Xcel, Duke)",
    legalFramework: "NEPA (National Environmental Policy Act) + Clean Air Act + Clean Water Act + state analogs",
  },
  DE: {
    eia: "Bundesimmissionsschutzgesetz (BImSchG) Genehmigung via Bezirksregierung / Landesbehörde",
    zoning: "Bebauungsplan der Gemeinde",
    construction: "Bauamt der Gemeinde",
    operating: "BImSchG-Genehmigung (4. BImSchV relevant für Pyrolyseanlagen)",
    utility: "Netzbetreiber (e.g. Westnetz, Bayernwerk, 50Hertz)",
    legalFramework: "BImSchG, Kreislaufwirtschaftsgesetz (KrWG), Umweltverträglichkeitsprüfungsgesetz (UVPG)",
  },
  ES: {
    eia: "Comunidad Autónoma (DIA/DIA simplificada) según Ley 21/2013",
    zoning: "Ayuntamiento + Planeamiento urbanístico autonómico",
    construction: "Licencia de obras del Ayuntamiento",
    operating: "Autorización Ambiental Integrada (AAI) según Ley 16/2002",
    utility: "Distribuidora (ej: Endesa, Iberdrola, Unión Fenosa)",
    legalFramework: "Ley 21/2013 de Evaluación Ambiental + Ley 16/2002 IPPC",
  },
  UK: {
    eia: "Environment Agency (England) / SEPA (Scotland) / NRW (Wales) / NIEA (Northern Ireland)",
    zoning: "Local Planning Authority (council planning permission)",
    construction: "Building Control (local council or approved inspector)",
    operating: "Environmental Permit from Environment Agency / devolved equivalent",
    utility: "Distribution Network Operator (e.g. UK Power Networks, Western Power)",
    legalFramework: "Environmental Permitting Regulations 2016 + Town and Country Planning Act 1990",
  },
  AU: {
    eia: "State EPA (e.g. EPA Victoria, EPA NSW, DES Queensland) + Federal EPBC Act if matter of national environmental significance",
    zoning: "Local Council planning scheme + state planning framework",
    construction: "Local Council building permit",
    operating: "State EPA operating licence",
    utility: "Distribution Network Service Provider (e.g. Ausgrid, Energex, Powercor)",
    legalFramework: "EPBC Act 1999 (federal) + state environmental protection acts",
  },
  IN: {
    eia: "State Environmental Impact Assessment Authority (SEIAA) or MoEFCC depending on category/scale",
    zoning: "State Pollution Control Board (SPCB) + Town Planning Department",
    construction: "Municipal Corporation (Building Permit)",
    operating: "Consent to Operate from SPCB",
    utility: "State DISCOM (e.g. TANGEDCO, MSEDCL, BSES)",
    legalFramework: "EIA Notification 2006 + Environment (Protection) Act 1986",
  },
};

// Curated catalog of pyrolysis equipment with known real specs + which
// methodologies formally pre-approve them. AI references this by name so it
// never invents equipment.
export const PYROLYZER_CATALOG = [
  {
    name: "PYREG P1500",
    manufacturer: "PYREG GmbH",
    country: "Germany",
    capacityKgH: 300,
    tempRangeC: [550, 700],
    approvals: { puro: "Vetted Model", ebc: "Endorsed Provider", isometric: null, verra: null, goldStandard: null },
    notes: "Cross-approved: EBC endorsed + Puro.earth Vetted. Ideal for European markets and Puro submissions.",
  },
  {
    name: "PYREG PX1500",
    manufacturer: "PYREG GmbH",
    country: "Germany",
    capacityKgH: 1500,
    tempRangeC: [550, 700],
    approvals: { puro: "Vetted Model", ebc: "Endorsed Provider", isometric: null, verra: null, goldStandard: null },
    notes: "Industrial-scale PX series. Same cross-approval profile as P1500.",
  },
  {
    name: "Ankur PG Series",
    manufacturer: "Ankur Scientific",
    country: "India",
    capacityKgH: 500,
    tempRangeC: [500, 750],
    approvals: { puro: null, ebc: null, isometric: "Pre-Approved", verra: null, goldStandard: null },
    notes: "Pre-approved on Isometric Certify platform — fast-track (6-12 months validation time saved).",
  },
  {
    name: "Beston BST-50",
    manufacturer: "Beston Group",
    country: "China",
    capacityKgH: 500,
    tempRangeC: [450, 700],
    approvals: { puro: null, ebc: null, isometric: "Pre-Approved", verra: null, goldStandard: null },
    notes: "Pre-approved on Isometric Certify platform.",
  },
  {
    name: "Pyrogreen BRKC 1000",
    manufacturer: "Pyrogreen Energy",
    country: "China/International",
    capacityKgH: 1000,
    tempRangeC: [500, 750],
    approvals: { puro: null, ebc: null, isometric: "Pre-Approved", verra: null, goldStandard: null },
    notes: "Pre-approved on Isometric Certify platform. Larger capacity than Ankur/Beston.",
  },
  {
    name: "Syncraft CW Gasifier",
    manufacturer: "Syncraft",
    country: "Austria",
    capacityKgH: 800,
    tempRangeC: [600, 850],
    approvals: { puro: "Registry partner", ebc: "Endorsed Provider", isometric: null, verra: null, goldStandard: null },
    notes: "EBC endorsed. Combined heat + biochar output. Strong European track record.",
  },
  {
    name: "Carbofex Carbonizer",
    manufacturer: "Carbofex Oy",
    country: "Finland",
    capacityKgH: 500,
    tempRangeC: [550, 750],
    approvals: { puro: "Registry supplier", ebc: "EBC certified", isometric: null, verra: null, goldStandard: null },
    notes: "Nordic pyrolysis tech. EBC certified. Waste-wood chip focus.",
  },
  {
    name: "THJ1500-1 Rotary",
    manufacturer: "Zhengzhou Dingli New Energy Technology",
    country: "China",
    capacityKgH: 1200,
    tempRangeC: [500, 750],
    approvals: { puro: "Used in certified projects", ebc: null, isometric: null, verra: null, goldStandard: null },
    notes: "Proven rotary carbonization tech used at commercial scale in Latin America (Exomad Green Bolivia, world's largest Puro-certified biochar plant).",
  },
  {
    name: "THJ1200-1 Rotary",
    manufacturer: "Zhengzhou Dingli New Energy Technology",
    country: "China",
    capacityKgH: 800,
    tempRangeC: [500, 700],
    approvals: { puro: "Used in certified projects", ebc: null, isometric: null, verra: null, goldStandard: null },
    notes: "Smaller rotary model. Same manufacturer as THJ1500-1.",
  },
  {
    name: "PYREG P500",
    manufacturer: "PYREG GmbH",
    country: "Germany",
    capacityKgH: 150,
    tempRangeC: [550, 700],
    approvals: { puro: "Vetted Model", ebc: "Endorsed Provider", isometric: null, verra: null, goldStandard: null },
    notes: "Entry-level PYREG unit. Same cross-approval profile as P1500 at smaller scale — suitable for 5-15 kt/yr plants.",
  },
  {
    name: "PYREG PX6000",
    manufacturer: "PYREG GmbH",
    country: "Germany",
    capacityKgH: 6000,
    tempRangeC: [550, 700],
    approvals: { puro: "Vetted Model", ebc: "Endorsed Provider", isometric: null, verra: null, goldStandard: null },
    notes: "Top-of-range PYREG. Industrial mega-scale. Same cross-approval profile. Used by Novocarbo for large facilities.",
  },
  {
    name: "Standard Biocarbon reactor",
    manufacturer: "Standard Biocarbon Corporation",
    country: "USA",
    capacityKgH: 1000,
    tempRangeC: [500, 750],
    approvals: { puro: "Used in certified projects", ebc: null, isometric: null, verra: null, goldStandard: null },
    notes: "US-based proprietary reactor. Used at Standard Biocarbon's Maine facility under Puro.earth certification. Strong option for US projects.",
  },
  {
    name: "Biochar Now reactor",
    manufacturer: "Biochar Now LLC",
    country: "USA",
    capacityKgH: 600,
    tempRangeC: [550, 700],
    approvals: { puro: null, ebc: null, isometric: null, verra: "Used in certified projects", goldStandard: null },
    notes: "Modular batch kiln system. US-based. Used in Verra VCS projects. Good for distributed / low-CAPEX deployments.",
  },
  {
    name: "NGE Biomass Pyrolyzer",
    manufacturer: "NGE (Next Generation Energy)",
    country: "Austria",
    capacityKgH: 600,
    tempRangeC: [500, 750],
    approvals: { puro: null, ebc: "Endorsed Provider", isometric: null, verra: null, goldStandard: null },
    notes: "EBC endorsed. Austrian manufacturer, strong European footprint.",
  },
];

// Approximate CAPEX per tonne of annual biomass capacity (USD/t installed
// capacity). Used by AI to ballpark financial summaries. These are reality
// checks from public data + engineering estimates for mid-scale plants
// (20k-200k tn/year). Plants below 10k or above 500k deviate significantly.
export const CAPEX_BENCHMARK_USD_PER_TN = {
  low: 60,      // Lean build, existing industrial site, simple pre-processing
  typical: 85,  // Greenfield industrial park, standard pre-processing + pyrolysis + storage
  high: 120,    // Full EPC with redundant systems, remote site, extensive civil works
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC DEFINITIONS — the catalog of documents AI generates
// ═══════════════════════════════════════════════════════════════════════════

export type DocFormat = "markdown" | "json";

export type DocDefinition = {
  id: string;
  title: string;
  description: string;
  format: DocFormat;
  /** Category for UI grouping */
  category: "overview" | "technical" | "operational" | "commercial" | "environmental" | "compliance";
  /** Build the system + user prompts for this doc. */
  buildPrompt: (input: ProjectInput) => { system: string; user: string };
  /** If JSON: the schema to enforce. If markdown: undefined. */
  jsonSchema?: Record<string, unknown>;
  /** Relative order in the generated package */
  order: number;
};

export type ProjectInput = {
  projectName: string;
  biomass: {
    name: string;
    elementalComposition?: { C: number; H: number; O: number; N: number; S: number; ash: number; moisture: number };
    source?: string; // e.g., "forestry residues", "agricultural waste"
    /** Optional feedstock id from FEEDSTOCK_DB — used for C_org lookup when
     *  a lab-measured value isn't available. */
    feedstockId?: string;
  };
  capacityTnYear: number;
  country: string; // ISO-2 code
  countryName: string;
  location?: string; // free-text region
  offtakerType: "investor" | "certifier" | "both";
  targetMethodology?: "puro-earth" | "isometric" | "ebc" | "verra-vm0044" | "gold-standard" | "rainbow-standard";
  /** Deterministically computed carbon mass balance. Populated by the
   *  router before generation kicks off; every prompt embeds these numbers
   *  verbatim instead of recomputing from `capacityTnYear`. Optional in
   *  the type so tests and legacy paths keep compiling, but production
   *  callers MUST set it. See _core/carbonBalance.ts. */
  carbonBalance?: import("./carbonBalance").CarbonBalanceResult;
  // Output language for the generated docs ("en" | "es"). Falls back to "en"
  // when undefined so existing behaviour stays the same for callers that
  // haven't been updated.
  lang?: string;
  // Optional custom methodology — if provided, AI Builder generates an
  // additional Custom Methodology Compliance doc evaluating the project
  // against the user's own criteria list.
  customMethodology?: {
    id: number;
    name: string;
    description: string;
    basedOn: string | null;
    criteria: Array<{ id: string; label: string; description: string; thresholdNote?: string }>;
  };
};

function isSpanishLang(lang: string | null | undefined): boolean {
  return (lang ?? "en").toLowerCase().slice(0, 2) === "es";
}

function looksSpanish(text: string): boolean {
  return /[áéíóúñ]|\b(el|la|los|las|para|pendiente|proyecto|ubicación|metodología|revisión)\b/i.test(text);
}

function normalizePendingLabel(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/^[\s:;,\-.–—]+|[\s:;,\-.–—]+$/g, "")
    .trim();
}

function pendingReplacement(raw: string, spanish: boolean): string {
  const label = normalizePendingLabel(raw);
  if (!label) return spanish ? "pendiente de confirmar por el desarrollador" : "pending developer confirmation";
  return spanish
    ? `pendiente de confirmar por el desarrollador (${label})`
    : `pending developer confirmation (${label})`;
}

function sanitizeFreeText(text: string, lang: string | null | undefined, docId?: string): string {
  const spanish = lang ? isSpanishLang(lang) : looksSpanish(text);
  let out = text;

  out = out.replace(
    /DRAFT\s+[—-]\s+AI-GENERATED,\s+REQUIRES HUMAN REVIEW/gi,
    spanish ? "BORRADOR — GENERADO CON IA, REQUIERE REVISIÓN HUMANA" : "DRAFT — AI-GENERATED, REQUIRES HUMAN REVIEW",
  );
  out = out.replace(/\[TO BE CONFIRMED:\s*([^\]]+)\]/gi, (_, raw: string) => pendingReplacement(raw, spanish));
  out = out.replace(/\[TO BE CONFIRMED\]/gi, spanish ? "pendiente de confirmar por el desarrollador" : "pending developer confirmation");
  out = out.replace(/\[TO VERIFY WITH LOCAL COUNSEL:\s*([^\]]+)\]/gi, (_, raw: string) => {
    const label = normalizePendingLabel(raw);
    return spanish
      ? `pendiente de validar con asesoría legal local${label ? ` (${label})` : ""}`
      : `pending validation with local counsel${label ? ` (${label})` : ""}`;
  });
  out = out.replace(/\[([^\]]*TO BE IDENTIFIED[^\]]*)\]/gi, spanish ? "por identificar durante la debida diligencia local" : "to be identified during local due diligence");
  out = out.replace(/\[FACTOR TBD per local grid mix\]/gi, spanish ? "factor de red pendiente de validación local" : "grid factor pending local validation");
  out = out.replace(/Microsoft High-Quality CDR criteria/gi, spanish ? "expectativas habituales de diligencia debida para CDR de alta calidad" : "typical high-quality CDR due-diligence expectations");
  out = out.replace(/Criterios de CDR de Alta Calidad de Microsoft/gi, spanish ? "expectativas habituales de diligencia debida para CDR de alta calidad" : "typical high-quality CDR due-diligence expectations");
  out = out.replace(/Microsoft CDR DD|Microsoft BiCRS DD/gi, spanish ? "procesos de due diligence de compradores de CDR" : "CDR buyer due-diligence processes");
  out = out.replace(/\b(inversores sofisticados|inversor sofisticado)\b/gi, spanish ? "potenciales financiadores y revisores externos" : "potential external funders and reviewers");
  out = out.replace(/\b(sophisticated investors?|sophisticated investor)\b/gi, spanish ? "potential external funders and reviewers" : "potential external funders and reviewers");
  out = out.replace(/\bcompradores sofisticados de CDR\b/gi, spanish ? "compradores corporativos o institucionales de CDR" : "corporate or institutional CDR buyers");
  out = out.replace(/\b(board-ready|investor-grade|bankable|turnkey|state-of-the-art|best-in-class|world-class)\b/gi, (_, raw: string) => {
    const token = String(raw).toLowerCase();
    if (spanish) {
      if (token === "board-ready") return "útil para revisión ejecutiva";
      if (token === "investor-grade") return "preliminar para revisión de inversores";
      if (token === "bankable") return "todavía sujeto a debida diligencia técnica, legal y comercial";
      if (token === "turnkey") return "de alcance integral por confirmar";
      return "todavía sujeto a validación adicional";
    }
    if (token === "board-ready") return "useful for executive review";
    if (token === "investor-grade") return "preliminary for investor review";
    if (token === "bankable") return "still subject to technical, legal, and commercial diligence";
    if (token === "turnkey") return "full-scope still to be confirmed";
    return "still subject to further validation";
  });
  out = out.replace(/\b(submission-ready|ready for submission|ready-to-submit)\b/gi, spanish ? "en borrador para revisión interna" : "draft-stage for internal review");
  out = out.replace(/\b(fully permitted|fully approved)\b/gi, spanish ? "pendiente de validación regulatoria final" : "still pending final regulatory confirmation");
  out = out.replace(/\b(guaranteed?|ensured?)\b/gi, spanish ? "previsto, sujeto a verificación" : "planned, subject to verification");
  out = out.replace(/\bSteering Forum\b/gi, spanish ? "comité directivo provisional" : "provisional steering forum");
  out = out.replace(/\bSteering Committee\b/gi, spanish ? "comité directivo provisional" : "steering committee");
  out = out.replace(/\bPM Lead\b/gi, spanish ? "liderazgo de gestión del proyecto" : "project-management lead");
  out = out.replace(/\bTechnical Review Panel\b/gi, spanish ? "instancia de revisión técnica" : "technical review function");
  out = out.replace(/\bQA Role\b/gi, spanish ? "rol de aseguramiento de calidad" : "quality-assurance role");
  out = out.replace(/\bConstruction Team\b/gi, spanish ? "equipo de construcción" : "construction team");
  out = out.replace(/\bOperations Team\b/gi, spanish ? "equipo de operaciones" : "operations team");
  out = out.replace(/\bCertification Support Team\b/gi, spanish ? "equipo de soporte de certificación" : "certification support team");
  out = out.replace(/\bFront-End Loading Engineering\b/gi, spanish ? "ingeniería FEL (Front-End Loading)" : "front-end loading engineering");
  out = out.replace(/\bhigh-growth\b/gi, spanish ? "todavía emergente" : "still emerging");
  out = out.replace(/\bdue diligence\b/gi, spanish ? "diligencia debida" : "due diligence");
  out = out.replace(/\(\s*Steering Committee\s*\)/gi, spanish ? "" : "(steering committee)");
  out = out.replace(/\(\s*QA\s*\)/gi, spanish ? "(aseguramiento de calidad)" : "(QA)");
  out = out.replace(/acceso confirmado a biomasa/gi, spanish ? "acceso por validar a biomasa" : "biomass access still to be validated");
  out = out.replace(/se ubicará en Argentina, en una región con acceso confirmado/gi, spanish ? "se plantea para Argentina, en una región aún por definir y con acceso a biomasa por validar" : "is proposed for Argentina, in a region still to be defined and with biomass access still to be validated");

  if (docId === "risk-register" || docId === "implementation-strategy" || docId === "pdd-pre-fill") {
    out = out.replace(
      /\(?\s*(?:Microsoft|Frontier|Shell|Altitude)(?:,\s*(?:Microsoft|Frontier|Shell|Altitude))*\s*\)?/gi,
      spanish ? "potenciales compradores corporativos de CDR por confirmar" : "potential corporate CDR buyers pending confirmation",
    );
    out = out.replace(
      /\(?\s*(?:BNP Paribas|South Pole|Ceezer|Patch)(?:,\s*(?:BNP Paribas|South Pole|Ceezer|Patch))*\s*\)?/gi,
      spanish ? "intermediarios o compradores climáticos por confirmar" : "climate-market intermediaries or buyers pending confirmation",
    );
  }

  out = out.replace(/Alineación con los expectativas/gi, "Alineación con expectativas");
  out = out.replace(/pendiente de confirmar por el desarrollador\s+potenciales compradores corporativos de CDR por confirmar/gi, "potenciales compradores corporativos de CDR aún por confirmar");
  out = out.replace(/\bej\.?\s*potenciales compradores corporativos de CDR por confirmar/gi, "potenciales compradores corporativos de CDR aún por confirmar");
  out = out.replace(/\(\s*potenciales compradores corporativos de CDR aún por confirmar,\s*/gi, "potenciales compradores corporativos de CDR aún por confirmar, ");
  out = out.replace(/\(ej:\s*potenciales compradores corporativos de CDR aún por confirmar\)/gi, "(potenciales compradores corporativos de CDR aún por confirmar)");
  out = out.replace(/empresas líderes en descarbonización\s+potenciales compradores corporativos de CDR aún por confirmar/gi, "potenciales compradores corporativos de CDR aún por confirmar");

  if (docId === "executive-summary") {
    out = out.replace(/^\*\*Fecha:\*\*.*(?:\r?\n)?/m, "");
  }

  return out.replace(/\n{3,}/g, "\n\n").trim();
}

function sanitizeJsonValue(value: unknown, lang: string | null | undefined, docId?: string): unknown {
  if (typeof value === "string") return sanitizeFreeText(value, lang, docId);
  if (Array.isArray(value)) return value.map((item) => sanitizeJsonValue(item, lang, docId));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [key, sanitizeJsonValue(val, lang, docId)]),
    );
  }
  return value;
}

function sanitizeMethodologyComplianceDoc(value: any, lang: string | null | undefined): any {
  if (!value || typeof value !== "object") return value;
  const spanish = lang ? isSpanishLang(lang) : looksSpanish(JSON.stringify(value));
  if (typeof value.bestFitMethodology === "string") {
    value.rationale = spanish
      ? `${value.bestFitMethodology} aparece hoy como el punto de partida más sólido dentro de este borrador, pero la conclusión sigue condicionada a datos pendientes como validación de feedstock, resultados de laboratorio, definición final de tecnología y plan de MRV. Tómalo como orientación preliminar, no como una recomendación cerrada de certificación.`
      : `${value.bestFitMethodology} currently appears to be the strongest starting point in this draft, but the conclusion still depends on missing inputs such as feedstock validation, lab results, final technology selection, and the MRV plan. Treat this as preliminary guidance, not a final certification recommendation.`;
  }
  return value;
}

function roundFinancialFigure(value: number): number {
  if (!Number.isFinite(value)) return value;
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return Math.round(value / 10_000) * 10_000;
  if (abs >= 100_000) return Math.round(value / 1_000) * 1_000;
  if (abs >= 10_000) return Math.round(value / 100) * 100;
  return Math.round(value * 10) / 10;
}

function translateFinancialCategory(raw: string, spanish: boolean): string {
  if (!spanish) return raw;
  const normalized = raw.trim().toLowerCase();
  if (normalized.startsWith("equipment & machinery")) return "Equipos y maquinaria";
  if (normalized.startsWith("certification") || normalized.includes("mrv")) return "Certificación, auditoría y MRV";
  const map: Record<string, string> = {
    "land": "Terreno",
    "infrastructure & civil works": "Infraestructura y obras civiles",
    "equipment & machinery — pyrolyzer + pre-processing + post-processing + electrical": "Equipos y maquinaria — pirólisis, pretratamiento, postratamiento y sistema eléctrico",
    "engineering & permits": "Ingeniería y permisos",
    "commissioning & startup": "Puesta en marcha y arranque",
    "contingency": "Contingencia",
    "feedstock procurement": "Abastecimiento de biomasa",
    "labor": "Mano de obra",
    "maintenance & spares": "Mantenimiento y repuestos",
    "electricity & utilities": "Electricidad y servicios",
    "certification, audit, mrv": "Certificación, auditoría y MRV",
    "insurance & admin": "Seguros y administración",
  };
  return map[normalized] ?? raw;
}

function sanitizeFinancialSummaryDoc(value: any, lang: string | null | undefined): any {
  if (!value || typeof value !== "object") return value;
  const spanish = lang ? isSpanishLang(lang) : looksSpanish(JSON.stringify(value));

  if (value.capex?.totalUsd != null) value.capex.totalUsd = roundFinancialFigure(Number(value.capex.totalUsd));
  if (Array.isArray(value.capex?.breakdown)) {
    value.capex.breakdown = value.capex.breakdown.map((entry: any) => ({
      ...entry,
      category: typeof entry?.category === "string" ? translateFinancialCategory(entry.category, spanish) : entry?.category,
      usd: entry?.usd != null ? roundFinancialFigure(Number(entry.usd)) : entry?.usd,
      percentage: entry?.percentage != null ? Math.round(Number(entry.percentage) * 10) / 10 : entry?.percentage,
      notes: typeof entry?.notes === "string" ? sanitizeFreeText(entry.notes, lang, "financial-summary") : entry?.notes,
    }));
  }
  if (typeof value.capex?.notes === "string") {
    value.capex.notes = sanitizeFreeText(value.capex.notes, lang, "financial-summary");
  }

  if (value.opex?.annualTotalUsd != null) value.opex.annualTotalUsd = roundFinancialFigure(Number(value.opex.annualTotalUsd));
  if (Array.isArray(value.opex?.breakdown)) {
    value.opex.breakdown = value.opex.breakdown.map((entry: any) => ({
      ...entry,
      category: typeof entry?.category === "string" ? translateFinancialCategory(entry.category, spanish) : entry?.category,
      annualUsd: entry?.annualUsd != null ? roundFinancialFigure(Number(entry.annualUsd)) : entry?.annualUsd,
      percentage: entry?.percentage != null ? Math.round(Number(entry.percentage) * 10) / 10 : entry?.percentage,
      notes: typeof entry?.notes === "string" ? sanitizeFreeText(entry.notes, lang, "financial-summary") : entry?.notes,
    }));
  }

  if (value.revenueStack) {
    for (const key of ["annualTotalUsdYear3", "carbonCreditsAnnualTco2e", "carbonCreditPriceUsdPerTon", "carbonCreditAnnualRevenueUsd", "biocharAnnualTonnes", "biocharPriceUsdPerTonne", "biocharAnnualRevenueUsd"] as const) {
      if (value.revenueStack[key] != null) value.revenueStack[key] = roundFinancialFigure(Number(value.revenueStack[key]));
    }
    if (typeof value.revenueStack.otherRevenueStreams === "string" && spanish) {
      value.revenueStack.otherRevenueStreams = "bio-oil [opcional], recuperación de calor [si existe un usuario industrial colocalizado], cenizas de subproducto [menor]";
    }
  }

  if (value.economics) {
    if (value.economics.paybackYears != null) value.economics.paybackYears = roundFinancialFigure(Number(value.economics.paybackYears));
    if (value.economics.irrPercentage != null) value.economics.irrPercentage = roundFinancialFigure(Number(value.economics.irrPercentage));
    if (value.economics.npvUsd != null) value.economics.npvUsd = roundFinancialFigure(Number(value.economics.npvUsd));
    if (typeof value.economics.notes === "string") {
      value.economics.notes = sanitizeFreeText(value.economics.notes, lang, "financial-summary");
    }
  }

  if (value.additionality) {
    if (value.additionality.unsubsidizedCostUsd != null) value.additionality.unsubsidizedCostUsd = roundFinancialFigure(Number(value.additionality.unsubsidizedCostUsd));
    if (value.additionality.carbonRevenueShareOfTotalPercentage != null) value.additionality.carbonRevenueShareOfTotalPercentage = roundFinancialFigure(Number(value.additionality.carbonRevenueShareOfTotalPercentage));
    if (typeof value.additionality.narrative === "string") {
      value.additionality.narrative = sanitizeFreeText(value.additionality.narrative, lang, "financial-summary");
    }
  }

  if (typeof value.disclaimer === "string") {
    value.disclaimer = sanitizeFreeText(value.disclaimer, lang, "financial-summary");
  } else if (spanish) {
    value.disclaimer = "Estimaciones de orden de magnitud. Deben reemplazarse con CAPEX cotizado por proveedores, OPEX específico del sitio y supuestos de ingresos validados antes de cualquier decisión de inversión o uso contractual.";
  }

  return value;
}

function sanitizePddPreFillDoc(value: any, lang: string | null | undefined): any {
  if (!value || !Array.isArray(value.workstreams)) return value;
  const spanish = lang ? isSpanishLang(lang) : looksSpanish(JSON.stringify(value));
  const cannedAnswers: Record<string, string> = spanish
    ? {
        projectDeveloper: "El desarrollador del proyecto, la sociedad vehículo y los responsables clave siguen pendientes de confirmación. Esta sección debe completarse con nombre legal, responsables de ingeniería, permisos, financiamiento y operación, además de una breve experiencia relevante verificable.",
        commercialPartners: "Los socios comerciales todavía no están definidos. Conviene completar esta sección por categoría: suministro de biomasa, cliente de biochar, comprador de créditos y apoyo logístico, indicando para cada uno si está en exploración, negociación o cierre.",
        technicalPartners: "Los socios técnicos aún deben confirmarse. Aquí corresponde identificar la firma de ingeniería FEL/EPC, el proveedor final de tecnología de pirólisis, los contratistas de obra y los asesores de certificación y LCA que efectivamente participarán en el proyecto.",
      }
    : {
        projectDeveloper: "The project developer, SPV, and key responsible parties are still pending confirmation. This section should be completed with the legal entity name, engineering, permitting, financing, and operations leads, plus a brief verifiable track record.",
        commercialPartners: "Commercial partners are not yet defined. Complete this section by category: feedstock supply, biochar customer, carbon-credit buyer, and logistics support, indicating whether each is still exploratory, under negotiation, or close to signature.",
        technicalPartners: "Technical partners still need to be confirmed. This section should identify the FEL/EPC engineering firm, the final pyrolysis technology supplier, civil/electrical contractors, and the certification/LCA advisors who will actually work on the project.",
      };

  for (const ws of value.workstreams) {
    if (!Array.isArray(ws?.answers)) continue;
    for (const answer of ws.answers) {
      if (typeof answer?.questionId !== "string" || typeof answer?.draftAnswer !== "string") continue;
      if (cannedAnswers[answer.questionId]) {
        answer.draftAnswer = cannedAnswers[answer.questionId];
        answer.requiresUserInput = true;
        answer.confidence = "LOW";
      }
    }
  }

  return value;
}

function sanitizeGeneratedContent(
  docDef: DocDefinition,
  content: string,
  lang: string | null | undefined,
): string {
  if (!content) return content;

  if (docDef.format === "json") {
    try {
      let parsed = JSON.parse(content);
      parsed = sanitizeJsonValue(parsed, lang, docDef.id);
      if (docDef.id === "methodology-compliance") parsed = sanitizeMethodologyComplianceDoc(parsed, lang);
      if (docDef.id === "financial-summary") parsed = sanitizeFinancialSummaryDoc(parsed, lang);
      if (docDef.id === "pdd-pre-fill") parsed = sanitizePddPreFillDoc(parsed, lang);
      return JSON.stringify(parsed);
    } catch {
      return sanitizeFreeText(content, lang, docDef.id);
    }
  }

  return sanitizeFreeText(content, lang, docDef.id);
}

// Helper: build a grounding block with all curated data
function groundingBlock(input: ProjectInput): string {
  const countryCode = input.country.toUpperCase();
  const gridEf = GRID_EMISSION_FACTORS[countryCode];
  const gridLine = gridEf
    ? `Grid electricity emission factor for ${input.countryName} (${input.country}): ${gridEf.factor} tCO2e/kWh (source: ${gridEf.source})`
    : `Grid electricity emission factor for ${input.countryName}: not pre-loaded; use continental average and flag as APPROXIMATION.`;

  const regAuth = REGULATORY_AUTHORITIES[countryCode];
  const regBlock = regAuth
    ? `\n\nRegulatory authorities for ${input.countryName} — use these verbatim when drafting permit matrix and community sections:
- Environmental Impact Assessment: ${regAuth.eia}
- Zoning / Land Use: ${regAuth.zoning}
- Construction: ${regAuth.construction}
- Operating permit: ${regAuth.operating}
- Utility / Grid connection: ${regAuth.utility}
- Legal framework: ${regAuth.legalFramework}`
    : `\n\nRegulatory authorities for ${input.countryName} are not pre-loaded. State clearly that the final authority names must be validated with local counsel and do not invent institution names.`;

  // Select pyrolyzers relevant to this capacity. ~8000 operating hours/year.
  const targetKgH = Math.round((input.capacityTnYear * 1000) / 8000);
  const relevant = PYROLYZER_CATALOG.filter((p) => p.capacityKgH >= targetKgH * 0.3 && p.capacityKgH <= targetKgH * 1.5);
  const pyrolyzerList = (relevant.length > 0 ? relevant : PYROLYZER_CATALOG.slice(0, 4))
    .map(
      (p) =>
        `- ${p.name} (${p.manufacturer}, ${p.country}): ${p.capacityKgH} kg/h biochar output, ${p.tempRangeC[0]}-${p.tempRangeC[1]}°C. Approvals: ${[
          p.approvals.puro && `Puro: ${p.approvals.puro}`,
          p.approvals.ebc && `EBC: ${p.approvals.ebc}`,
          p.approvals.isometric && `Isometric: ${p.approvals.isometric}`,
        ]
          .filter(Boolean)
          .join(", ") || "none formal"}. ${p.notes}`,
    )
    .join("\n");

  return `## GROUNDING DATA (use these real numbers; do not invent)

${gridLine}${regBlock}

CAPEX benchmark for mid-scale biochar plants (20k-200k tn/year biomass input):
- Lean build: ~USD 60 per tonne of annual biomass capacity
- Typical greenfield: ~USD 85 per tonne of annual biomass capacity
- Full EPC with redundancy: ~USD 120 per tonne

OPEX major contributors (% of total annual OPEX, typical):
- Feedstock procurement: 30-45%
- Labor: 20-30%
- Maintenance & spares: 10-15%
- Electricity & utilities: 8-12%
- Certification, audit, MRV: 3-5%
- Other (insurance, admin): 5-10%

Pyrolysis equipment options matched to your capacity (${input.capacityTnYear} tn/yr ≈ ${targetKgH} kg/h biochar output):
${pyrolyzerList}

Carbon credit factor: derive per project from the CARBON BALANCE grounding block above (biochar C_org × 44/12 × permanence). DO NOT use the generic "3 tCO2e per tonne biochar" figure — it is a theoretical ceiling and inflates real-world CORCs.

Biochar yield: 25-35% by weight on DRY biomass (NOT wet). Typical: 30%. Wet biomass must be corrected for moisture first: dry = wet × (1 − moisture%).

Critical: when citing numbers, explicitly note if they are "estimated", "approximation" or "benchmark". Do NOT present generated figures as contractually binding.`;
}

// Helper: build the common system instruction that all prompts share
function commonSystemInstruction(input: ProjectInput): string {
  const draftBanner = isSpanishLang(input.lang)
    ? "BORRADOR — GENERADO CON IA, REQUIERE REVISIÓN HUMANA"
    : "DRAFT — AI-GENERATED, REQUIRES HUMAN REVIEW";
  return `You are supporting an early-stage biochar carbon removal project draft for a cross-functional team working across development, engineering, permitting, finance, and certification.

You are writing a document that may be reviewed by ${input.offtakerType === "investor" ? "a carbon-market investor performing due diligence" : input.offtakerType === "certifier" ? "a technical auditor from a certification body" : "both investors performing due diligence and technical auditors from certification bodies"}. Your writing is professional, specific, and avoids marketing fluff. You ground every claim in evidence or flag it as a pending item requiring user input.

CRITICAL RULES:
1. Use ONLY the equipment names listed in the grounding data. Do not invent manufacturers or models.
2. Use ONLY the emission factors from the grounding data. If a factor is missing, state that the local grid factor remains pending validation.
3. When information is missing, do NOT use bracketed placeholders like "[TO BE CONFIRMED]". Instead write a short neutral note stating that the item is pending developer confirmation and explain what is missing.
4. Do NOT invent named buyers, NGOs, team members, exact addresses, signed agreements, operating history, or specific calendar dates. If unknown, say so plainly.
5. Do NOT describe the project as certified, contracted, approved, submission-ready, operational, or validated unless the input explicitly proves it.
6. Keep the tone sober and concise. Avoid superlatives, sales language, "market leadership", and certainty you cannot support.
7. Mark every document as "${draftBanner}" at the top.
8. Be explicit about what is estimated, benchmark-based, measured, and still pending verification.
9. Do NOT use phrases such as "bankable", "investor-grade", "board-ready", "world-class", "state-of-the-art", or "best-in-class" unless you immediately restate them as preliminary and still subject to diligence.
10. Use relative sequencing or ranges for schedules unless the user supplied a real project schedule. Avoid exact dates, calendar quarters, or implied commissioning commitments.
11. When discussing economics, use conservative benchmark ranges and state that they are placeholder assumptions until vendor quotes, site conditions, and commercialization terms are confirmed.
12. If you recommend a technology, methodology, or execution path, frame it as a provisional working hypothesis and state the main validation gaps.
13. If the output language is Spanish, translate section subtitles, governance labels, team names, and role labels into natural Spanish instead of leaving English placeholders or job titles.
14. Carbon mass balance is COMPUTED IN CODE and provided below as a fixed grounding block. Every reference to biochar output, CO₂ sequestered, CORC volumes, or the tCO₂e-per-tonne factor MUST quote those numbers exactly. Do NOT re-derive them from biomass capacity, and do NOT use the generic "3.0 tCO₂e per tonne biochar" figure — the correct project-specific factor is in the grounding block.

${input.carbonBalance ? input.carbonBalance.groundingBlock + "\n\n" : ""}${groundingBlock(input)}${buildLangDirective(input.lang)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// DOC 1: Executive Summary (markdown)
// ═══════════════════════════════════════════════════════════════════════════

const executiveSummary: DocDefinition = {
  id: "executive-summary",
  title: "Executive Summary",
  description: "2-page overview of the project — the doc an investor or certifier reads first.",
  format: "markdown",
  category: "overview",
  order: 1,
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate a 2-page Executive Summary for the following biochar carbon removal project:

- Project name: ${input.projectName}
- Biomass: ${input.biomass.name}${input.biomass.source ? ` (${input.biomass.source})` : ""}
- Capacity: ${input.capacityTnYear.toLocaleString()} tonnes/year of biomass input
- Location: ${input.location ?? `(region in ${input.countryName})`}, ${input.countryName}
- Target methodology: ${input.targetMethodology ?? "multi-methodology (Puro.earth primary)"}
- Audience: ${input.offtakerType}

Structure the doc as Markdown with the following sections:
1. Project Overview (2-3 paragraphs)
2. Technology Summary (1 paragraph: pyrolysis reactor type, process temperature, yield)
3. Carbon Impact (estimated annual biochar production and tCO2e/yr, plus an illustrative 15-year scenario only if clearly labeled as assumption-based and non-contracted)
4. Feedstock Strategy (1 paragraph: sourcing strategy, sustainability)
5. Financial Snapshot (CAPEX range, OPEX range, revenue stack high-level)
6. Project Development Path (high-level milestones in relative sequence, not fixed dates)
7. Key Risks & Mitigations (top 3 only, brief)
8. Immediate Validation Priorities for [Audience]

Keep total length around 600-900 words. Use concrete numbers from the grounding data. Cite the grid emission factor explicitly. If more than one pyrolyzer could fit, name a preferred option and state that vendor due diligence is still required. Do not include a date line. Do not invent counterparties, buyer names, project history, or exact milestone dates. If location or market channel is still open, describe it generically as pending confirmation. Flag every estimate with clear uncertainty language. Avoid promotional claims and do not imply the package is ready for investment approval or certification submission.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 2: Technical Overview (markdown)
// ═══════════════════════════════════════════════════════════════════════════

const technicalOverview: DocDefinition = {
  id: "technical-overview",
  title: "Technical Overview",
  description: "Process description, key parameters, equipment selection rationale.",
  format: "markdown",
  category: "technical",
  order: 2,
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate a Technical Overview document for the biochar project:
- Biomass: ${input.biomass.name}${input.biomass.elementalComposition ? `\n  - Elemental: C=${input.biomass.elementalComposition.C}%, H=${input.biomass.elementalComposition.H}%, O=${input.biomass.elementalComposition.O}%, N=${input.biomass.elementalComposition.N}%, ash=${input.biomass.elementalComposition.ash}%, moisture=${input.biomass.elementalComposition.moisture}%` : ""}
- Capacity: ${input.capacityTnYear.toLocaleString()} tn/yr biomass input
- Country: ${input.countryName}

Structure:
1. Process Concept (1 paragraph)
2. Block Flow Diagram (text description: Biomass reception → Size reduction → Drying → Pelletizing → Pyrolysis → Cooling → Packaging → Dispatch)
3. Key Process Parameters (table with columns: Parameter | Typical Value | Target Range | Measurement Frequency)
   Include: pyrolysis temperature, residence time, biochar yield, moisture target of biomass, biochar target properties (H/Corg, fixed C, ash)
4. Technology Selection (explain pyrolyzer choice from grounding list — justify based on capacity, country, methodology)
5. Energy Integration (explain syngas recovery, thermal autosufficiency threshold, electricity imported vs self-generated)
6. Mass Balance Summary (tonnes/year throughput at each stage)
7. Operational Parameters (shifts, availability, annual operating hours ~8000h, workforce estimate)

Use markdown tables for specs. Length: 1000-1500 words.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 3: Equipment BOM (JSON structured)
// ═══════════════════════════════════════════════════════════════════════════

const equipmentBom: DocDefinition = {
  id: "equipment-bom",
  title: "Equipment Bill of Materials (BOM)",
  description: "Structured equipment list with specs, quantities, power, and rough prices.",
  format: "json",
  category: "technical",
  order: 3,
  jsonSchema: {
    type: "object",
    properties: {
      summary: {
        type: "object",
        properties: {
          totalConnectedLoadKw: { type: "number" },
          demandLoadKw: { type: "number" },
          mainTransformerKva: { type: "number" },
          estimatedEquipmentCapexUsd: { type: "number" },
          notes: { type: "string" },
        },
        required: ["totalConnectedLoadKw", "demandLoadKw", "mainTransformerKva", "estimatedEquipmentCapexUsd", "notes"],
      },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            tag: { type: "string", description: "Equipment tag e.g. CH-01, HM-02" },
            category: { type: "string", enum: ["pre-processing", "drying", "pelletizing", "pyrolysis", "post-processing", "auxiliary", "electrical"] },
            name: { type: "string" },
            modelOrType: { type: "string" },
            quantity: { type: "integer" },
            capacityDescription: { type: "string", description: "e.g. '4 ton/h' or '500 kg/batch'" },
            powerKwEach: { type: "number" },
            voltageClass: { type: "string", description: "e.g. '380V 3P', '13.2 kV'" },
            totalPowerKw: { type: "number" },
            estimatedCostUsd: { type: "number", description: "Rough order-of-magnitude" },
            supplierSuggestion: { type: "string", description: "Suggested supplier or category — must be from grounding data if referring to pyrolyzer" },
            notes: { type: "string" },
          },
          required: ["tag", "category", "name", "modelOrType", "quantity", "capacityDescription", "powerKwEach", "voltageClass", "totalPowerKw", "estimatedCostUsd", "supplierSuggestion", "notes"],
        },
      },
    },
    required: ["summary", "items"],
  },
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate a complete Equipment Bill of Materials (BOM) for a biochar plant with:
- Biomass: ${input.biomass.name}
- Capacity: ${input.capacityTnYear.toLocaleString()} tn/yr biomass input (≈${Math.round((input.capacityTnYear * 1000) / 8000)} kg/h continuous)

Return JSON with:
- summary: totalConnectedLoadKw, demandLoadKw (80% of connected), mainTransformerKva (1.3-1.5x demand), estimatedEquipmentCapexUsd (sum of items + 15% contingency), notes (1-2 sentence summary).
- items: array of 15-25 equipment entries covering:
  * Pre-processing: drum chipper (1x), belt conveyors (3-5x), hammer mills (2-4x, 80-150 kW each), storage silos (2-4x)
  * Drying: rotary dryers (1-2x, 40-80 kW each), cyclone separators
  * Pelletizing: ring die pelletizers (2-4x, 150-200 kW each — only if biomass requires pelletizing)
  * Pyrolysis: CHOOSE pyrolyzer MODEL from grounding list based on capacity. Quantity calculated from kg/h requirement (round up). Do NOT invent other models.
  * Post-processing: cooling conveyors (6-8m length), biochar storage silos
  * Auxiliary: gas stove/burner, purification fans, cooling towers, dust collectors
  * Electrical: main transformer (13.2kV/380V), main switchboard, 2-3 MCCs, backup generator (300-400 kW)

For each item include: tag (e.g. CH-01), category, name, modelOrType, quantity, capacityDescription, powerKwEach, voltageClass (typically "380V 3P"), totalPowerKw, estimatedCostUsd (based on the CAPEX benchmarks in grounding), supplierSuggestion (generic like "local steel fabricator" unless it's the pyrolyzer — for pyrolyzer use a name from grounding), notes.

For pyrolyzers, ALWAYS pick from the grounding catalog — never invent. Prefer pyrolyzers that are pre-approved by the target methodology if specified.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 4: Risk Register (JSON structured)
// ═══════════════════════════════════════════════════════════════════════════

const riskRegister: DocDefinition = {
  id: "risk-register",
  title: "Risk Register",
  description: "11-category risk matrix aligned with Puro / Microsoft DD / Verra VM0044 expectations.",
  format: "json",
  category: "compliance",
  order: 4,
  jsonSchema: {
    type: "object",
    properties: {
      risks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["Financial", "Management Capacity", "Social", "Political", "Regulatory / Permitting", "Natural", "Reversal", "Quantitative", "Commercial", "Site Control", "Technology"] },
            description: { type: "string" },
            likelihood: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            impact: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            riskLevel: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            mitigation: { type: "string" },
            owner: { type: "string", description: "Role responsible for monitoring this risk, e.g. 'Project Developer', 'O&M Team'" },
            supportingDoc: { type: "string", description: "Which project doc supports this risk analysis, e.g. 'LCA Report', 'Feedstock Agreement'" },
          },
          required: ["type", "description", "likelihood", "impact", "riskLevel", "mitigation", "owner", "supportingDoc"],
        },
      },
    },
    required: ["risks"],
  },
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate a complete Risk Register for a biochar project in ${input.countryName}, processing ${input.biomass.name} at ${input.capacityTnYear.toLocaleString()} tn/yr.

Return JSON with a "risks" array containing ONE entry for EACH of these 11 risk types (in this order):
1. Financial
2. Management Capacity
3. Social
4. Political
5. Regulatory / Permitting
6. Natural (wildfires, pests, climate events affecting biomass supply)
7. Reversal (unintentional release of sequestered carbon)
8. Quantitative (measurement uncertainty in carbon removal volumes)
9. Commercial (dependency on long-term offtake agreements)
10. Site Control
11. Technology

For each risk:
- description: 1-2 sentences specific to THIS project (biomass + country + capacity). Reference country-specific risks where relevant.
- likelihood + impact + riskLevel: LOW/MEDIUM/HIGH ratings
- mitigation: 2-3 sentence mitigation plan, specific and actionable
- owner: the role responsible (Project Developer, Technical Lead, O&M Team, Commercial Lead, etc.)
- supportingDoc: the project doc that supports this risk analysis

Be specific to ${input.countryName} when the grounding data supports it. If a country-specific authority, political dynamic, natural hazard, or legal reference is uncertain, describe it as a validation item instead of inventing it. Do not imply that permits, site control, feedstock contracts, insurance, or commercial agreements already exist unless the input proves it.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 5: Permit Matrix (JSON structured, country-specific)
// ═══════════════════════════════════════════════════════════════════════════

const permitMatrix: DocDefinition = {
  id: "permit-matrix",
  title: "Permit Matrix",
  description: "Country-specific matrix of permits, issuing authorities, and timelines.",
  format: "json",
  category: "compliance",
  order: 5,
  jsonSchema: {
    type: "object",
    properties: {
      country: { type: "string" },
      permits: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string", enum: ["Environmental", "Land Use / Zoning", "Construction", "Operating", "Utility / Grid", "Industrial Park", "Fiscal / Tax"] },
            name: { type: "string" },
            description: { type: "string" },
            issuingAuthority: { type: "string" },
            legalReference: { type: "string", description: "Law/regulation citation if known" },
            typicalTimelineDays: { type: "integer", description: "Typical issuance timeline in days" },
            feesEstimateUsd: { type: "number" },
            prerequisites: { type: "string" },
            criticalPathImpact: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"], description: "Impact on project timeline if delayed" },
            notes: { type: "string" },
          },
          required: ["category", "name", "description", "issuingAuthority", "legalReference", "typicalTimelineDays", "feesEstimateUsd", "prerequisites", "criticalPathImpact", "notes"],
        },
      },
      disclaimer: { type: "string", description: "Note that this is AI-generated and must be verified with local counsel" },
    },
    required: ["country", "permits", "disclaimer"],
  },
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate a Permit Matrix for a biochar plant (${input.capacityTnYear.toLocaleString()} tn/yr biomass input) in ${input.countryName}.

Return JSON with "country" = "${input.countryName}" and a "permits" array containing 6-10 entries covering:
- Environmental Impact Assessment (name the national or provincial authority — for Argentina = ICAA in Corrientes / OPDS in Buenos Aires / etc.; for Mexico = SEMARNAT; for Brazil = IBAMA or state equivalents; for Colombia = ANLA; for Chile = SEA; for US = EPA + state; for EU = Member State EIA)
- Land Use / Zoning approval
- Construction Permit (local municipality)
- Operating Permit
- Utility / Grid Connection Permit (name the utility for the target region if known)
- Industrial Park Entry (if applicable)
- Water / Wastewater permit
- Air Emissions permit (if the EIA doesn't cover it)

For each: name the authority only when it appears in the grounding data or is a high-confidence national/local authority for ${input.countryName}. Cite known laws only when you are confident. Use conservative timeline ranges where appropriate, rough fees in USD, prerequisites, critical path impact, and notes.

If you are uncertain about a specific authority name, legal reference, fee, or exact sequence, say that local environmental counsel must validate it instead of inventing a precise answer.

End with a disclaimer that this matrix is AI-generated, screening-level, and must be validated with local environmental counsel before submission or permitting action.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 6: FEL Summary Report (markdown)
// ═══════════════════════════════════════════════════════════════════════════

const felSummary: DocDefinition = {
  id: "fel-summary",
  title: "FEL Summary Report",
  description: "Front-End Loading summary — project overview, technical specs, cost estimates, operational history, project status.",
  format: "markdown",
  category: "technical",
  order: 6,
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate a FEL (Front-End Loading) Summary Report in Markdown for a biochar plant:
- Biomass: ${input.biomass.name}
- Capacity: ${input.capacityTnYear.toLocaleString()} tn/yr biomass input
- Country: ${input.countryName}

Sections (use ## headings):
1. PROJECT OVERVIEW — Technology, Capacity, Feedstock, Carbon Credits, TRL (select a real pyrolyzer from grounding data and cite its TRL level)
2. TECHNICAL SPECIFICATIONS — Process Parameters (Temperature, Residence Time, Throughput, Energy Consumption, Thermal Autosufficiency), Equipment Configuration (number of pyrolysis units with specific model from grounding, pre-processing, drying), Mass & Energy Balance (Electrical Input kWh/t biochar, Thermal Input, Biochar Yield %)
3. COST ESTIMATES — CAPEX Breakdown as a markdown table with Category / Cost (USD) — split by: Land, Infrastructure (subcategories), Equipment & Machinery, Total
4. OPERATIONAL HISTORY & TRL — Summarize the maturity of the selected equipment category using only the grounding data. If project-specific operating references are not supplied, state that vendor references and operating data remain pending due diligence.
5. TECHNICAL RESPONSES — Seasonal Biomass Variations mitigation, Energy Requirements (electrical kWh/t, thermal via syngas, LPG for startup only), Ash Disposal (<1% volume), CO2 Output Specifications, Heat & Mass Balance
6. PROJECT STATUS — Available Documentation status, Development Stage (screening / pre-FEED / FEL-2 style, not construction-ready), Next Steps, Relative Timeline

Length: 900-1300 words. Use real numbers from grounding where possible. Mark all costs as "estimated" and avoid implying the report is an engineering deliverable ready for construction, financing approval, or regulatory submission.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 7: Technical Masterplan (markdown)
// ═══════════════════════════════════════════════════════════════════════════

const technicalMasterplan: DocDefinition = {
  id: "technical-masterplan",
  title: "Technical Masterplan",
  description: "Phased project roadmap — capacity expansion, timeline, critical path, strategic partners.",
  format: "markdown",
  category: "technical",
  order: 7,
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate a Technical Masterplan document in Markdown for this biochar project. Use a phased approach with Stage 1, Stage 2, and optional expansion, all framed as illustrative planning logic rather than committed calendar milestones. If the site has not been fixed, treat location and feedstock access as selection criteria and validation tasks, not as confirmed facts.

Sections (use ## headings):
1. Project Location — location summary (${input.location ?? input.countryName}), site characteristics, proximity to feedstock
2. Project Capacity by Phases
   - Stage 1: 60-70% of target capacity
     * Biomass tonnes/year, Biochar production, CO2e credits — quote the project-specific factor from the CARBON BALANCE grounding block (${input.carbonBalance?.tCO2ePerTonneBiochar.toFixed(2) ?? "computed"} tCO₂e per tonne biochar, NOT the generic 3.0)
   - Stage 2: Full Phase 1 capacity = ${input.capacityTnYear.toLocaleString()} tn/yr
   - Optional Expansion: Additional capacity (~2x Phase 1) only as a conditional future pathway
   - Total Project capacity table
3. Biochar Technical Parameters
   - Pyrolysis Conditions: Temperature range, residence time, process type, pyrolyzer model from grounding
   - Projected Biochar Composition: H/C molar ratio target (<0.4 for Puro), Organic carbon content target (>82%), Yield (30% typical)
   - Site Layout: feedstock handling, pyrolysis unit, auxiliary services, finished product storage, truck circulation
4. Project Sequence (list 6 phases with status placeholders and indicative relative timing bands in months, not dates or years):
   - Phase 0: Infrastructure Development
   - Phase 1: Biomass Technical Validation
   - Phase 2: Detailed Engineering Finalization
   - Phase 3: Equipment and Technology Acquisition
   - Phase 4: Installation and Technological Assembly
   - Phase 5: Commissioning and Commercial Startup
5. Project Critical Path — Critical Success Factors, Key Dependencies, Decision Milestones (quarterly)
6. Strategic Partners and Responsibilities (placeholder roles: Project Developer, Feedstock Supplier, EPC contractor, Technology Supplier, Civil Works contractor, Certification Body). Use generic role labels only — do not invent company names.
7. Conclusion — summary paragraph and the main remaining validation gates before construction commitment

Length: 1000-1500 words. Use ~8000 operating hours/year unless the input provides another assumption. Do not assign exact years, calendar quarters, or commercial start dates. Keep the document in draft-planning tone, and avoid stating that a site, feedstock agreement, or utility connection is already confirmed unless the input proves it.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 8: Implementation Strategy (markdown)
// ═══════════════════════════════════════════════════════════════════════════

const implementationStrategy: DocDefinition = {
  id: "implementation-strategy",
  title: "Implementation Strategy",
  description: "Project execution plan, governance, resource allocation, quality assurance, KPIs.",
  format: "markdown",
  category: "operational",
  order: 8,
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate an Implementation Strategy document in Markdown. Treat this as a proposed execution approach for an early-stage project, not as an already staffed org chart or a committed EPC plan. Frame it for internal alignment plus structured review by potential funders, technical partners, and external reviewers.

Sections (## headings):
1. Project Management Methodology — Hybrid PMI + agile, phase-gate approach, key management principles
2. Proposed Organizational Structure
   - Project Governance: proposed decision forum, project-management lead, technical review function, quality-assurance role
   - Execution Teams: FEL engineering / pre-engineering, construction, operations, certification support
   - Strategic partner role categories
3. Resource Allocation Strategy
   - Human Resources: indicative core team size (~20 for this scale), extended team during peak construction (30-40 specialists), role categories only
   - Financial Resources: Phases 0-3 (infra & equipment), Phases 4-5 (install & commissioning), Technical validation budget (~USD 100-150k for pre-operational validation campaign), Contingency Reserve (15% of CAPEX), Working Capital (6 months OPEX pre-startup + first operational year)
4. Responsibilities by Organization — proposed split across Owner/developer, Technical co-developer, Feedstock supplier, Civil works contractor, Technology provider, dMRV provider. Use placeholder roles and avoid implying contracts are signed.
5. Project Management Plan
   - Work Breakdown Structure (WBS) — 6 phases
   - Main Deliverables list
6. Contractor and Supplier Management — Civil works, Technology, dMRV
7. Infrastructure and Services
   - Electrical Connection: utility in ${input.countryName}, 33 kV / 13.2 kV typical, MV substation, auxiliary-load only imports
   - Water Supply and Effluents
8. Permits and Authorizations — list expected permits (EIA, Industrial Park, Construction, Electrical, Operational) with typical authorities in ${input.countryName}
9. Quality Assurance Measures — 11 control systems (Financial, Management Capacity, Social Engagement, Political Stability, Regulatory, Operational Continuity, Carbon Permanence, Quantitative Precision, Market/Commercialization, Site Control, Technology/Equipment) — for each list: Control Framework, Assurance, Protocol
10. Commercial Strategy — indicative biochar sales channels (industrial users, horticulture, soil amendment) and carbon-credit commercialization paths without naming unconfirmed buyers
11. Performance Management — KPIs: SPI ≥ 0.95, CPI ≥ 0.95, Defect rate ≤ 2%, LTIFR target zero, Safety audit compliance ≥ 95%
12. Technology Integration Management — Technology Transfer Protocol, Integration Approach, dMRV systems
13. Project Readiness Preconditions — financing workstreams, regulatory path, technology validation, certification workplan, and commercial development still required before FID
14. Final Deliverables — Technical, Commercial, Regulatory

Length: 1500-2200 words. Reference the grounding data for country-specific infrastructure. Keep the tone operational and provisional, and do not imply staffing, counterparties, or governance bodies are already confirmed unless directly supported by the inputs.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 9: Electrical Package (JSON structured)
// ═══════════════════════════════════════════════════════════════════════════

const electricalPackage: DocDefinition = {
  id: "electrical-package",
  title: "Electrical Package (Preliminary)",
  description: "Load list, electrical system summary, MCC specs, backup power, single-line diagram description.",
  format: "json",
  category: "technical",
  order: 9,
  jsonSchema: {
    type: "object",
    properties: {
      systemSummary: {
        type: "object",
        properties: {
          mainSupplyVoltage: { type: "string" },
          frequency: { type: "string" },
          phases: { type: "string" },
          totalConnectedLoadKw: { type: "number" },
          diversityFactor: { type: "number" },
          demandLoadKw: { type: "number" },
          powerFactor: { type: "number" },
          mainTransformerKva: { type: "number" },
          mainSwitchboardRatingA: { type: "number" },
          emergencyGeneratorKw: { type: "number" },
          estimatedAnnualEnergyMwh: { type: "number" },
        },
        required: ["mainSupplyVoltage", "frequency", "phases", "totalConnectedLoadKw", "diversityFactor", "demandLoadKw", "powerFactor", "mainTransformerKva", "mainSwitchboardRatingA", "emergencyGeneratorKw", "estimatedAnnualEnergyMwh"],
      },
      loadCenters: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            kw: { type: "number" },
          },
          required: ["name", "kw"],
        },
      },
      mccs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            location: { type: "string" },
            capacityA: { type: "number" },
            voltage: { type: "string" },
            feeders: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  equipment: { type: "string" },
                  currentA: { type: "number" },
                  notes: { type: "string" },
                },
                required: ["equipment", "currentA", "notes"],
              },
            },
          },
          required: ["id", "location", "capacityA", "voltage", "feeders"],
        },
      },
      zones: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            equipment: { type: "string" },
            electricalRequirements: { type: "string" },
          },
          required: ["name", "equipment", "electricalRequirements"],
        },
      },
      singleLineDiagramDescription: { type: "string" },
      status: { type: "string", description: "Stage of engineering — should say 'PRELIMINARY'" },
    },
    required: ["systemSummary", "loadCenters", "mccs", "zones", "singleLineDiagramDescription", "status"],
  },
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate a Preliminary Electrical Package for a biochar plant at ${input.capacityTnYear.toLocaleString()} tn/yr capacity in ${input.countryName}. Return JSON.

systemSummary:
- mainSupplyVoltage: "380V" (or "400V" for European countries like DE, ES, FR)
- frequency: "50Hz" for most countries, "60Hz" for US, MX, BR
- phases: "3 Phase"
- Calculate totalConnectedLoadKw from equipment mix for this capacity. For a 30,000-60,000 tn/yr plant, typical range is 1000-1800 kW.
- diversityFactor: 0.80
- demandLoadKw: totalConnectedLoadKw * 0.80
- powerFactor: 0.85
- mainTransformerKva: ceil(demandLoadKw / 0.85 / 100) * 100 (round up to nearest 100 kVA standard rating)
- mainSwitchboardRatingA: based on transformer + voltage
- emergencyGeneratorKw: ~25% of demandLoadKw (covers critical process systems during outages)
- estimatedAnnualEnergyMwh: demandLoadKw * 8000h / 1000

loadCenters: array of {name, kw} covering: "Raw Material Processing", "Drying System", "Pelletizing", "Pyrolysis Units", "Conveyors and Storage", "Auxiliary Systems".

mccs: 3-4 MCCs covering the main process zones. For each: id, location (zone), capacityA, voltage, feeders list (5-8 feeders with equipment tag, current, notes).

zones: 3-4 zones (Raw Material, Drying/Pelletizing, Pyrolysis, Electrical Room) with equipment list and electricalRequirements text.

singleLineDiagramDescription: paragraph describing the main system components: utility supply at a typical medium-voltage level for the country/region where known, transformer, main switchboard, MCCs, emergency generator. Include a preliminary protection philosophy (digital multifunction relays, motor protection, PLC control, metering). If the local utility standard or point of interconnection is not known, flag it as pending confirmation rather than inventing a precise voltage.

status: "PRELIMINARY — for initial technical evaluation and feasibility. Final diagrams require licensed electrical engineer certification per local regulations."`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 10: QA/QC Plan (markdown)
// ═══════════════════════════════════════════════════════════════════════════

const qaqcPlan: DocDefinition = {
  id: "qaqc-plan",
  title: "Quality Assurance & Quality Control (QA/QC) Plan",
  description: "Full QA/QC system covering raw material, process, and product quality control.",
  format: "markdown",
  category: "operational",
  order: 10,
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate a Quality Assurance & Quality Control (QA/QC) Plan for a biochar production facility.
- Biomass: ${input.biomass.name}
- Capacity: ${input.capacityTnYear.toLocaleString()} tn/yr
- Country: ${input.countryName}

Sections (## headings):

1. REGULATORY FRAMEWORK AND STANDARDS
   - Primary Standards: PURO.EARTH Biochar Methodology Edition 2025, ISO 14064-2, EBC (if EU), EPA where applicable
   - Local technical standards (IRAM for Argentina, NMX for Mexico, NBR for Brazil, NTC for Colombia, UNE for Spain, DIN for Germany — use the right one for ${input.country})
   - QA/QC System Principles per PURO.EARTH Section 10.5

2. ORGANIZATIONAL STRUCTURE
   - Quality Manager, Production Supervisor, Laboratory Technician, External Auditor
   - Designated Laboratories: local certified lab for routine analysis (reference public accredited labs in ${input.countryName} if known; else say "[local ISO 17025 accredited lab TBC]"), EPA-certified international laboratory for advanced analysis (PAH, PCB, dioxins, VOCs)

3. RAW MATERIAL QUALITY CONTROL (Biomass)
   - Parameters to control: moisture (≤15%), species composition, particle size, absence of contaminants
   - Sampling frequency: each biomass batch received, minimum 3 samples per truck, daily moisture analysis
   - Acceptance/rejection criteria
   - Sampling procedures per ASTM D2013 or equivalent

4. PROCESS QUALITY CONTROL
   - Critical Process Parameters for selected pyrolyzer model (temperature, residence time, pressure, biomass flow)
   - LPG / natural gas consumption for startup
   - Auxiliary system parameters
   - Instrumentation and Calibration per PURO.EARTH Section 10.5.5 (min accuracy ±5%, certified reference materials)
   - Continuous Monitoring: automatic logging every 15 min, alarms for deviations >5%, intervention for >10%

5. PRODUCT QUALITY CONTROL (Biochar)
   - Routine analysis (each batch, daily): organic carbon content target, H/C molar ratio target <0.4 (Puro/EBC/Verra threshold), O/C ratio, ash content, pH, electrical conductivity
   - Heavy metals: Pb, Cd, Cu, Ni, Zn, Cr, Hg, As (EBC limits as reference)
   - Advanced analysis (monthly or per Puro requirements): PAHs (16 EPA priority), PCBs (7 indicator congeners), dioxins and furans (17 toxic congeners), VOCs (EPA Method 8260)
   - Persistence analysis if required (Random reflectance Ro, thermogravimetric)
   - Conformity criteria

6. DOCUMENTATION AND TRACEABILITY per PURO.EARTH Section 9.3
   - Mandatory records: biomass records, process parameters, biochar analysis, calibrations, corrective actions
   - Traceability system: unique batch code, link to origin biomass, process conditions, analysis, destination
   - Archive and conservation (min 2 years post-accreditation)

7. AUDITS AND VERIFICATION
   - Internal audits (monthly)
   - External audits per PURO.EARTH schedule
   - Corrective Actions

8. CONTINUOUS IMPROVEMENT
   - Quarterly review of quality indicators
   - Personnel training
   - Performance indicators: % batches conforming first time, average batch release time, non-conformities per month, traceability efficiency

9. IMPLEMENTATION SCHEDULE
   - 6-month phased implementation: Months 1-2 detailed procedures, Month 3 training, Month 4 pilot, Month 5 internal audit, Month 6 Puro certification

Length: 1300-1800 words.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 11: LCA Report (markdown with embedded tables)
// ═══════════════════════════════════════════════════════════════════════════

const lcaReport: DocDefinition = {
  id: "lca-report",
  title: "Life Cycle Assessment (LCA) Report",
  description: "Cradle-to-gate LCA with emission factors, mass & energy balance, net removal calculation.",
  format: "markdown",
  category: "environmental",
  order: 11,
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate an LCA Report for a biochar carbon removal project.
- Biomass: ${input.biomass.name}${input.biomass.elementalComposition ? ` (C=${input.biomass.elementalComposition.C}%, H=${input.biomass.elementalComposition.H}%, ash=${input.biomass.elementalComposition.ash}%)` : ""}
- Capacity: ${input.capacityTnYear.toLocaleString()} tn/yr biomass input
- Country: ${input.countryName}
- Target methodology: ${input.targetMethodology ?? "Puro.earth"}

Frame the LCA under the selected target methodology. Methodology-specific notes:
- puro-earth: Puro.earth CORC Ed. 2025 biochar methodology, 85-95% permanence. Do NOT quote "3 tCO2e/t biochar" as a generic factor — use the project-specific tCO₂e-per-tonne value from the CARBON BALANCE block, which accounts for the biochar's actual C_org content.
- isometric: Isometric biochar protocol, stricter permanence evidence (molar H/Corg × char temperature × lab analysis), per-batch MRV required.
- ebc: European Biochar Certificate (C-Sink Global), ISO 14067 cradle-to-gate, H/Corg < 0.7 mandatory.
- verra-vm0044: VCS VM0044 methodology, requires baseline scenario and additionality argument, permanence via IPCC 2019 framework.
- gold-standard: Gold Standard biochar methodology (in consultation), community benefits + SDG contribution required.
- rainbow-standard: Rainbow Standard BiCRS (ICVCM-approved). ISO 14064-2 compliant quantification (relevance, completeness, consistency, accuracy, transparency). Permanence horizon declared — 100 years minimum (standard tier) or 1000+ years (higher tier). Annual independent audit + year-round monitoring. H/Corg < 0.7 as universal biochar stability bar.

Sections (## headings):

1. Methodology & Protocol — primary: ${input.targetMethodology ?? "Puro.earth"}; ISO 14040/14044 framework reference; permanence factor applied per the selected methodology's requirements.

2. System Boundary — cradle-to-gate with delivery to end use. Included: feedstock sourcing (no land-use change), transport to facility, pre-treatment (shredding, drying, pelletizing), pyrolysis, internal logistics, biochar delivery to end use, permanence factor. Excluded: direct land-use change emissions (waste biomass), ancillary admin.

3. Emission Factors (use a table format)
| Source | Emission Factor | Source/Citation |
|---|---|---|
| Grid electricity (${input.countryName}) | [from grounding] | [cite grounding source] |
| Natural gas | 0.00195 tCO2e/m³ | IPCC 2019 |
| Diesel | 0.002697 tCO2e/L | IPCC 2019 |
| Unburned CH4 from flare | [calculated based on flare efficiency] | Own calculation |

4. Mass Balance Summary (table):
Stage | Inputs | Outputs
- Feedstock reception → biomass tonnes/year
- Pre-treatment (shredding, drying, pelletizing) → dried/pelletized biomass
- Pyrolysis → biochar (30% yield on DRY biomass — NOT on wet input) + syngas + bio-oil + flue gas
- Internal handling → biochar ready for dispatch

5. Energy Balance (annual):
- Electricity consumption by stage (kWh/year): shredding (20-30 kWh/t biomass), drying (15 kWh/t), pelletizing (50-80 kWh/t), pyrolysis (25-40 kWh/t biochar), internal handling. Calculate totals for the given capacity.
- Natural gas (m³/year): preheating only, typically 80-100 kg LPG per furnace startup
- Diesel (L/year): biomass transport (based on typical 14-30 km round trip, 0.4 L/km truck efficiency, 16 t per truck), onsite handling, biochar delivery (40-160 km round trip depending on destination)

6. Fossil-Derived Emissions (annual, by stage):
- Biomass transport (calculated from distance × L/km × EF diesel)
- Pre-treatment (kWh × grid EF + LPG × EF)
- Pyrolysis (kWh × grid EF + CH4 fugitive from flare at 95% efficiency) — CH4 GWP100 = 28
- Onsite handling (diesel × EF)
- Biochar delivery (diesel × EF)
- **Total facility fossil-derived emissions (tCO2e/year)** — show calculation

7. Gross Carbon Removal — use the CARBON BALANCE grounding block:
- Gross CORCs: ${Math.round(input.carbonBalance?.corcTnYearGross ?? 0).toLocaleString()} tCO₂e/yr (computed as biochar × C_org × 44/12 using the project's actual C_org, not the generic 3.0 t/t factor)
- Permanence factor applied: ${((input.carbonBalance?.inputs.permanenceFactor ?? 0.85) * 100).toFixed(0)}% (source: ${input.carbonBalance?.inputs.provenance.permanence ?? "methodology default"})
- Net CORCs before project emissions: ${Math.round(input.carbonBalance?.corcTnYearNet ?? 0).toLocaleString()} tCO₂e/yr

8. **Net Carbon Removal (annual) = Gross Removal − Fossil Emissions**
Express as tCO2e/year total AND tCO2e per tonne biochar produced.

9. Sensitivity Analysis (table):
| Parameter | Base Case | -20% | +20% | Impact on Net Removal |
|---|---|---|---|---|
| Grid electricity EF | ... | ... | ... | ... |
| Flare efficiency | 95% | 85% | 99% | ... |
| Transport distance | ... | ... | ... | ... |
| Biochar yield | 30% | 25% | 35% | ... |

10. Review Status — Self-developed draft AI LCA. MUST be replaced with independent LCA from qualified third-party (e.g., certified LCA consultancy) before submission.

Show all calculations explicitly so a reviewer can validate. Length: 1200-1800 words.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 12: Financial Summary (JSON structured)
// ═══════════════════════════════════════════════════════════════════════════

const financialSummary: DocDefinition = {
  id: "financial-summary",
  title: "Financial Summary Skeleton",
  description: "CAPEX, OPEX, revenue stack, IRR/NPV high-level estimate. User must refine with real quotes.",
  format: "json",
  category: "commercial",
  order: 12,
  jsonSchema: {
    type: "object",
    properties: {
      capex: {
        type: "object",
        properties: {
          totalUsd: { type: "number" },
          breakdown: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                usd: { type: "number" },
                percentage: { type: "number" },
                notes: { type: "string" },
              },
              required: ["category", "usd", "percentage", "notes"],
            },
          },
          contingencyPercentage: { type: "number" },
          notes: { type: "string" },
        },
        required: ["totalUsd", "breakdown", "contingencyPercentage", "notes"],
      },
      opex: {
        type: "object",
        properties: {
          annualTotalUsd: { type: "number" },
          breakdown: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                annualUsd: { type: "number" },
                percentage: { type: "number" },
                notes: { type: "string" },
              },
              required: ["category", "annualUsd", "percentage", "notes"],
            },
          },
        },
        required: ["annualTotalUsd", "breakdown"],
      },
      revenueStack: {
        type: "object",
        properties: {
          annualTotalUsdYear3: { type: "number", description: "At ramp-up Year 3 full capacity" },
          carbonCreditsAnnualTco2e: { type: "number" },
          carbonCreditPriceUsdPerTon: { type: "number" },
          carbonCreditAnnualRevenueUsd: { type: "number" },
          biocharAnnualTonnes: { type: "number" },
          biocharPriceUsdPerTonne: { type: "number" },
          biocharAnnualRevenueUsd: { type: "number" },
          otherRevenueStreams: { type: "string" },
        },
        required: ["annualTotalUsdYear3", "carbonCreditsAnnualTco2e", "carbonCreditPriceUsdPerTon", "carbonCreditAnnualRevenueUsd", "biocharAnnualTonnes", "biocharPriceUsdPerTonne", "biocharAnnualRevenueUsd", "otherRevenueStreams"],
      },
      economics: {
        type: "object",
        properties: {
          rampUp: { type: "string", description: "Ramp-up schedule as text: Year 1 X%, Year 2 Y%, Year 3 100%" },
          paybackYears: { type: "number" },
          irrPercentage: { type: "number", description: "Unlevered IRR rough estimate" },
          npvUsd: { type: "number", description: "10% discount rate, 15-year horizon" },
          notes: { type: "string" },
        },
        required: ["rampUp", "paybackYears", "irrPercentage", "npvUsd", "notes"],
      },
      additionality: {
        type: "object",
        properties: {
          unsubsidizedCostUsd: { type: "number" },
          carbonRevenueShareOfTotalPercentage: { type: "number" },
          narrative: { type: "string" },
        },
        required: ["unsubsidizedCostUsd", "carbonRevenueShareOfTotalPercentage", "narrative"],
      },
      disclaimer: { type: "string" },
    },
    required: ["capex", "opex", "revenueStack", "economics", "additionality", "disclaimer"],
  },
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate a Financial Summary (skeleton) for a biochar plant at ${input.capacityTnYear.toLocaleString()} tn/yr biomass input capacity. Country: ${input.countryName}.

Use the CAPEX benchmark of ~USD 85/tonne of annual biomass capacity as the base estimate. For ${input.capacityTnYear.toLocaleString()} tn/yr, that's approximately USD ${(input.capacityTnYear * 85).toLocaleString()}.

capex:
- totalUsd: ~USD ${(input.capacityTnYear * 85).toLocaleString()} (can range 60-120/tn)
- breakdown: array with categories {Land (0.5-1%), Infrastructure & civil works (30-45%), Equipment & machinery — pyrolyzer + pre-processing + post-processing + electrical (40-55%), Engineering & permits (3-5%), Commissioning & startup (2-3%), Contingency (15%)}. Each with usd, percentage of total, notes.
- contingencyPercentage: 15
- notes: 1-2 sentence summary

opex (annual, at steady state):
- annualTotalUsd: roughly 40-60% of CAPEX / year at full operation
- breakdown: {Feedstock procurement (30-45%), Labor (20-30%), Maintenance & spares (10-15%), Electricity & utilities (8-12%), Certification & MRV (3-5%), Insurance & admin (5-10%)}. Each with annual USD, percentage, notes.

${input.carbonBalance?.groundingBlock ?? ""}

revenueStack at steady-state Year 3:
- biocharAnnualTonnes: ${Math.round(input.carbonBalance?.biocharTnYear ?? input.capacityTnYear * 0.30)} (use this number exactly — it accounts for moisture-corrected dry biomass)
- carbonCreditsAnnualTco2e: ${Math.round(input.carbonBalance?.corcTnYearNet ?? input.capacityTnYear * 0.30 * 3 * 0.85)} (use this number exactly — derived from real C_org and methodology permanence)
- carbonCreditPriceUsdPerTon: use a conservative placeholder within 120-160 and state that it is not a committed commercial term
- carbonCreditAnnualRevenueUsd: calculate
- biocharPriceUsdPerTonne: use a conservative placeholder within 80-140 depending on end use and state that pricing remains to be validated commercially
- biocharAnnualRevenueUsd: calculate
- otherRevenueStreams: "bio-oil [optional], heat recovery [if co-located industrial host], by-product ash [minor]"
- annualTotalUsdYear3: sum

economics:
- rampUp: "Year 1: 20-30% capacity, Year 2: 60-80%, Year 3: 100%"
- paybackYears: 6-9 typical for this tech
- irrPercentage: 12-20% typical range
- npvUsd: use 10% discount rate over 15 years
- notes: high-level caveat making clear that this is a screening-level draft, not an investment case

additionality:
- unsubsidizedCostUsd: capex.totalUsd (no subsidies assumed at this stage)
- carbonRevenueShareOfTotalPercentage: carbonCreditAnnualRevenueUsd / revenueStack.annualTotalUsdYear3 × 100
- narrative: 2-3 sentences on why carbon credit revenue is additional (project uncompetitive without it)

disclaimer: "ROUGH ORDER OF MAGNITUDE estimates. Must be replaced with vendor-quoted CAPEX, site-specific OPEX, and validated revenue assumptions before use in investment decision. Not for contractual use."

Use conservative midpoint assumptions unless there is a strong reason not to. Do not present IRR, payback, NPV, or revenue as likely outcomes — present them as screening placeholders subject to commercialization, permitting, and engineering validation.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 13: Methodology Compliance Matrix (JSON structured)
// ═══════════════════════════════════════════════════════════════════════════

const methodologyCompliance: DocDefinition = {
  id: "methodology-compliance",
  title: "Methodology Compliance Matrix",
  description: "Comparison of project design vs. requirements of the 5 major biochar carbon methodologies.",
  format: "json",
  category: "compliance",
  order: 13,
  jsonSchema: {
    type: "object",
    properties: {
      methodologies: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            status: { type: "string", enum: ["Active", "Consultation", "In-development"] },
            criteria: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  criterion: { type: "string" },
                  requirement: { type: "string" },
                  projectStatus: { type: "string", enum: ["MEETS", "PARTIAL", "PENDING", "DOES_NOT_MEET", "NOT_APPLICABLE"] },
                  notes: { type: "string" },
                },
                required: ["criterion", "requirement", "projectStatus", "notes"],
              },
            },
            overallFit: { type: "string", enum: ["STRONG", "MODERATE", "WEAK"] },
            recommendation: { type: "string" },
          },
          required: ["name", "status", "criteria", "overallFit", "recommendation"],
        },
      },
      bestFitMethodology: { type: "string" },
      rationale: { type: "string" },
    },
    required: ["methodologies", "bestFitMethodology", "rationale"],
  },
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate a Methodology Compliance Matrix for this biochar project against the 6 major biochar methodologies.

For each methodology, evaluate 6-10 criteria.

1. Puro.earth (Active)
Criteria:
- H/Corg ratio < 0.7 (requirement)
- Feedstock is waste/residue (not primary timber)
- Pyrolysis gases recovered or flared (no atmospheric release)
- No fossil fuel for reactor heating
- Traceability per batch
- Third-party verification by accredited VVB
- MRV with continuous monitoring
- Permanence factor applied

2. Isometric Biochar Protocol v1.2 (Active)
Criteria:
- Pyrolyzer pre-approved OR engineering diagram + validation data submitted
- Temperature 500-800°C
- Continuous temperature logging in chamber or flue stack
- H:Corg ≤ 0.4 for 1000-year permanence tier (or ≤0.7 for shorter tier)
- Feedstock accounting (biomass sustainability)
- Biochar storage accounted for (soil application or engineered storage)
- Third-party verification

3. Verra VM0044 v1.2 (Active from June 2025)
Criteria:
- Pyrolysis or gasification
- Gases recovered or combustion with ≥70% heat recovery (high-tech tier)
- Pollution controls meeting local limits
- Temperature measured and reported
- Engineering diagram with sensors, agitators, heat exchangers
- Baseline and additionality narrative
- Leakage assessment

4. EBC (European Biochar Certificate) (Active)
Criteria:
- Temperature >500°C sustained ≥3 minutes
- Temperature fluctuation <20% during production
- Full traceability
- PAH limits met
- Heavy metals within EBC limits
- No hazardous chemical inputs
- Gas combustion or recovery

5. Gold Standard Sustainable Biochar (Consultation — not finalized)
Criteria:
- Modular/tiered approach (artisanal → industrial)
- IPCC 2019 permanence framework
- Community benefits documented
- SDG contribution
- Feedstock sustainability

6. Rainbow Standard — BiCRS (Active, ICVCM-approved)
Criteria:
- H/Corg molar ratio < 0.7 (universal biochar stability bar)
- ICVCM Core Carbon Principles alignment (additionality, permanence, quantification, no double counting, robust MRV, sustainable development, governance)
- Permanence horizon declared — 100 years minimum (required) or 1000+ years (optional higher tier)
- Feedstock sustainability documented with chain of custody
- Annual independent audit + year-round monitoring commitment
- ISO 14064-2 compliant quantification (relevance, completeness, consistency, accuracy, transparency)
- Co-benefits documented (jobs, soil health, community impact beyond carbon)
- Context note: Rainbow may offer a faster pathway in some cases, but only if the project can sustain the required audit cadence, permanence evidence, and MRV discipline.

For each criterion assess projectStatus based on the project design:
- MEETS: the project, as designed, meets the requirement
- PARTIAL: the project partially meets it, gaps exist
- PENDING: status depends on future decisions (e.g. choice of pyrolyzer, EIA outcome)
- DOES_NOT_MEET: project design conflicts with requirement
- NOT_APPLICABLE: criterion doesn't apply

overallFit per methodology: STRONG / MODERATE / WEAK
recommendation: 1-2 sentences on next steps

bestFitMethodology: pick the most practical starting methodology for this project's current maturity and data quality (${input.capacityTnYear.toLocaleString()} tn/yr, ${input.countryName})
rationale: 2-3 sentences explaining why, explicitly noting unresolved dependencies or validation gaps. Treat MEETS as "appears to meet based on current design assumptions", not as a final certification opinion. Do NOT use market-positioning, leadership, or buyer-signing claims.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 14: Community Engagement Plan (markdown)
// ═══════════════════════════════════════════════════════════════════════════

const communityEngagement: DocDefinition = {
  id: "community-engagement",
  title: "Community Engagement Plan",
  description: "ATSDR-continuum aligned plan for stakeholder consultation, grievance mechanism, benefit-sharing.",
  format: "markdown",
  category: "environmental",
  order: 14,
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate a Community Engagement Plan in Markdown for a biochar facility in ${input.location ?? input.countryName}.

Sections (## headings):

1. Objectives — permitting readiness, certification-ready stakeholder engagement, ATSDR Community Engagement Continuum, and practical social-risk management

2. Stakeholder Identification
   - Local community-based organizations (CBOs) representing residents
   - Municipal and provincial/state governments
   - Neighboring businesses in the industrial park (if applicable)
   - Environmental NGOs active in the region
   - Academic/research institutions
   - Indigenous peoples if project is near their territories (confirm absence or propose FPIC process)
   - Use generic descriptors only — do NOT invent specific NGO, CBO, or community group names

3. Stakeholder Mapping Methodology — influence × interest matrix, mapping process, validation with local authorities

4. Engagement Methods (per ATSDR continuum):
   - Public hearings (legally required for EIA in most jurisdictions)
   - Open houses during construction
   - Focus groups with affected community subgroups (women, youth, elders)
   - One-on-one meetings with key opinion leaders
   - Consultation sessions pre-commissioning
   - Ongoing community advisory board (quarterly meetings post-commissioning)

5. Engagement Timeline — phased: pre-EIA submission (month -6 to 0), during EIA review (month 0 to +3), construction (month +6 to +18), pre-commissioning (-1 month), operational (quarterly)

6. Documentation — meeting minutes, sign-in sheets, recordings (with consent), written comments register, responses log

7. Grievance Mechanism
   - Point of contact (Community Liaison Officer)
   - Channels: in-person office hours, hotline, email, written submission at municipal office
   - Response time commitments (acknowledgment 48h, substantive response 15 days, resolution targets)
   - Escalation path if unresolved
   - Anonymous complaint option
   - Annual reporting of grievances received & resolved

8. Benefit-Sharing Mechanisms
   - Local employment commitment (target: X% of operational workforce from within 20 km)
   - Local procurement commitment
   - Community investment fund (suggest 0.5-1% of annual revenue)
   - Educational/scholarship programs
   - Infrastructure co-investments (road, water, etc.)

9. Non-Carbon Benefits Plan
   - Soil amendment biochar donations for local horticulture / community gardens
   - Environmental education programs in local schools
   - Capacity building for local technicians
   - Transparency: public annual sustainability report

10. KPIs and Reporting — engagement events held, attendance, grievances received/resolved, local hire %, community satisfaction surveys

Tone: operational, sober, and implementation-focused. Do not overstate community support, social impact, or corporate-alignment claims.

Length: 800-1100 words.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 14b: MRV Plan (markdown, dedicated doc — Microsoft & Puro & Verra all ask for this separately)
// ═══════════════════════════════════════════════════════════════════════════

const mrvPlan: DocDefinition = {
  id: "mrv-plan",
  title: "MRV Plan",
  description: "Measurement, Monitoring, Reporting & Verification plan — required standalone by Microsoft CDR DD, Puro.earth, and Verra VM0044.",
  format: "markdown",
  category: "compliance",
  order: 14.5,
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate a standalone MRV (Measurement, Monitoring, Reporting & Verification) Plan in Markdown for this biochar project.

Context:
- Biomass: ${input.biomass.name}
- Capacity: ${input.capacityTnYear.toLocaleString()} tn/yr
- Country: ${input.countryName}
- Methodology: ${input.targetMethodology ?? "Puro.earth primary"}

Sections (## headings):

1. MRV Framework Overview
   - Objectives aligned to ${input.targetMethodology ?? "Puro.earth + multi-methodology"}
   - Alignment with ISO 14064-2 principles (relevance, completeness, consistency, accuracy, transparency)
   - Governance: MRV Manager, QA Lead, external Validation/Verification Body (VVB)

2. Measurement Strategy
   **a. Feedstock measurement (biomass in)**
   - What: tonnes of biomass received per batch, moisture %, species composition
   - Sensors/instruments: truck weighbridge (±0.1% accuracy), moisture meter (NIR or oven-dry ASTM D4442/D5142), species visual + third-party audit
   - Frequency: every batch at reception, daily aggregates
   - Data capture: PLC + weighbridge integration; manual log for exceptions

   **b. Process measurement (pyrolysis)**
   - Temperature: chamber + flue stack thermocouples (Type K, ±1.5°C), continuous 15-min logging
   - Residence time: calculated from feed rate + reactor volume, validated via RFID-tagged batch tracking
   - Syngas flare efficiency: O2/CO/CO2 analyzer at flare outlet (quarterly calibration with certified gas)
   - Electricity consumption: kWh meter per motor group (hourly, totalized monthly)
   - Natural gas (if used for preheating): flow totalizer at inlet

   **c. Biochar output measurement**
   - Mass: conveyor scale at bagging station, reconciled to monthly truck-out log
   - Quality per batch: H/Corg molar, fixed C, ash, moisture, pH (accredited lab, ISO 17025)
   - Advanced quality (monthly): PAH-16, PCB-7, dioxins/furans, heavy metals (EBC limits as threshold)

3. Data Management System
   - Primary capture: industrial PLC + SCADA (Ignition, Wonderware, or equivalent)
   - Data warehouse: cloud-native (time-series DB like InfluxDB or equivalent)
   - Blockchain/immutable log layer: integration with a dMRV provider (e.g. Crystalchain, Carbonfuture, Pyroccs, OpenForest) for tamper-evident audit trail
   - Backups: real-time replication + daily snapshots. Retention: 2-year minimum for Puro.earth § 9.3; 10-year for Rainbow Standard + Isometric; indefinite archival when feasible.

4. Reporting Workflow
   - Batch report: auto-generated per batch with all key parameters, signed by Production Supervisor within 24h
   - Monthly operational report: aggregated KPIs, non-conformities, corrective actions, delivered to Project Developer + internal QA
   - Annual MRV report: submitted to VVB for verification, covering: biomass inputs, biochar outputs, carbon removal volumes, energy/fuel consumption, emissions from operations, all process parameters
   - Methodology-specific issuance reports: Puro.earth Output Reports (Ed. 2025) for puro-earth; Isometric per-batch verification package for isometric; Rainbow Standard annual audit + ICVCM assessment alignment for rainbow-standard; Verra VM0044 monitoring report for verra-vm0044.

5. Verification Schedule
   - Internal audits: monthly (Quality Manager), quarterly (cross-functional)
   - External verification:
     * Initial validation: before first credit issuance (VVB site visit + document review)
     * Annual verification: each year for credit re-issuance
     * Material change verification: if capacity/process/feedstock changes significantly
   - Shortlisted VVBs for this region: [suggest 2-3 based on country — for LatAm: TÜV Rheinland, SCS Global, Aenor, Control Union; for EU: DNV GL, TÜV SÜD; for US: Verification of Environmental Registry Audits (VERRA), SCS Global; for India: TÜV India, UL India]

6. Uncertainty Analysis
   - Quantify measurement uncertainty for each critical parameter (% of measured value)
   - Propagate uncertainties to net CDR calculation using GUM (Guide to the Expression of Uncertainty in Measurement)
   - Target: total uncertainty on net CDR < 10% for a 1000-yr permanence claim

7. Leakage Assessment
   - Feedstock leakage: ensure diverted biomass doesn't cause deforestation elsewhere (counterfactual documentation)
   - Market leakage: monitor biochar end-use to confirm soil/cement use (not burned)
   - Reversal risk: buffer pool contribution per target methodology (10% Puro.earth; methodology-specific for Isometric/Rainbow/Verra); permanence factor applied in LCA

8. Continuous Improvement
   - Quarterly MRV review by cross-functional team
   - Corrective action log: any non-conformity triggers root cause analysis + action plan with deadline
   - Upgrade path: annual review of dMRV tech stack, sensor calibration schedule, lab accreditation status

9. MRV Budget (Annual)
   - Internal MRV staff: 1.5-2 FTE (MRV Manager, Data Analyst)
   - External lab analysis: routine (every batch) + advanced (monthly)
   - Sensor calibration, instrument maintenance
   - External verification (VVB annual fee)
   - dMRV platform subscription
   - Typical range: USD 80,000-150,000 per year for a ${input.capacityTnYear.toLocaleString()} tn/yr facility

10. Roles & Responsibilities (RACI)
    - MRV Manager: R for data collection, A for quality, C for reports, I for audits
    - Production Supervisor: R for process data logging
    - Lab Technician: R for sample analysis
    - QA Lead: R for internal audits, A for conformity
    - External VVB: R for independent verification
    - Project Developer: A for MRV governance, I for daily operations

Length: 1200-1800 words. Be specific about equipment, standards, and thresholds.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 14c: Stakeholder Mapping (JSON — a matrix some auditors expect separately)
// ═══════════════════════════════════════════════════════════════════════════

const stakeholderMapping: DocDefinition = {
  id: "stakeholder-mapping",
  title: "Stakeholder Mapping",
  description: "Influence × interest matrix of project stakeholders. Expected standalone by some auditors (ICAA in Argentina, ANLA in Colombia, Microsoft BiCRS DD).",
  format: "json",
  category: "environmental",
  order: 14.7,
  jsonSchema: {
    type: "object",
    properties: {
      methodology: { type: "string", description: "Brief note on how stakeholders were identified" },
      stakeholders: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Category or placeholder (e.g. 'Local horticulture cooperative [TO BE IDENTIFIED]')" },
            category: { type: "string", enum: ["Government (National)", "Government (Provincial/State)", "Government (Municipal)", "Community Organization", "Environmental NGO", "Industry Partner", "Academic/Research", "Indigenous People", "Worker/Union", "Supplier", "Customer/Offtaker", "Regulator", "Finance/Investor", "Media"] },
            influence: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            interest: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
            role: { type: "string", description: "What this stakeholder is expected to do or care about" },
            engagementStrategy: { type: "string", description: "How the project will engage them (consult, partner, inform, monitor)" },
            cadence: { type: "string", description: "How often (e.g. 'monthly', 'quarterly', 'before EIA submission')" },
            risks: { type: "string", description: "What could go wrong without proper engagement" },
            supportingDoc: { type: "string", description: "Which doc captures the engagement, e.g. 'Letter of Intent (LOI)', 'EIA consultation record'" },
          },
          required: ["name", "category", "influence", "interest", "role", "engagementStrategy", "cadence", "risks", "supportingDoc"],
        },
      },
      influenceInterestMatrix: {
        type: "object",
        description: "Quick summary — how many stakeholders fall into each quadrant",
        properties: {
          highInfluenceHighInterest: { type: "integer", description: "Manage closely" },
          highInfluenceLowInterest: { type: "integer", description: "Keep satisfied" },
          lowInfluenceHighInterest: { type: "integer", description: "Keep informed" },
          lowInfluenceLowInterest: { type: "integer", description: "Monitor" },
        },
        required: ["highInfluenceHighInterest", "highInfluenceLowInterest", "lowInfluenceHighInterest", "lowInfluenceLowInterest"],
      },
      notes: { type: "string" },
    },
    required: ["methodology", "stakeholders", "influenceInterestMatrix", "notes"],
  },
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate a Stakeholder Mapping for a biochar plant (${input.capacityTnYear.toLocaleString()} tn/yr biomass) in ${input.location ?? input.countryName}, ${input.countryName}. Return JSON.

Identify 12-18 stakeholders across the ${input.countryName} context. Use the country-specific authorities from the grounding data (the "Regulatory authorities" block). For community/CBO/NGO entries use generic descriptors such as "local community organization pending identification during EIA consultation" — do NOT invent real organization names.

Typical stakeholder categories to include (adapt to country):
1. National government — environment ministry (e.g. SEMARNAT Mexico, MMA Brazil)
2. Provincial/state government — environmental regulator (e.g. ICAA Corrientes, CETESB São Paulo)
3. Municipal government — mayor's office, public works
4. Utility company — grid connection authority
5. Industrial park administration (if applicable)
6. Feedstock supplier — primary biomass source
7. Local horticulture/agriculture cooperative (biochar end-user)
8. Cement or industrial biochar offtaker
9. Carbon credit offtaker (corporate, e.g. type like "Fortune 500 corporate CDR buyer")
10. Environmental NGO active in the region (placeholder)
11. Academic/research partner (e.g. INTA Argentina, EMBRAPA Brazil, CONACyT Mexico)
12. Worker union (if local norms apply)
13. Community-based organization near facility (placeholder)
14. Indigenous peoples (if relevant to the region — include an FPIC plan if so, else confirm absence)
15. Media (local press)
16. Civil protection / fire department (for emergency response coordination)

For each:
- influence (LOW/MEDIUM/HIGH) — power over project decisions
- interest (LOW/MEDIUM/HIGH) — stake in project outcomes
- role — what they want or can offer
- engagementStrategy — one of: Manage closely, Keep satisfied, Keep informed, Monitor
- cadence — frequency of engagement
- risks — what happens if they're ignored
- supportingDoc — what document captures the engagement (LOI, EIA record, etc.)

Also fill influenceInterestMatrix with counts of stakeholders per quadrant.

methodology: 2-3 sentences describing how the list was built (role-based, country-specific regulators from grounding, placeholders where specific identification is pending).

notes: 2-3 sentences noting that specific named individuals/organizations must be identified during EIA consultation and community mapping phases.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 14d: Custom Methodology Compliance (JSON, only emitted when the user
// has attached one of their own custom methodologies to the project)
// ═══════════════════════════════════════════════════════════════════════════

const customMethodologyCompliance: DocDefinition = {
  id: "custom-methodology-compliance",
  title: "Custom Methodology Compliance",
  description: "Pass/fail evaluation against the user's own defined methodology criteria. Only generated when a custom methodology is attached to the project.",
  format: "json",
  category: "compliance",
  order: 14.8,
  jsonSchema: {
    type: "object",
    properties: {
      methodologyName: { type: "string" },
      methodologyDescription: { type: "string" },
      basedOn: { type: "string" },
      overallFit: { type: "string", enum: ["STRONG", "MODERATE", "WEAK"] },
      summary: { type: "string", description: "2-3 sentence summary of how the project fits the methodology" },
      criteria: {
        type: "array",
        items: {
          type: "object",
          properties: {
            criterionId: { type: "string" },
            label: { type: "string" },
            requirement: { type: "string" },
            projectStatus: { type: "string", enum: ["MEETS", "PARTIAL", "PENDING", "DOES_NOT_MEET", "NOT_APPLICABLE"] },
            evidence: { type: "string", description: "What project data supports the status" },
            gap: { type: "string", description: "What is missing if not MEETS" },
            nextSteps: { type: "string" },
          },
          required: ["criterionId", "label", "requirement", "projectStatus", "evidence", "gap", "nextSteps"],
        },
      },
      recommendation: { type: "string" },
    },
    required: ["methodologyName", "methodologyDescription", "basedOn", "overallFit", "summary", "criteria", "recommendation"],
  },
  buildPrompt: (input) => {
    const custom = input.customMethodology!;
    const criteriaList = custom.criteria
      .map((c, i) => `${i + 1}. ID: ${c.id}\n   Label: ${c.label}\n   Requirement: ${c.description}${c.thresholdNote ? `\n   Threshold note: ${c.thresholdNote}` : ""}`)
      .join("\n\n");

    return {
      system: commonSystemInstruction(input),
      user: `Evaluate this biochar project against the user's CUSTOM methodology and return JSON.

User's methodology:
- Name: ${custom.name}
- Description: ${custom.description || "(none provided)"}
- Based on: ${custom.basedOn ?? "Standalone — not derived from any public methodology"}

Criteria to evaluate (${custom.criteria.length} total):

${criteriaList}

Project context:
- Biomass: ${input.biomass.name}
- Capacity: ${input.capacityTnYear.toLocaleString()} tn/yr
- Country: ${input.countryName}
- Audience: ${input.offtakerType}

Return JSON with:
- methodologyName: "${custom.name}"
- methodologyDescription: "${custom.description || "(user-provided custom methodology)"}"
- basedOn: "${custom.basedOn ?? "standalone"}"
- overallFit: STRONG / MODERATE / WEAK based on how well the project meets the criteria
- summary: 2-3 sentences explaining the overall assessment
- criteria: array with ONE entry PER criterion above, keeping criterionId exact. For each:
  * label: copy from input
  * requirement: copy the requirement description from input
  * projectStatus: MEETS / PARTIAL / PENDING / DOES_NOT_MEET / NOT_APPLICABLE
  * evidence: 1-2 sentences citing specific project data (biomass composition, capacity, country, grounding benchmarks) that supports the status
  * gap: if not MEETS, describe what's missing. If MEETS, write "None".
  * nextSteps: concrete action to move to MEETS (if not there already), or "Continue as planned." if already MEETS
- recommendation: 2-3 sentences with overall next steps to align fully with this methodology

Be rigorous: if the criterion asks for something the project data doesn't support, status is PARTIAL or PENDING, not MEETS. Use the grounding data (pyrolyzer catalog, grid EFs, regulatory authorities) to justify status.`,
    };
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DOC 15: PDD Pre-Fill (JSON structured — maps to 11 workstreams of PDD Builder)
// ═══════════════════════════════════════════════════════════════════════════

const pddPreFill: DocDefinition = {
  id: "pdd-pre-fill",
  title: "PDD Pre-Fill (11 Workstreams)",
  description: "Pre-filled draft answers for the full PDD Builder — user reviews and refines each section.",
  format: "json",
  category: "compliance",
  order: 15,
  jsonSchema: {
    type: "object",
    properties: {
      workstreams: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            answers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  questionId: { type: "string" },
                  questionLabel: { type: "string" },
                  draftAnswer: { type: "string" },
                  // For table-typed PDD questions (riskRegister, permittingStatus,
                  // commercialPartners, certifications, capex, opex, emissionFactors,
                  // preProcessing, pyrolysisUnits, postProcessing, ancillaryEquipment,
                  // supplierWarranty, powerDistribution, motorControlCenters,
                  // emergencyPower, qualityParameters, labAnalysis,
                  // certificationStandards) return rows here — the PDD Builder
                  // renders these as a structured table. Column ids must match
                  // the schema documented at the end of the prompt. Leave empty
                  // for prose (textarea) questions.
                  structuredRows: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: { type: "string" },
                    },
                  },
                  confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] },
                  requiresUserInput: { type: "boolean" },
                },
                required: ["questionId", "questionLabel", "draftAnswer", "confidence", "requiresUserInput"],
              },
            },
          },
          required: ["id", "title", "answers"],
        },
      },
    },
    required: ["workstreams"],
  },
  buildPrompt: (input) => ({
    system: commonSystemInstruction(input),
    user: `Generate a PDD Pre-Fill for the 11-workstream Project Design Document structure. This is an early-stage editable draft, not a company brochure. Never fabricate company experience, named buyers, signed counterparties, exact addresses, or claims of operational history that are not directly supported by the project inputs and grounding data.

Return JSON with a "workstreams" array. For each workstream, provide draft answers for each question.

Workstreams and their questions:

A. Parties Involved (id: "parties")
- projectDeveloper — describe the still-pending legal entity and role split in neutral terms. Do not invent names, years of experience, or track record claims.
- commercialPartners — describe partner categories (feedstock, tech, offtake, logistics) and commercialization stage without naming unconfirmed counterparties.
- technicalPartners — describe the expected EPC/FEL/equipment/certification roles without inventing companies or advisors.

B. Project Qualities (id: "qualities")
- facilityLocation — ${input.capacityTnYear.toLocaleString()} tn/yr in ${input.location ?? input.countryName}.
- landUse — ~2-3 hectares for Phase 1 + Phase 2 room.
- gridConnection — country-specific utility and voltage.
- permittingStatus — permits list for ${input.countryName} (environmental, construction, operating).
- eiaAssessment — EIA framework in ${input.countryName}.
- commercial — offtake channels (carbon credits + biochar sales).
- riskRegister — summarize top 5 risks.

C. Implementation Plan (id: "implementation")
- timeline — 6 phases over 18-24 months.
- executionPlan — phase-gate PMI + agile.
- procurementStrategy — EPC/EPCM hybrid.
- omArrangements — owner-operated, 2 operators/shift, 24/7.

D. Biomass Feedstock (id: "feedstock")
- sourcingStrategy — ${input.biomass.name}, ${input.biomass.source ?? "sourcing concept"}.
- supplyDemand — availability model.
- kpis — moisture ≤15%, particle size, species composition.
- tonnageRequired — ${input.capacityTnYear.toLocaleString()} tn/yr.
- certifications — FSC for forestry biomass, or local certification for agricultural.
- counterfactualUse — what would happen to biomass without the project.

E. Biochar (id: "biochar")
- endUse — agricultural soil amendment + cement industry + other industrial.
- customers — likely customer categories and commercialization status; do not name unconfirmed offtakers.
- purityComposition — target specs (C>80%, H/Corg<0.4, ash, moisture).
- transportation — bulk, big bags, distances.

F. Financial (id: "financial")
- revenueStack — carbon credits + biochar + (bio-oil optional).
- carbonCredits — volumes and prices.
- capex — itemized.
- opex — itemized.
- financing — debt + equity + pre-purchase agreements.
- additionality — why project requires carbon credit revenue.
- unsubsidizedCost — unsubsidized CAPEX.

G. Technology & Plant Integration (id: "technology")
- facilityDesign — reactor type, temperature, continuous mode.
- pyrolysisSpecs — pyrolyzer model from grounding, count, operating conditions.
- operationalHistory — TRL 9 for rotary pyrolysis.
- energyRequirements — electricity + thermal from syngas.
- massEnergyBalance — high-level numbers.
- seasonalVariations — mitigation.

H. LCA & Certification (id: "lca")
- lcaMethodology — primary target methodology (puro-earth / isometric / ebc / verra-vm0044 / gold-standard / rainbow-standard) + ISO 14040/14044 framework + grid EF.
- systemBoundary — cradle-to-gate with delivery.
- mmrvPlan — sampling, lab, data mgmt.
- certificationPartner — accredited VVB selection process.
- sensitivityAnalysis — scenarios.
- independentReview — plan for independent LCA review.
- emissionFactors — list with sources.

I. Community & Environment (id: "community")
- environmentalImpact — EIA categorization expected.
- airEmissions — emission controls.
- waterUsage — low, from park network.
- hazardousWaste — minimal, managed per local regs.
- noiseModeling — within industrial zone limits.
- sensitiveSites — confirmation of no proximity.
- communityEngagement — ATSDR continuum methods.
- stakeholderMapping — CBOs, governments, NGOs.
- harmsBenefits — dust/traffic vs jobs/soil/CDR.

J. Equipment & Plant Layout (id: "equipment")
- preProcessing — chippers, hammer mills, dryers, pelletizers.
- pyrolysisUnits — model from grounding.
- postProcessing — cooling conveyors, storage.
- ancillaryEquipment — conveyors, storage, dust, cooling.
- plantLayout — zone arrangement.
- supplierWarranty — supplier terms.

K. Electrical & Quality Control (id: "electrical")
- powerDistribution — MV connection, transformer, switchboard.
- motorControlCenters — 3 MCCs per process zone.
- emergencyPower — backup generator sized for critical load.
- qualityParameters — biochar specs.
- labAnalysis — routine + advanced lab protocols.
- certificationStandards — EBC, Puro, local.

For each answer:
- draftAnswer: 40-120 words, specific, professional, and conservative
- confidence: HIGH only if directly derivable from the project inputs or grounding data; otherwise use MEDIUM or LOW
- requiresUserInput: true if user MUST provide real-world input (names, exact addresses, contract details)

TABLE QUESTIONS — populate \`structuredRows\` (an array of objects) using the EXACT column ids below. Also keep \`draftAnswer\` as a one-sentence caption (~20 words). If a table question has no rows to seed, leave \`structuredRows\` empty and use \`draftAnswer\` to describe the gap.

- commercialPartners (A):
  columns: role (feedstock-supplier|biochar-offtaker|credit-buyer|epc|financier|other), entity, status (exploring|loi|signed|under-negotiation), notes
- permittingStatus (B): permit, authority, status (not-started|in-progress|submitted|approved|rejected), expectedDate, notes
  Return ~6 rows covering EIA, industrial park entry, water & wastewater, electricity grid, construction, operational permit.
- riskRegister (B): type (financial|management|social|political|regulatory|natural|reversal|quantitative|commercial|site-control|technology|other), description, mitigation, level (low|medium|high), supportingDoc
  Return ALL 11 canonical risk types, one row each.
- certifications (D): standard (FSC|PEFC|SBP|ISCC|REDcert|other), certificateNumber, scope, validUntil, verifier
  If biomass is forestry/wood → seed with FSC template row. Otherwise pick the correct standard.
- capex (F): item, phase (phase-1|phase-2|both), costUsd, notes
- opex (F): item, annualUsd, assumptions
- emissionFactors (H): source, value, unit, reference
  Seed at least 3 rows (grid electricity + fuel/transport + IPCC constant).
- preProcessing (J): item, makeModel, capacity, powerKw, notes
- pyrolysisUnits (J): unitId, makeModel, capacityKgh, tempC, residenceMin, powerKw, status (quoted|ordered|delivered|installed|commissioned)
  Use ONLY manufacturer names from the equipment grounding data.
- postProcessing (J): item, makeModel, throughput, notes
- ancillaryEquipment (J): item, function, capacity, notes
- supplierWarranty (J): supplier, equipment, warrantyYears, scope
- powerDistribution (K): equipmentId, voltage, ratingKw, cableSize, breaker, notes
- motorControlCenters (K): mccId, description, feeders, notes
- emergencyPower (K): source (diesel-generator|ups|battery|grid-backup|other), capacityKva, autonomyH, criticalLoads
- qualityParameters (K): parameter, target, testMethod, frequency
  Seed at least 4 rows (C%, H:Corg, ash, moisture, plus heavy metals if relevant).
- labAnalysis (K): analysis, labProvider, frequency, costUsd
- certificationStandards (K): standard (puro-earth|isometric|verra-vm0044|ebc|gold-standard|iso|other), applicability, status (not-started|in-progress|endorsed|certified), nextVerification

All other questions (textareas) — leave \`structuredRows\` empty and put the full response in \`draftAnswer\` as prose.`,
  }),
};

// ═══════════════════════════════════════════════════════════════════════════
// CATALOG EXPORT — used by router
// ═══════════════════════════════════════════════════════════════════════════

export const DOC_DEFINITIONS: DocDefinition[] = [
  executiveSummary,
  technicalOverview,
  equipmentBom,
  riskRegister,
  permitMatrix,
  felSummary,
  technicalMasterplan,
  implementationStrategy,
  electricalPackage,
  qaqcPlan,
  lcaReport,
  financialSummary,
  methodologyCompliance,
  communityEngagement,
  mrvPlan,
  stakeholderMapping,
  pddPreFill,
];

// The custom-methodology doc is conditional: only generated when the project
// has a customMethodology attached. Exported separately so the router and UI
// can handle the conditional flow.
export const CUSTOM_METHODOLOGY_DOC = customMethodologyCompliance;

/**
 * Resolve the list of docs to generate for a given project. If the project
 * has a custom methodology attached, includes the Custom Methodology
 * Compliance doc. Otherwise returns the standard 17-doc catalog.
 */
export function getDocsForProject(input: ProjectInput): DocDefinition[] {
  if (input.customMethodology && input.customMethodology.criteria.length > 0) {
    return [...DOC_DEFINITIONS, CUSTOM_METHODOLOGY_DOC];
  }
  return DOC_DEFINITIONS;
}

export function getDocDefinition(docId: string): DocDefinition | undefined {
  if (docId === CUSTOM_METHODOLOGY_DOC.id) return CUSTOM_METHODOLOGY_DOC;
  return DOC_DEFINITIONS.find((d) => d.id === docId);
}

export function sanitizeGeneratedDocForDisplay(
  doc: GeneratedDoc,
  lang: string | null | undefined,
): GeneratedDoc {
  const docDef = getDocDefinition(doc.docId);
  if (!docDef || !doc.content) return doc;
  return {
    ...doc,
    content: sanitizeGeneratedContent(docDef, doc.content, lang),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE A SINGLE DOC
// ═══════════════════════════════════════════════════════════════════════════

export type GeneratedDoc = {
  docId: string;
  title: string;
  format: DocFormat;
  category: string;
  content: string; // markdown string or JSON stringified
  generatedAt: number;
  tokenUsage: { prompt: number; completion: number };
  error?: string;
};

export async function generateDoc(
  docDef: DocDefinition,
  input: ProjectInput,
): Promise<GeneratedDoc> {
  const { system, user } = docDef.buildPrompt(input);
  const messages: Message[] = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];

  try {
    const response = await invokeLLM({
      messages,
      response_format:
        docDef.format === "json" && docDef.jsonSchema
          ? {
              type: "json_schema",
              json_schema: { name: docDef.id, strict: true, schema: docDef.jsonSchema },
            }
          : { type: "text" },
    });

    const rawContent = response.choices[0]?.message?.content ?? "";
    const content = sanitizeGeneratedContent(docDef, rawContent, input.lang);
    return {
      docId: docDef.id,
      title: docDef.title,
      format: docDef.format,
      category: docDef.category,
      content,
      generatedAt: Date.now(),
      tokenUsage: {
        prompt: response.usage?.prompt_tokens ?? 0,
        completion: response.usage?.completion_tokens ?? 0,
      },
    };
  } catch (err) {
    return {
      docId: docDef.id,
      title: docDef.title,
      format: docDef.format,
      category: docDef.category,
      content: "",
      generatedAt: Date.now(),
      tokenUsage: { prompt: 0, completion: 0 },
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE FULL PROJECT PACKAGE (orchestrator)
// ═══════════════════════════════════════════════════════════════════════════

export type ProjectGenerationResult = {
  docs: GeneratedDoc[];
  totalPromptTokens: number;
  totalCompletionTokens: number;
  durationMs: number;
};

/**
 * Generate the full project package. Runs docs in parallel (Gemini handles
 * concurrency well; we throttle to 3 concurrent requests to avoid rate limits).
 */
export async function generateProjectPackage(
  input: ProjectInput,
  opts: { onDocComplete?: (doc: GeneratedDoc) => void } = {},
): Promise<ProjectGenerationResult> {
  const start = Date.now();
  const MAX_CONCURRENT = 3;

  const docs: GeneratedDoc[] = [];
  const queue = getDocsForProject(input).sort((a, b) => a.order - b.order);

  // Simple concurrency pool
  const inflight: Promise<void>[] = [];

  async function runOne(docDef: DocDefinition): Promise<void> {
    const result = await generateDoc(docDef, input);
    docs.push(result);
    opts.onDocComplete?.(result);
  }

  for (const docDef of queue) {
    if (inflight.length >= MAX_CONCURRENT) {
      await Promise.race(inflight);
    }
    const p = runOne(docDef).finally(() => {
      const idx = inflight.indexOf(p);
      if (idx >= 0) inflight.splice(idx, 1);
    });
    inflight.push(p);
  }

  await Promise.all(inflight);

  // Sort docs back by their defined order
  docs.sort((a, b) => {
    const ao = getDocDefinition(a.docId)?.order ?? 999;
    const bo = getDocDefinition(b.docId)?.order ?? 999;
    return ao - bo;
  });

  return {
    docs,
    totalPromptTokens: docs.reduce((s, d) => s + d.tokenUsage.prompt, 0),
    totalCompletionTokens: docs.reduce((s, d) => s + d.tokenUsage.completion, 0),
    durationMs: Date.now() - start,
  };
}
