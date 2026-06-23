/**
 * Operational Evidence router — Stage 3 of the biochar journey.
 *
 * For projects that are ALREADY operating. Operators log real data
 * (biomass receipts, pyrolysis batches, lab analyses, energy meter
 * readings, shift logs, incidents). The router validates each entry
 * against methodology thresholds and marks it PASS / WARNING / FAIL /
 * PENDING so the "Audit Package" export is auditor-ready.
 *
 * Tier gate: Expert (admins bypass). Justification: operational evidence
 * is the differentiator for the Expert tier — it's what lets a running
 * plant close its first buyer contract.
 */

import { z } from "zod";
import { eq, and, desc, sql, count, gte, lte } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import { operationalEvidence, projects } from "../drizzle/schema";
import { requireTierAccess } from "./_core/access";

// ─── Schemas by dataType ──────────────────────────────────────────────────
//
// Each dataType has its own content shape. We store JSON in the DB so we
// don't need N tables, but we still validate shapes at the router layer so
// the data is queryable/auditable.

const biomassReceiptSchema = z.object({
  supplierName: z.string().min(1).max(200),
  biomassType: z.string().min(1).max(200),        // e.g. "pine sawdust", "eucalyptus chips"
  tonnesReceived: z.number().positive(),
  moisturePct: z.number().min(0).max(100).optional(),
  truckId: z.string().max(50).optional(),
  certificationRef: z.string().max(200).optional(), // e.g. "FSC cert #NC-FM/COC-076703"
  notes: z.string().max(500).optional(),
});

