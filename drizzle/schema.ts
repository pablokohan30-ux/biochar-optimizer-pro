import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  // Stripe integration
  stripeCustomerId: text("stripeCustomerId"),
  stripeSubscriptionId: text("stripeSubscriptionId"),
  subscriptionTier: text("subscriptionTier", { enum: ["free", "analyst", "developer", "engineer", "expert"] }).default("free").notNull(),
  subscriptionStatus: text("subscriptionStatus").default("inactive"),
  // Time-limited access (one-time passes like Carbon Forum). When set, this is the expiry timestamp
  // for the current tier. When null, access follows normal subscription billing logic.
  accessExpiresAt: integer("accessExpiresAt", { mode: "timestamp" }),
  // Social share unlock: free users get N AI analyses after sharing on LinkedIn/X
  socialShareAiCredits: integer("socialShareAiCredits").default(0).notNull(),
  socialShareUrl: text("socialShareUrl"),
  // ─── White-label branding (Expert tier) ──────────────────────────────────
  // Allows Expert tier users to replace Biochar Optimizer Pro branding with
  // their own logo/company name/primary color on PDF exports (AI Builder
  // project package + Puro.earth submission prints). Logos are stored as
  // base64 data URLs with a 250 KB limit, enforced server-side. Everything
  // is optional — if nothing is set, the default BOP branding is used.
  brandLogoBase64: text("brandLogoBase64"),
  brandPrimaryColor: text("brandPrimaryColor"),   // Hex string, e.g. "#22c55e"
  brandCompanyName: text("brandCompanyName"),     // Replaces "Biochar Optimizer Pro" in PDF headers
  brandFooterText: text("brandFooterText"),       // Free-text line for the PDF footer (e.g. company URL or legal disclaimer)
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const launchInquiries = sqliteTable("launchInquiries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  message: text("message").notNull(),
  source: text("source", { enum: ["pricing_contact", "early_access"] }).default("pricing_contact").notNull(),
  status: text("status", { enum: ["new", "reviewed", "closed"] }).default("new").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type LaunchInquiry = typeof launchInquiries.$inferSelect;
export type InsertLaunchInquiry = typeof launchInquiries.$inferInsert;

export const aiSearchUsage = sqliteTable("aiSearchUsage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  query: text("query").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type AiSearchUsage = typeof aiSearchUsage.$inferSelect;

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  // Public-facing project ID stamped on every export. Format: BOP-YYYY-NNNN
  // (e.g. "BOP-2026-0042"). Assigned on creation, immutable afterwards.
  bopId: text("bopId"),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  country: text("country"),
  plantCapacityTph: real("plantCapacityTph"),
  feedstockId: text("feedstockId"),
  feedstockData: text("feedstockData"),
  temperature: integer("temperature").default(650),
  residenceTime: integer("residenceTime").default(30),
  qualityGoal: text("qualityGoal", { enum: ["MAX_CARBON", "AGRONOMY", "BALANCED"] }).default("BALANCED"),
  // Project lifecycle status — owner-set, surfaced on the public verify page.
  status: text("status", { enum: ["draft", "submitted", "approved", "rejected"] }).default("draft"),
  // Owner controls what's visible on the public /verify/:bopId page.
  // - "private": 404 the public page (project hidden completely).
  // - "summary" (default): show name, country, score, methodology, status, dates. No exact coords, no params.
  // - "full": include simulation params + exact coords (for users who want max transparency).
  publicVisibility: text("publicVisibility", { enum: ["private", "summary", "full"] }).default("summary"),
  // Selected methodology for the public score display. Defaults to "puro-earth".
  publicMethodology: text("publicMethodology"),
  // JSON blob of manual pre-assessment check states per methodology. Shape:
  //   { "puro-earth": { "cert-puro-listed": true, "pdd-drafted": false }, "ebc": {...} }
  // Used by MethodologyAssessment to persist which "manual confirmation"
  // checks the user has ticked for this project. Previously lived only in
  // localStorage — this makes it sync across devices for paying users.
  manualChecks: text("manualChecks"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

// ─── AI-Generated Projects (Expert tier, $999) ──────────────────────────────
// Full project packages generated by AI from minimal user input (biomass,
// capacity, country). Output is a bundle of 15-20 documents ready for
// investor pitch or certifier submission.
//
// generatedDocs is a JSON blob mapping doc_id → generated content. Each doc
// is generated independently via Gemini, in parallel where possible. The
// `status` field reflects the overall generation pipeline state.
export const aiGeneratedProjects = sqliteTable("aiGeneratedProjects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  name: text("name").notNull(),
  // Input snapshot so we can re-generate or show what the user submitted.
  biomassId: text("biomassId"),              // Key into FEEDSTOCK_DB, or "custom"
  biomassData: text("biomassData"),          // JSON snapshot of biomass elemental composition
  capacityTnYear: real("capacityTnYear").notNull(),
  country: text("country").notNull(),
  // Optional richer inputs — user can skip, AI uses defaults.
  location: text("location"),
  offtakerType: text("offtakerType", { enum: ["investor", "certifier", "both"] }).default("both"),
  targetMethodology: text("targetMethodology"), // "puro-earth", "isometric", "ebc", "verra-vm0044", "gold-standard"
  // Pipeline state.
  status: text("status", { enum: ["pending", "generating", "complete", "error"] }).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  // Generated docs — JSON blob { docId: { content, generatedAt, tokenCount } }.
  generatedDocs: text("generatedDocs"),
  // LLM cost tracking — sum of tokens across all docs in this project.
  totalPromptTokens: integer("totalPromptTokens").default(0),
  totalCompletionTokens: integer("totalCompletionTokens").default(0),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type AiGeneratedProject = typeof aiGeneratedProjects.$inferSelect;
export type InsertAiGeneratedProject = typeof aiGeneratedProjects.$inferInsert;

// Per-doc thumbs up/down feedback on AI-generated documents. Used to iterate
// on prompts: the admin dashboard aggregates votes per docId so we can see
// which generators are underperforming.
//
// Uniqueness is enforced at (userId, aiProjectId, docId) — a user can flip
// their own vote but only has one active vote per doc per project. We model
// the flip as an UPDATE in the backend.
export const aiDocFeedback = sqliteTable("aiDocFeedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  aiProjectId: integer("aiProjectId").notNull(),
  docId: text("docId").notNull(),
  vote: text("vote", { enum: ["up", "down"] }).notNull(),
  comment: text("comment"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type AiDocFeedback = typeof aiDocFeedback.$inferSelect;
export type InsertAiDocFeedback = typeof aiDocFeedback.$inferInsert;

// Custom LCA methodologies defined by Expert-tier users. Each methodology
// is a named list of pass/fail criteria. The AI Builder can generate a
// Custom Methodology Compliance doc evaluating a project against any
// methodology the user has created.
//
// `criteria` is a JSON-encoded array of { id, label, description, thresholdNote }
// — see methodologyCompliance in aiProjectBuilder.ts for the shape.
export const customMethodologies = sqliteTable("customMethodologies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  // Optional: the methodology this one extends (e.g. "puro-earth"). Lets the
  // user say "my methodology adds criteria on top of Puro.earth".
  basedOn: text("basedOn"),
  criteria: text("criteria").notNull(), // JSON array
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type CustomMethodology = typeof customMethodologies.$inferSelect;
export type InsertCustomMethodology = typeof customMethodologies.$inferInsert;

// ─── Operational Evidence (Stage 3 — Operational) ─────────────────────────
// For projects that are ALREADY operating. The operator logs real batch-level
// data (biomass receipts, pyrolysis runs, lab analyses, energy consumption,
// grievances, local hires). The AI cross-checks against the methodology's
// thresholds (e.g. Puro.earth: temp >500°C sustained >3 min, H/Corg < 0.4)
// and marks each entry as PASS / WARNING / FAIL.
//
// Together with the Offtake Tracker and Community Impact Tracker, these tables
// drive the "Audit Package" export that Microsoft / Puro / Verra VVBs expect
// from an operating plant.
//
// One entry = one discrete operational event. The `dataType` discriminates
// between categories; `content` is a JSON blob whose shape depends on type.
export const operationalEvidence = sqliteTable("operationalEvidence", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  projectId: integer("projectId").notNull(),       // references projects.id
  dataType: text("dataType", {
    enum: ["biomass_receipt", "pyrolysis_batch", "lab_analysis", "energy_reading", "shift_log", "incident", "soil_application_plan"],
  }).notNull(),
  // Period the entry covers. For point events (lab_analysis), end === start.
  periodStart: integer("periodStart", { mode: "timestamp" }).notNull(),
  periodEnd: integer("periodEnd", { mode: "timestamp" }),
  // Structured payload. Shape depends on dataType — see evidenceRouter.ts for
  // the schema of each variant.
  content: text("content").notNull(),              // JSON
  // AI validation result. Populated async by the backend after insert/update.
  validationStatus: text("validationStatus", { enum: ["PASS", "WARNING", "FAIL", "PENDING"] }).default("PENDING"),
  validationNotes: text("validationNotes"),        // short reason for non-PASS
  // Optional attachment reference (e.g. lab PDF uploaded elsewhere).
  attachmentRef: text("attachmentRef"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type OperationalEvidence = typeof operationalEvidence.$inferSelect;
export type InsertOperationalEvidence = typeof operationalEvidence.$inferInsert;

// ─── Biochar Shipments / Offtake Tracker (Stage 3) ────────────────────────
// Tracks biochar leaving the plant batch-by-batch to its end-use. Critical
// for Microsoft's "tell me exactly where the biochar is applied" demand.
//
// Each shipment has a state machine:
//   draft → dispatched → in_transit → delivered → applied
//                                  \-> rejected / lost
//
// The operator generates a `confirmationToken` (UUID) and prints it as a QR
// code or shares the link. The end-user opens /confirm/:token (no auth),
// confirms receipt + application details, and the shipment's state becomes
// `applied`. That public confirmation is the audit evidence Microsoft et al
// want to see before paying for credits.
export const biocharShipments = sqliteTable("biocharShipments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  projectId: integer("projectId").notNull(),       // references projects.id
  shipmentCode: text("shipmentCode").notNull(),    // human-readable, e.g. "SHIP-2026-0042"
  shipmentDate: integer("shipmentDate", { mode: "timestamp" }).notNull(),
  tonnes: real("tonnes").notNull(),
  // JSON array of operationalEvidence IDs (pyrolysis_batch type) that
  // produced the biochar in this shipment — the chain of custody from
  // production → application.
  batchRefs: text("batchRefs"),
  // End-user info
  endUseCategory: text("endUseCategory", {
    enum: ["agricultural_soil", "horticulture", "cement_substitute", "construction_filler", "water_filtration", "livestock_feed", "other"],
  }),
  destinationName: text("destinationName"),        // farm/company/plant name
  destinationAddress: text("destinationAddress"),
  destinationCountry: text("destinationCountry"),
  destinationLat: real("destinationLat"),
  destinationLon: real("destinationLon"),
  // Logistics
  carrierName: text("carrierName"),
  carrierVehicle: text("carrierVehicle"),
  // Public confirmation token — unguessable, used in /confirm/:token
  confirmationToken: text("confirmationToken").notNull().unique(),
  // State machine
  status: text("status", {
    enum: ["draft", "dispatched", "in_transit", "delivered", "applied", "rejected", "lost"],
  }).default("draft").notNull(),
  // Populated when the end-user opens /confirm/:token and submits the form
  confirmedAt: integer("confirmedAt", { mode: "timestamp" }),
  confirmedByName: text("confirmedByName"),        // end-user's self-reported name
  confirmedByEmail: text("confirmedByEmail"),      // optional
  confirmedTonnesApplied: real("confirmedTonnesApplied"),
  confirmedApplicationDate: integer("confirmedApplicationDate", { mode: "timestamp" }),
  confirmedApplicationType: text("confirmedApplicationType"), // free-text from end-user
  confirmedCropOrUseType: text("confirmedCropOrUseType"),     // "corn", "vineyard", "cement mortar"
  confirmedLat: real("confirmedLat"),              // GPS of the application site (if shared)
  confirmedLon: real("confirmedLon"),
  confirmedNotes: text("confirmedNotes"),
  // Operator-side notes + attachments (e.g. signed BOL PDF ref)
  notes: text("notes"),
  attachmentRef: text("attachmentRef"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type BiocharShipment = typeof biocharShipments.$inferSelect;
export type InsertBiocharShipment = typeof biocharShipments.$inferInsert;

// ─── Community Impact Tracker (Stage 3, module 3) ─────────────────────────
// Live registry of community & social impact records. What Microsoft /
// Puro / Verra call "community engagement + co-benefits" isn't a static PDF
// anymore — it's an auditable log of meetings held, grievances resolved,
// local hires, local procurement, community investments, biochar donations,
// and environmental monitoring.
//
// The AI Impact Report generator stitches these records into a narrative
// semi-annual / annual report aligned with IFC Performance Standards + the
// SDG framework, exportable as PDF evidence for the buyer.
export const communityRecords = sqliteTable("communityRecords", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  projectId: integer("projectId").notNull(),
  recordType: text("recordType", {
    enum: ["meeting", "grievance", "local_hire", "local_procurement", "community_investment", "benefit_share", "env_monitoring"],
  }).notNull(),
  recordDate: integer("recordDate", { mode: "timestamp" }).notNull(),
  // JSON payload — shape depends on recordType (see communityRouter.ts).
  content: text("content").notNull(),
  // Meaningful only for grievances; other types default to null.
  status: text("status", { enum: ["open", "in_progress", "resolved", "closed", "dismissed"] }).default("closed"),
  // Link to supporting docs (photos, signed minutes, invoices, receipts).
  attachmentRef: text("attachmentRef"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type CommunityRecord = typeof communityRecords.$inferSelect;
export type InsertCommunityRecord = typeof communityRecords.$inferInsert;

// ─── AI Call Log (generic observability) ──────────────────────────────────
// Every LLM call that doesn't have its own dedicated table (the AI Project
// Builder writes to aiGeneratedProjects) is logged here. Lets the admin
// dashboard surface token/cost usage per feature (community impact report,
// buyer readiness, buyer match, audit package exec summary, etc.) so we
// can catch runaway costs before the Gemini bill surprises us.
export const aiCallLog = sqliteTable("aiCallLog", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId"),
  // Short slug — e.g. "community.impact_report", "buyer_readiness",
  // "buyer_match", "audit_package.exec_summary".
  feature: text("feature").notNull(),
  projectId: integer("projectId"),
  promptTokens: integer("promptTokens").notNull().default(0),
  completionTokens: integer("completionTokens").notNull().default(0),
  costUsd: real("costUsd").notNull().default(0),
  status: text("status", { enum: ["ok", "error"] }).notNull().default("ok"),
  errorMsg: text("errorMsg"),
  // Free-form JSON — anything feature-specific worth keeping.
  metadata: text("metadata"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type AiCallLog = typeof aiCallLog.$inferSelect;
export type InsertAiCallLog = typeof aiCallLog.$inferInsert;
