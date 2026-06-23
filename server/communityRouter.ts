/**
 * Community Impact Tracker router — Stage 3, module 3.
 *
 * Auditable log of community engagement + social co-benefits:
 *   - meetings held with stakeholders
 *   - grievances received + resolved
 *   - local hires vs total hires
 *   - local procurement vs total procurement
 *   - community investments
 *   - biochar donations / benefit-sharing
 *   - environmental monitoring (air, water, noise)
 *
 * Closes the 3rd dealbreaker Microsoft flagged to Pablo: "social & community
 * impact must be real, not decoration."
 *
 * Tier gate: Expert (admins bypass).
 */

import { z } from "zod";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import { communityRecords, projects } from "../drizzle/schema";
import { invokeLLM, buildLangDirective } from "./_core/llm";
import { logAiCall } from "./_core/aiCallLog";
import { requireTierAccess } from "./_core/access";

// ─── Per-type content schemas ────────────────────────────────────────────

const meetingSchema = z.object({
  title: z.string().min(1).max(200),
  location: z.string().max(200).optional(),
  attendeesCount: z.number().int().min(0),
  attendeesNotes: z.string().max(2000).optional(),   // who (organizations, representative names)
  agenda: z.string().max(2000).optional(),
  decisions: z.string().max(2000).optional(),
  minutesRef: z.string().max(300).optional(),        // URL or file ref
});