const pyrolysisBatchSchema = z.object({
  batchId: z.string().min(1).max(100),
  reactorId: z.string().max(100).optional(),       // e.g. "PY-01"
  biomassInputTonnes: z.number().positive(),
  biocharOutputTonnes: z.number().positive(),
  yieldPct: z.number().min(0).max(100).optional(), // can be derived but allow override
  peakTempC: z.number().min(200).max(1200),
  avgTempC: z.number().min(200).max(1200).optional(),
  residenceTimeMin: z.number().positive(),
  // Total sustained time above the methodology threshold (usually >500°C).
  // Critical for Puro.earth / EBC compliance.
  sustainedTimeAboveThresholdMin: z.number().min(0).optional(),
  syngasFlareEfficiencyPct: z.number().min(0).max(100).optional(),
  energyKwh: z.number().min(0).optional(),
  naturalGasM3: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

const labAnalysisSchema = z.object({
  batchRef: z.string().max(100).optional(),
  labName: z.string().min(1).max(200),
  accreditation: z.string().max(200).optional(),   // e.g. "ISO 17025 #123"
  sampleDate: z.string().optional(),               // ISO date string
  hCorgMolar: z.number().min(0).max(2).optional(),
  organicCarbonPct: z.number().min(0).max(100).optional(),
  fixedCarbonPct: z.number().min(0).max(100).optional(),
  ashPct: z.number().min(0).max(100).optional(),
  pH: z.number().min(0).max(14).optional(),
  moisturePct: z.number().min(0).max(100).optional(),
  betM2G: z.number().min(0).optional(),
  // Heavy metals in µg/g (ppm)
  heavyMetals: z.object({
    Pb: z.number().min(0).optional(),
    Cd: z.number().min(0).optional(),
    Cr: z.number().min(0).optional(),
    Cu: z.number().min(0).optional(),
    Ni: z.number().min(0).optional(),
    Zn: z.number().min(0).optional(),
    Hg: z.number().min(0).optional(),
    As: z.number().min(0).optional(),
  }).optional(),
  notes: z.string().max(500).optional(),
});

const energyReadingSchema = z.object({
  meterId: z.string().max(100).optional(),
  electricityKwh: z.number().min(0),
  naturalGasM3: z.number().min(0).optional(),
  dieselLiters: z.number().min(0).optional(),
  lpgKg: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

const shiftLogSchema = z.object({
  shiftId: z.string().min(1).max(100),
  operator: z.string().max(200).optional(),
  biomassInputTonnes: z.number().min(0).optional(),
  biocharOutputTonnes: z.number().min(0).optional(),
  downtimeMin: z.number().min(0).optional(),
  qualityNotes: z.string().max(500).optional(),
  incidents: z.string().max(500).optional(),
});

const incidentSchema = z.object({
  category: z.enum(["safety", "environmental", "operational", "community", "other"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  description: z.string().min(1).max(2000),
  resolution: z.string().max(2000).optional(),
  resolvedAt: z.string().optional(),               // ISO date if resolved
  reportedToAuthority: z.boolean().optional(),
  authorityName: z.string().max(200).optional(),
});

// Soil application plan — long-term documented plan for where & how the
// biochar will be incorporated into soil. Required by Puro.earth, Verra
// VM0044, EBC C-Sink as evidence the project has a realistic application
// pathway, not just speculation. One project can have multiple plans (one
// per region/crop/season).
const soilApplicationPlanSchema = z.object({
  planTitle: z.string().min(1).max(200),           // e.g. "Plan de aplicación 2026 — Vid en Mendoza"
  targetCrop: z.string().min(1).max(200),          // e.g. "vine", "olive", "horticulture", "pasture"
  totalAreaHa: z.number().positive(),              // total area covered by this plan
  applicationRateKgPerHa: z.number().positive(),   // typical 5-20 t/ha for first application
  applicationFrequency: z.enum(["one_time", "annual", "biannual", "every_3_years", "every_5_years", "other"]),
  startDate: z.string().optional(),                // ISO date — planned start
  endDate: z.string().optional(),                  // ISO date — planned end (long-term: ≥10 yr ideal)
  region: z.string().max(200).optional(),          // free-text region/location
  endUserOrPartner: z.string().max(200).optional(),// who applies (own farm / co-op / agribusiness partner)
  agronomyJustification: z.string().max(2000).optional(),  // why this rate, this crop, this region
  monitoringPlan: z.string().max(2000).optional(), // how application will be tracked + verified
  notes: z.string().max(1000).optional(),
  attachmentRef: z.string().max(500).optional(),   // link to a signed PDF of the plan
});

// Map dataType -> schema for runtime validation
function validateContent(dataType: string, content: unknown): Record<string, unknown> {
  switch (dataType) {
    case "biomass_receipt":
      return biomassReceiptSchema.parse(content);
    case "pyrolysis_batch":
      return pyrolysisBatchSchema.parse(content);
    case "lab_analysis":
      return labAnalysisSchema.parse(content);
    case "energy_reading":
      return energyReadingSchema.parse(content);
    case "shift_log":
      return shiftLogSchema.parse(content);
    case "incident":
      return incidentSchema.parse(content);
    case "soil_application_plan":
      return soilApplicationPlanSchema.parse(content);
    default:
      throw new Error(`Unknown dataType: ${dataType}`);
  }
}

// ─── Methodology compliance validator ─────────────────────────────────────
//
// Light, deterministic checks (no LLM needed). Cheap to run on every write.
// Populates validationStatus + validationNotes.
//
// Thresholds reflect Puro.earth Edition 2025 + EBC as reference. Future:
// accept a methodology param and branch per methodology.

type ValidationResult = { status: "PASS" | "WARNING" | "FAIL"; notes: string };

function validateAgainstMethodology(dataType: string, content: any): ValidationResult {
  const problems: string[] = [];
  const warnings: string[] = [];

  if (dataType === "pyrolysis_batch") {
    // Puro.earth requires sustained temp >500°C for minimum time
    if (content.peakTempC < 500) {
      problems.push(`Peak temp ${content.peakTempC}°C below 500°C methodology minimum.`);
    } else if (content.peakTempC < 550) {
      warnings.push(`Peak temp ${content.peakTempC}°C is above minimum but low — ideal range 550-700°C.`);
    }
    if (content.sustainedTimeAboveThresholdMin != null && content.sustainedTimeAboveThresholdMin < 3) {
      problems.push(`Sustained time above threshold only ${content.sustainedTimeAboveThresholdMin} min — EBC requires ≥3 min.`);
    }
    // Yield sanity — biochar should be 20-40% of biomass input
    if (content.biomassInputTonnes > 0) {
      const derivedYield = (content.biocharOutputTonnes / content.biomassInputTonnes) * 100;
      if (derivedYield < 20) {
        warnings.push(`Derived yield ${derivedYield.toFixed(1)}% is below typical 25-35% range.`);
      } else if (derivedYield > 40) {
        warnings.push(`Derived yield ${derivedYield.toFixed(1)}% is above typical range — verify measurement.`);
      }
    }
    // Flare efficiency
    if (content.syngasFlareEfficiencyPct != null && content.syngasFlareEfficiencyPct < 95) {
      warnings.push(`Flare efficiency ${content.syngasFlareEfficiencyPct}% below 95% benchmark — raises fugitive CH4 emissions.`);
    }
  }

  if (dataType === "lab_analysis") {
    // H/Corg — critical for durability
    if (content.hCorgMolar != null) {
      if (content.hCorgMolar > 0.7) {
        problems.push(`H/Corg ${content.hCorgMolar} exceeds 0.7 — fails Puro/EBC/Verra biochar definition.`);
      } else if (content.hCorgMolar > 0.4) {
        warnings.push(`H/Corg ${content.hCorgMolar} qualifies as BC-2 (shorter permanence) — for 1000-yr tier need <0.4.`);
      }
    }
    // Organic carbon
    if (content.organicCarbonPct != null && content.organicCarbonPct < 50) {
      warnings.push(`Organic carbon ${content.organicCarbonPct}% is low — typical biochar is 60-90%.`);
    }
    // Heavy metals vs EBC limits (simplified)
    const metals = content.heavyMetals ?? {};
    const ebcLimits = { Pb: 120, Cd: 1.5, Cr: 90, Cu: 100, Ni: 50, Zn: 400, Hg: 1, As: 13 };
    for (const [m, val] of Object.entries(metals)) {
      const limit = (ebcLimits as any)[m];
      if (limit != null && typeof val === "number" && val > limit) {
        problems.push(`Heavy metal ${m} = ${val} µg/g exceeds EBC-basic limit ${limit} µg/g.`);
      }
    }
  }

  if (dataType === "soil_application_plan") {
    // Application rate sanity (typical biochar rates: 5-20 t/ha = 5,000-20,000 kg/ha)
    if (content.applicationRateKgPerHa != null) {
      if (content.applicationRateKgPerHa < 1000) {
        warnings.push(`Application rate ${content.applicationRateKgPerHa} kg/ha is below typical biochar agronomic ranges (5,000-20,000 kg/ha).`);
      } else if (content.applicationRateKgPerHa > 50000) {
        warnings.push(`Application rate ${content.applicationRateKgPerHa} kg/ha is above typical biochar agronomic ranges — verify.`);
      }
    }
    if (!content.monitoringPlan) {
      warnings.push("No monitoring plan recorded. Buyers and certifiers expect a documented method to verify application happens as planned.");
    }
    if (!content.attachmentRef) {
      warnings.push("No signed plan attachment recorded. Long-term soil application plans are typically PDFs signed by the operator and end-user.");
    }
  }

  if (dataType === "biomass_receipt") {
    if (content.moisturePct != null && content.moisturePct > 15) {
      warnings.push(`Biomass moisture ${content.moisturePct}% exceeds 15% — requires additional drying to meet pyrolysis specs.`);
    }
    if (!content.certificationRef) {
      warnings.push(`No certification ref recorded. FSC/PEFC chain of custody is expected for forestry biomass.`);
    }
  }

  if (dataType === "incident") {
    if (content.severity === "HIGH" && !content.reportedToAuthority) {
      warnings.push(`HIGH severity incident logged but not reported to authority. Most jurisdictions require notification.`);
    }
  }

  if (problems.length > 0) {
    return { status: "FAIL", notes: problems.join(" ") };
  }
  if (warnings.length > 0) {
    return { status: "WARNING", notes: warnings.join(" ") };
  }
  return { status: "PASS", notes: "All methodology thresholds met." };
}

// ─── Tier gate helper ─────────────────────────────────────────────────────

function requireExpert(user: { role: string; subscriptionTier: string | null; subscriptionStatus: string | null }) {
  requireTierAccess(user, "expert", "UPGRADE_REQUIRED: Operational Evidence Builder requires Expert tier.");
}

// Verify the project exists and belongs to the user. Returns the project row.
function assertOwnsProject(userId: number, projectId: number) {
  const db = requireDb();
  const rows = db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1)
    .all();
  if (rows.length === 0) throw new Error("Project not found");
  return rows[0];
}

// ─── Router ───────────────────────────────────────────────────────────────

export const evidenceRouter = router({
  /** List all evidence entries for a project, optionally filtered by dataType + date range. */
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        dataType: z.string().optional(),
        fromMs: z.number().optional(),
        toMs: z.number().optional(),
        limit: z.number().int().min(1).max(500).default(200),
      }),
    )
    .query(({ ctx, input }) => {
      assertOwnsProject(ctx.user.id, input.projectId);

      const db = requireDb();
      let q = db.select().from(operationalEvidence).$dynamic();
      const filters: any[] = [eq(operationalEvidence.projectId, input.projectId)];
      if (input.dataType) filters.push(eq(operationalEvidence.dataType, input.dataType as any));
      if (input.fromMs != null) filters.push(gte(operationalEvidence.periodStart, new Date(input.fromMs)));
      if (input.toMs != null) filters.push(lte(operationalEvidence.periodStart, new Date(input.toMs)));
      q = q.where(and(...filters));

      const rows = q.orderBy(desc(operationalEvidence.periodStart)).limit(input.limit).all();
      return rows.map((r) => {
        let content: unknown = null;
        try { content = r.content ? JSON.parse(r.content) : null; } catch {}
        return {
          id: r.id,
          projectId: r.projectId,
          dataType: r.dataType,
          periodStart: r.periodStart ? new Date(r.periodStart).getTime() : 0,
          periodEnd: r.periodEnd ? new Date(r.periodEnd).getTime() : null,
          content,
          validationStatus: r.validationStatus ?? "PENDING",
          validationNotes: r.validationNotes ?? null,
          attachmentRef: r.attachmentRef ?? null,
          createdAt: r.createdAt ? new Date(r.createdAt).getTime() : 0,
          updatedAt: r.updatedAt ? new Date(r.updatedAt).getTime() : 0,
        };
      });
    }),

  /** Per-type counts + validation status rollup for dashboard summary. */
  summary: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ ctx, input }) => {
      assertOwnsProject(ctx.user.id, input.projectId);
      const db = requireDb();
      const rows = db
        .select({
          dataType: operationalEvidence.dataType,
          validationStatus: operationalEvidence.validationStatus,
          c: count(),
        })
        .from(operationalEvidence)
        .where(eq(operationalEvidence.projectId, input.projectId))
        .groupBy(operationalEvidence.dataType, operationalEvidence.validationStatus)
        .all();

      const byType: Record<string, { total: number; pass: number; warning: number; fail: number; pending: number }> = {};
      for (const r of rows) {
        const t = r.dataType;
        if (!byType[t]) byType[t] = { total: 0, pass: 0, warning: 0, fail: 0, pending: 0 };
        byType[t].total += r.c;
        if (r.validationStatus === "PASS") byType[t].pass += r.c;
        else if (r.validationStatus === "WARNING") byType[t].warning += r.c;
        else if (r.validationStatus === "FAIL") byType[t].fail += r.c;
        else byType[t].pending += r.c;
      }

      const totalEntries = Object.values(byType).reduce((s, v) => s + v.total, 0);
      const totalFails = Object.values(byType).reduce((s, v) => s + v.fail, 0);
      const totalWarnings = Object.values(byType).reduce((s, v) => s + v.warning, 0);
      const totalPasses = Object.values(byType).reduce((s, v) => s + v.pass, 0);

      // Overall readiness — % of entries that PASS, weighted
      const readinessPct = totalEntries > 0 ? Math.round((totalPasses / totalEntries) * 100) : 0;

      return { byType, totals: { entries: totalEntries, pass: totalPasses, warning: totalWarnings, fail: totalFails }, readinessPct };
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        dataType: z.enum(["biomass_receipt", "pyrolysis_batch", "lab_analysis", "energy_reading", "shift_log", "incident", "soil_application_plan"]),
        periodStartMs: z.number(),
        periodEndMs: z.number().optional(),
        content: z.unknown(),
        attachmentRef: z.string().max(500).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      requireExpert(ctx.user);
      assertOwnsProject(ctx.user.id, input.projectId);

      // Validate shape
      const validated = validateContent(input.dataType, input.content);
      // Methodology compliance check
      const compliance = validateAgainstMethodology(input.dataType, validated);

      const db = requireDb();
      const now = new Date();
      const result = db
        .insert(operationalEvidence)
        .values({
          userId: ctx.user.id,
          projectId: input.projectId,
          dataType: input.dataType,
          periodStart: new Date(input.periodStartMs),
          periodEnd: input.periodEndMs ? new Date(input.periodEndMs) : null,
          content: JSON.stringify(validated),
          validationStatus: compliance.status,
          validationNotes: compliance.notes,
          attachmentRef: input.attachmentRef ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      return { id: Number(result.lastInsertRowid), validation: compliance };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        periodStartMs: z.number().optional(),
        periodEndMs: z.number().nullable().optional(),
        content: z.unknown().optional(),
        attachmentRef: z.string().max(500).nullable().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      requireExpert(ctx.user);
      const db = requireDb();
      const existingRows = db
        .select()
        .from(operationalEvidence)
        .where(
          and(
            eq(operationalEvidence.id, input.id),
            eq(operationalEvidence.userId, ctx.user.id),
          ),
        )
        .limit(1)
        .all();
      if (existingRows.length === 0) throw new Error("Evidence entry not found");
      const existing = existingRows[0];

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.periodStartMs != null) updates.periodStart = new Date(input.periodStartMs);
      if (input.periodEndMs !== undefined) updates.periodEnd = input.periodEndMs ? new Date(input.periodEndMs) : null;
      if (input.attachmentRef !== undefined) updates.attachmentRef = input.attachmentRef;

      if (input.content !== undefined) {
        const validated = validateContent(existing.dataType, input.content);
        const compliance = validateAgainstMethodology(existing.dataType, validated);
        updates.content = JSON.stringify(validated);
        updates.validationStatus = compliance.status;
        updates.validationNotes = compliance.notes;
      }

      db.update(operationalEvidence).set(updates as any).where(eq(operationalEvidence.id, input.id)).run();
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const db = requireDb();
      db.delete(operationalEvidence)
        .where(
          and(
            eq(operationalEvidence.id, input.id),
            eq(operationalEvidence.userId, ctx.user.id),
          ),
        )
        .run();
      return { success: true };
    }),

  /**
   * What evidence does the auditor expect for this methodology? Returns a
   * checklist of dataTypes + recommended cadence. Used by the UI to show
   * the operator "here's what you need to be capturing."
   *
   * For now this is a static list keyed to Puro.earth Edition 2025. Future:
   * customize per methodology + per project scale.
   */
  auditChecklist: protectedProcedure.query(() => {
    return [
      { dataType: "biomass_receipt", label: "Biomass receipts", cadence: "Per truck", why: "Puro/Verra require chain-of-custody on every batch." },
      { dataType: "pyrolysis_batch", label: "Pyrolysis batches", cadence: "Per batch (or hourly for continuous)", why: "Temperature + residence time are core methodology thresholds." },
      { dataType: "lab_analysis", label: "Lab analyses", cadence: "Per batch (basic) + monthly (advanced)", why: "H/Corg + heavy metals required for EBC / Puro / Isometric." },
      { dataType: "energy_reading", label: "Energy consumption", cadence: "Daily or monthly totalizer", why: "Net CDR calculation needs electricity, NG, diesel consumption." },
      { dataType: "shift_log", label: "Shift logs", cadence: "Per shift", why: "Audit trail of operator, downtime, quality notes." },
      { dataType: "incident", label: "Incidents", cadence: "As occurs", why: "Safety/env incidents must be logged and reported per local regs." },
    ];
  }),
});