const grievanceSchema = z.object({
  reportedBy: z.string().max(200),
  category: z.enum(["noise", "dust", "water", "traffic", "labor", "land", "other"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  description: z.string().min(1).max(2000),
  resolution: z.string().max(2000).optional(),
  resolvedAtMs: z.number().optional(),
  reportedToAuthority: z.boolean().optional(),
  authorityName: z.string().max(200).optional(),
});

const localHireSchema = z.object({
  personName: z.string().max(200),
  role: z.string().max(200),
  homeLocation: z.string().max(200).optional(),
  isFromLocalCommunity: z.boolean(),        // operator defines the radius (typ. 20-50 km)
  startDateMs: z.number(),
  trainingProvided: z.string().max(500).optional(),
  hourlyWageUsd: z.number().min(0).optional(),
});

const localProcurementSchema = z.object({
  supplierName: z.string().min(1).max(200),
  supplierLocation: z.string().max(200).optional(),
  amountUsd: z.number().min(0),
  category: z.string().max(200).optional(),          // materials, services, logistics, food, etc.
  isFromLocalCommunity: z.boolean(),
  invoiceRef: z.string().max(200).optional(),
});

const communityInvestmentSchema = z.object({
  category: z.enum(["education", "infrastructure", "health", "environment", "social", "other"]),
  amountUsd: z.number().min(0),
  description: z.string().min(1).max(2000),
  beneficiariesCount: z.number().int().min(0).optional(),
  beneficiariesNotes: z.string().max(1000).optional(),
  partnerOrg: z.string().max(200).optional(),        // co-invested with whom (NGO, local gov't)
});

const benefitShareSchema = z.object({
  type: z.enum(["biochar_donation", "training_program", "crop_improvement", "infrastructure_use", "other"]),
  description: z.string().min(1).max(2000),
  tonnesBiochar: z.number().min(0).optional(),       // only for biochar_donation
  beneficiariesCount: z.number().int().min(0).optional(),
  beneficiariesNotes: z.string().max(1000).optional(),
  measuredOutcome: z.string().max(1000).optional(),  // "yield increase 12%", "graduated 24 technicians"
});

const envMonitoringSchema = z.object({
  parameter: z.enum(["air_pm10", "air_pm25", "air_no2", "air_so2", "air_co", "noise", "water_ph", "water_turbidity", "water_cod", "soil", "other"]),
  measurementLocation: z.string().max(200).optional(),
  value: z.number(),
  unit: z.string().max(50),                          // "µg/m³", "dB", "mg/L"
  thresholdLimit: z.number().optional(),
  passesThreshold: z.boolean().optional(),
  labOrInstrument: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

function validateContent(recordType: string, content: unknown): Record<string, unknown> {
  switch (recordType) {
    case "meeting": return meetingSchema.parse(content);
    case "grievance": return grievanceSchema.parse(content);
    case "local_hire": return localHireSchema.parse(content);
    case "local_procurement": return localProcurementSchema.parse(content);
    case "community_investment": return communityInvestmentSchema.parse(content);
    case "benefit_share": return benefitShareSchema.parse(content);
    case "env_monitoring": return envMonitoringSchema.parse(content);
    default: throw new Error(`Unknown recordType: ${recordType}`);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function requireExpert(user: { role: string; subscriptionTier: string | null; subscriptionStatus: string | null }) {
  requireTierAccess(user, "expert", "UPGRADE_REQUIRED: Community Impact Tracker requires Expert tier.");
}

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

export const communityRouter = router({
  /** List records for a project, filtered by type + date range. */
  list: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        recordType: z.string().optional(),
        fromMs: z.number().optional(),
        toMs: z.number().optional(),
        limit: z.number().int().min(1).max(500).default(200),
      }),
    )
    .query(({ ctx, input }) => {
      assertOwnsProject(ctx.user.id, input.projectId);
      const db = requireDb();
      const filters: any[] = [eq(communityRecords.projectId, input.projectId)];
      if (input.recordType) filters.push(eq(communityRecords.recordType, input.recordType as any));
      if (input.fromMs != null) filters.push(gte(communityRecords.recordDate, new Date(input.fromMs)));
      if (input.toMs != null) filters.push(lte(communityRecords.recordDate, new Date(input.toMs)));
      const rows = db.select().from(communityRecords).where(and(...filters)).orderBy(desc(communityRecords.recordDate)).limit(input.limit).all();

      return rows.map((r) => {
        let content: unknown = null;
        try { content = r.content ? JSON.parse(r.content) : null; } catch {}
        return {
          id: r.id,
          recordType: r.recordType,
          recordDate: r.recordDate ? new Date(r.recordDate).getTime() : 0,
          content,
          status: r.status,
          attachmentRef: r.attachmentRef,
          createdAt: r.createdAt ? new Date(r.createdAt).getTime() : 0,
          updatedAt: r.updatedAt ? new Date(r.updatedAt).getTime() : 0,
        };
      });
    }),

  /** Aggregated KPIs used for the dashboard summary. */
  summary: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ ctx, input }) => {
      assertOwnsProject(ctx.user.id, input.projectId);
      const db = requireDb();
      const rows = db
        .select()
        .from(communityRecords)
        .where(eq(communityRecords.projectId, input.projectId))
        .all();

      const parse = (r: typeof rows[number]) => {
        try { return r.content ? JSON.parse(r.content) : null; } catch { return null; }
      };

      const meetings = rows.filter((r) => r.recordType === "meeting");
      const grievances = rows.filter((r) => r.recordType === "grievance");
      const localHires = rows.filter((r) => r.recordType === "local_hire");
      const localProc = rows.filter((r) => r.recordType === "local_procurement");
      const investments = rows.filter((r) => r.recordType === "community_investment");
      const benefits = rows.filter((r) => r.recordType === "benefit_share");
      const envMon = rows.filter((r) => r.recordType === "env_monitoring");

      // Grievances: open/resolved ratio
      const grievancesOpen = grievances.filter((r) => r.status === "open" || r.status === "in_progress").length;
      const grievancesResolved = grievances.filter((r) => r.status === "resolved" || r.status === "closed").length;
      const grievancesResolutionPct = grievances.length > 0 ? Math.round((grievancesResolved / grievances.length) * 100) : 100;

      // Local workforce %
      const hiresParsed = localHires.map(parse);
      const localHireCount = hiresParsed.filter((c) => c?.isFromLocalCommunity === true).length;
      const localHirePct = localHires.length > 0 ? Math.round((localHireCount / localHires.length) * 100) : 0;

      // Local procurement: $ + %
      const procParsed = localProc.map(parse);
      const totalProcUsd = procParsed.reduce((s, c) => s + (c?.amountUsd ?? 0), 0);
      const localProcUsd = procParsed.filter((c) => c?.isFromLocalCommunity === true).reduce((s, c) => s + (c?.amountUsd ?? 0), 0);
      const localProcPct = totalProcUsd > 0 ? Math.round((localProcUsd / totalProcUsd) * 100) : 0;

      // Community investment total
      const investmentsParsed = investments.map(parse);
      const totalInvestmentUsd = investmentsParsed.reduce((s, c) => s + (c?.amountUsd ?? 0), 0);
      const beneficiariesReached = investmentsParsed.reduce((s, c) => s + (c?.beneficiariesCount ?? 0), 0);

      // Biochar donated
      const benefitsParsed = benefits.map(parse);
      const tonnesBiocharDonated = benefitsParsed
        .filter((c) => c?.type === "biochar_donation")
        .reduce((s, c) => s + (c?.tonnesBiochar ?? 0), 0);

      // Environmental monitoring pass rate
      const envParsed = envMon.map(parse);
      const envWithThreshold = envParsed.filter((c) => c?.passesThreshold != null);
      const envPassCount = envParsed.filter((c) => c?.passesThreshold === true).length;
      const envPassPct = envWithThreshold.length > 0 ? Math.round((envPassCount / envWithThreshold.length) * 100) : null;

      return {
        totals: {
          records: rows.length,
          meetings: meetings.length,
          grievances: grievances.length,
          localHires: localHires.length,
          localProc: localProc.length,
          investments: investments.length,
          benefits: benefits.length,
          envMonitoring: envMon.length,
        },
        grievances: {
          open: grievancesOpen,
          resolved: grievancesResolved,
          resolutionPct: grievancesResolutionPct,
        },
        workforce: {
          totalHires: localHires.length,
          localHires: localHireCount,
          localPct: localHirePct,
        },
        procurement: {
          totalUsd: totalProcUsd,
          localUsd: localProcUsd,
          localPct: localProcPct,
        },
        investment: {
          totalUsd: totalInvestmentUsd,
          beneficiariesReached,
        },
        benefits: {
          tonnesBiocharDonated,
        },
        envMonitoring: {
          measurements: envMon.length,
          passPct: envPassPct,
        },
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        recordType: z.enum(["meeting", "grievance", "local_hire", "local_procurement", "community_investment", "benefit_share", "env_monitoring"]),
        recordDateMs: z.number(),
        content: z.unknown(),
        status: z.enum(["open", "in_progress", "resolved", "closed", "dismissed"]).optional(),
        attachmentRef: z.string().max(500).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      requireExpert(ctx.user);
      assertOwnsProject(ctx.user.id, input.projectId);
      const validated = validateContent(input.recordType, input.content);

      // Grievance default status: open
      const defaultStatus: "open" | "closed" = input.recordType === "grievance" ? "open" : "closed";
      const status = input.status ?? defaultStatus;

      const db = requireDb();
      const now = new Date();
      const result = db
        .insert(communityRecords)
        .values({
          userId: ctx.user.id,
          projectId: input.projectId,
          recordType: input.recordType,
          recordDate: new Date(input.recordDateMs),
          content: JSON.stringify(validated),
          status,
          attachmentRef: input.attachmentRef ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      return { id: Number(result.lastInsertRowid) };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        recordDateMs: z.number().optional(),
        content: z.unknown().optional(),
        status: z.enum(["open", "in_progress", "resolved", "closed", "dismissed"]).optional(),
        attachmentRef: z.string().max(500).nullable().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      requireExpert(ctx.user);
      const db = requireDb();
      const existingRows = db
        .select()
        .from(communityRecords)
        .where(and(eq(communityRecords.id, input.id), eq(communityRecords.userId, ctx.user.id)))
        .limit(1)
        .all();
      if (existingRows.length === 0) throw new Error("Record not found");
      const existing = existingRows[0];

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.recordDateMs != null) updates.recordDate = new Date(input.recordDateMs);
      if (input.status != null) updates.status = input.status;
      if (input.attachmentRef !== undefined) updates.attachmentRef = input.attachmentRef;
      if (input.content !== undefined) {
        const validated = validateContent(existing.recordType, input.content);
        updates.content = JSON.stringify(validated);
      }
      db.update(communityRecords).set(updates as any).where(eq(communityRecords.id, input.id)).run();
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const db = requireDb();
      db.delete(communityRecords)
        .where(and(eq(communityRecords.id, input.id), eq(communityRecords.userId, ctx.user.id)))
        .run();
      return { success: true };
    }),

  /**
   * AI-generated Community Impact Report. Sums up every record from the
   * given period into a narrative aligned with IFC Performance Standards +
   * SDG framework. This is THE doc operators send to corporate buyers as
   * evidence of real community impact.
   */
  generateImpactReport: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        periodStartMs: z.number(),
        periodEndMs: z.number(),
        lang: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireExpert(ctx.user);
      const project = assertOwnsProject(ctx.user.id, input.projectId);
      const db = requireDb();
      const rows = db
        .select()
        .from(communityRecords)
        .where(
          and(
            eq(communityRecords.projectId, input.projectId),
            gte(communityRecords.recordDate, new Date(input.periodStartMs)),
            lte(communityRecords.recordDate, new Date(input.periodEndMs)),
          ),
        )
        .orderBy(desc(communityRecords.recordDate))
        .all();

      if (rows.length === 0) {
        throw new Error("No community records in the selected period — log some activity first.");
      }

      // Compact payload for the LLM — strip userIds, flatten content
      const parsed = rows.map((r) => {
        let content: unknown = null;
        try { content = r.content ? JSON.parse(r.content) : null; } catch {}
        return {
          type: r.recordType,
          date: r.recordDate ? new Date(r.recordDate).toISOString() : null,
          status: r.status,
          content,
        };
      });

      const systemPrompt = `You are a senior ESG and community engagement auditor. You write Community Impact Reports that corporate CDR buyers (Microsoft, Shell, Altitude) and certification bodies (Puro.earth, Verra, Rainbow Standard) accept as evidence of real community impact.

Your writing is factual, specific, and grounded ONLY in the records provided. You never invent numbers, names, or activities not present in the data. When a category has no records, you say so explicitly — "no records logged this period" is better than fluff.

Output format: Markdown. Mark as "DRAFT — AI-generated, requires human review" at the top.

Structure:
1. Executive summary (3-4 sentences)
2. Engagement methods (ATSDR continuum) — summarize meetings
3. Grievance mechanism & resolution (rate, trends, open items)
4. Local economic impact — hiring % + procurement % + specific examples
5. Community investments — amount + beneficiary reach + partners
6. Non-carbon co-benefits — biochar donations, training, etc.
7. Environmental monitoring summary
8. SDG alignment — map documented activities to specific SDGs (only those genuinely supported by the data)
9. IFC Performance Standards alignment — which PS2, PS4, PS5, PS8 elements are evidenced
10. Gaps and next period priorities

Length: 800-1400 words. Keep it tight and honest.${buildLangDirective(input.lang)}`;

      const userPrompt = `Generate a Community Impact Report for:
- Project: ${project.name}
- Period: ${new Date(input.periodStartMs).toISOString().slice(0, 10)} to ${new Date(input.periodEndMs).toISOString().slice(0, 10)}
- Country: ${project.country ?? "unspecified"}
- Location: ${project.location ?? "unspecified"}

Total records in period: ${rows.length}

Records (JSON):
${JSON.stringify(parsed, null, 2)}

Generate the report now. Be honest about gaps. Ground every number in the data.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "text" },
      });

      const content = response.choices[0]?.message?.content ?? "";
      const promptTokens = response.usage?.prompt_tokens ?? 0;
      const completionTokens = response.usage?.completion_tokens ?? 0;

      logAiCall({
        userId: ctx.user.id,
        feature: "community.impact_report",
        projectId: input.projectId,
        promptTokens,
        completionTokens,
        status: content ? "ok" : "error",
        errorMsg: content ? null : "Empty LLM response",
        metadata: {
          recordsAnalyzed: rows.length,
          periodStartMs: input.periodStartMs,
          periodEndMs: input.periodEndMs,
        },
      });

      return {
        content,
        tokenUsage: {
          prompt: promptTokens,
          completion: completionTokens,
        },
        recordsAnalyzed: rows.length,
        periodStartMs: input.periodStartMs,
        periodEndMs: input.periodEndMs,
      };
    }),
});
