/**
 * AI Project Builder router — Engineer tier feature.
 *
 * Endpoints:
 *   - create: user submits biomass + capacity + country → we queue generation
 *             and return the project id immediately. Generation runs in the
 *             background and writes docs to the DB as they complete.
 *   - get: fetch a project + its generated docs (for progressive rendering)
 *   - list: user's AI-generated projects
 *   - delete: remove a generated project
 *   - retryDoc: regenerate a single doc (if it errored)
 */

import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { adminProcedure } from "./_core/trpc";
import { requireDb, getRawDb } from "./db";
import { aiGeneratedProjects, aiDocFeedback, customMethodologies, projects, users } from "../drizzle/schema";
import {
  DOC_DEFINITIONS,
  CUSTOM_METHODOLOGY_DOC,
  getDocsForProject,
  generateDoc,
  getDocDefinition,
  sanitizeGeneratedDocForDisplay,
  type GeneratedDoc,
  type ProjectInput,
} from "./_core/aiProjectBuilder";
import { FEEDSTOCK_DB } from "../client/src/lib/biocharModel";
import { resolveProjectFeedstock } from "../client/src/lib/projectFeedstock";
import {
  buildAiHandoffDescription,
  buildAiHandoffLikeDescription,
  buildLegacyAiHandoffDescription,
  buildLegacyAiHandoffLikeDescription,
} from "../client/src/lib/aiHandoff";
import { hasTierAccessForUser, isLocalAdminBypass } from "./_core/access";

// Gemini 2.5 Flash pricing (as of April 2026):
//   - $0.075 per 1M input tokens
//   - $0.30 per 1M output tokens
// These are used by the admin stats endpoint to estimate LLM cost.
const GEMINI_INPUT_COST_PER_M_USD = 0.075;
const GEMINI_OUTPUT_COST_PER_M_USD = 0.30;

function estimateCostUsd(promptTokens: number, completionTokens: number): number {
  return (
    (promptTokens / 1_000_000) * GEMINI_INPUT_COST_PER_M_USD +
    (completionTokens / 1_000_000) * GEMINI_OUTPUT_COST_PER_M_USD
  );
}

// Rate limits per Expert user. Each full project generation currently costs
// ~USD $0.021 at Gemini 2.5 Flash prices. These caps protect against abuse
// while allowing heavy legitimate use (e.g. testing different biomass/capacity
// combos for a portfolio).
//
// Admin users bypass both limits — they already have full platform access.
const DAILY_CAP = 20;
const MONTHLY_CAP = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * DAY_MS;

function checkAiRateLimit(userId: number, isAdmin: boolean) {
  if (isAdmin) return;
  const sqlite = getRawDb();
  if (!sqlite) return; // fail-open if DB is down (not our main concern here)

  const now = Date.now();
  const dayAgo = now - DAY_MS;
  const monthAgo = now - MONTH_MS;

  const dayRow = sqlite.prepare(
    `SELECT COUNT(*) as c FROM aiGeneratedProjects WHERE userId = ? AND createdAt >= ?`,
  ).get(userId, dayAgo) as { c: number };
  if (dayRow.c >= DAILY_CAP) {
    throw new Error(
      `RATE_LIMITED: You've reached the daily cap of ${DAILY_CAP} AI-generated projects. Try again in 24 hours, or contact support if you need a higher limit.`,
    );
  }

  const monthRow = sqlite.prepare(
    `SELECT COUNT(*) as c FROM aiGeneratedProjects WHERE userId = ? AND createdAt >= ?`,
  ).get(userId, monthAgo) as { c: number };
  if (monthRow.c >= MONTHLY_CAP) {
    throw new Error(
      `RATE_LIMITED: You've reached the monthly cap of ${MONTHLY_CAP} AI-generated projects. Contact support to raise the limit.`,
    );
  }
}

// Map ISO-2 codes to full names. Keeps prompts consistent even if the user
// enters the code vs the name.
const COUNTRY_NAMES: Record<string, string> = {
  AR: "Argentina", BR: "Brazil", CL: "Chile", CO: "Colombia", MX: "Mexico",
  PE: "Peru", UY: "Uruguay", PY: "Paraguay", EC: "Ecuador", BO: "Bolivia",
  US: "United States", CA: "Canada", ES: "Spain", FR: "France", DE: "Germany",
  IT: "Italy", PT: "Portugal", NL: "Netherlands", UK: "United Kingdom",
  IN: "India", CN: "China", AU: "Australia", ID: "Indonesia", TH: "Thailand",
  VN: "Vietnam", ZA: "South Africa", KE: "Kenya", GH: "Ghana", NG: "Nigeria",
};

function resolveCountryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code;
}

function buildLinkedProjectHandoffClause(aiProjectId: number) {
  const handoffDescription = buildAiHandoffDescription(aiProjectId);
  const legacyHandoffDescription = buildLegacyAiHandoffDescription(aiProjectId);
  const handoffLike = buildAiHandoffLikeDescription(aiProjectId);
  const legacyHandoffLike = buildLegacyAiHandoffLikeDescription(aiProjectId);

  return {
    handoffDescription,
    clause: sql`(
      ${projects.description} = ${handoffDescription}
      OR ${projects.description} = ${legacyHandoffDescription}
      OR ${projects.description} LIKE ${handoffLike}
      OR ${projects.description} LIKE ${legacyHandoffLike}
    )`,
  };
}

function findLinkedProjectsForAiProject(db: ReturnType<typeof requireDb>, userId: number, aiProjectId: number) {
  const { clause } = buildLinkedProjectHandoffClause(aiProjectId);

  return db
    .select({
      id: projects.id,
      description: projects.description,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(and(eq(projects.userId, userId), clause))
    .orderBy(desc(projects.updatedAt), desc(projects.id))
    .all();
}

// ─── Background generation worker ──────────────────────────────────────────
// This runs async after `create` returns. We update the DB row as each doc
// completes so the UI can poll and render progressively. A user can also
// trigger a single-doc retry from the UI.

async function runGenerationInBackground(projectId: number, input: ProjectInput) {
  const db = requireDb();

  // Mark as generating
  db.update(aiGeneratedProjects)
    .set({ status: "generating", updatedAt: new Date() })
    .where(eq(aiGeneratedProjects.id, projectId))
    .run();

  const completedDocs: Record<string, GeneratedDoc> = {};
  let totalPrompt = 0;
  let totalCompletion = 0;

  // Includes Custom Methodology Compliance doc IFF the project has a
  // customMethodology attached.
  const queue = getDocsForProject(input).sort((a, b) => a.order - b.order);
  const MAX_CONCURRENT = 5;
  const inflight: Promise<void>[] = [];

  async function runOne(docDef: typeof DOC_DEFINITIONS[number]): Promise<void> {
    try {
      const doc = await generateDoc(docDef, input);
      completedDocs[doc.docId] = doc;
      totalPrompt += doc.tokenUsage.prompt;
      totalCompletion += doc.tokenUsage.completion;

      // Persist after each doc so the UI sees progress
      db.update(aiGeneratedProjects)
        .set({
          generatedDocs: JSON.stringify(completedDocs),
          totalPromptTokens: totalPrompt,
          totalCompletionTokens: totalCompletion,
          updatedAt: new Date(),
        })
        .where(eq(aiGeneratedProjects.id, projectId))
        .run();
    } catch (err) {
      // Should not reach here — generateDoc catches internally — but belt-and-suspenders
      console.warn(`[aiBuilder] Doc ${docDef.id} failed for project ${projectId}:`, err);
    }
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

  // Mark complete (or error if all docs errored)
  const hasAnySuccess = Object.values(completedDocs).some((d) => !d.error);
  db.update(aiGeneratedProjects)
    .set({
      status: hasAnySuccess ? "complete" : "error",
      errorMessage: hasAnySuccess ? null : "All document generations failed",
      updatedAt: new Date(),
    })
    .where(eq(aiGeneratedProjects.id, projectId))
    .run();
}

// ─── Router definition ────────────────────────────────────────────────────

export const aiBuilderRouter = router({
  /**
   * List all doc definitions (metadata only — UI uses this to render the
   * "generating..." placeholders before content arrives).
   */
  listDocTypes: protectedProcedure.query(() => {
    return DOC_DEFINITIONS.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      category: d.category,
      format: d.format,
      order: d.order,
    }));
  }),

  /**
   * Create a new AI-generated project. Returns immediately with the project
   * ID; generation runs in the background. The client polls `get` to watch
   * docs appear.
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        biomassId: z.string().max(100),
        biomassName: z.string().min(1).max(200),
        biomassComposition: z
          .object({
            C: z.number(),
            H: z.number(),
            O: z.number(),
            N: z.number(),
            S: z.number(),
            ash: z.number(),
            moisture: z.number(),
          })
          .optional(),
        biomassSource: z.string().max(200).optional(),
        capacityTnYear: z.number().min(1000).max(1_000_000),
        country: z.string().length(2), // ISO-2
        location: z.string().max(200).optional(),
        offtakerType: z.enum(["investor", "certifier", "both"]).default("both"),
        targetMethodology: z
          .enum(["puro-earth", "isometric", "ebc", "verra-vm0044", "gold-standard", "rainbow-standard"])
          .optional(),
        // Optional custom methodology ID — if provided, AI Builder emits a
        // Custom Methodology Compliance doc on top of the standard 17.
        customMethodologyId: z.number().int().optional(),
        // Output language for the 17 docs ("en" | "es"). Falls back to "en"
        // if undefined.
        lang: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const bypass = isLocalAdminBypass(ctx.user);
      if (!hasTierAccessForUser(ctx.user, "engineer")) {
        throw new Error("UPGRADE_REQUIRED: AI Project Builder requires Engineer tier or higher.");
      }

      // Rate limit — protects against LLM cost explosion from abuse/bugs.
      checkAiRateLimit(ctx.user.id, bypass);

      const db = requireDb();

      // Resolve custom methodology if the user attached one. Must belong to
      // the same user to prevent cross-account reads.
      let customMethodologyPayload: ProjectInput["customMethodology"] = undefined;
      if (input.customMethodologyId) {
        const cmRows = db
          .select()
          .from(customMethodologies)
          .where(
            and(
              eq(customMethodologies.id, input.customMethodologyId),
              eq(customMethodologies.userId, ctx.user.id),
            ),
          )
          .limit(1)
          .all();
        if (cmRows.length === 0) {
          throw new Error("Custom methodology not found or not owned by you.");
        }
        const cm = cmRows[0];
        let parsedCriteria: Array<{ id: string; label: string; description: string; thresholdNote?: string }> = [];
        try {
          parsedCriteria = cm.criteria ? JSON.parse(cm.criteria) : [];
        } catch {}
        customMethodologyPayload = {
          id: cm.id,
          name: cm.name,
          description: cm.description ?? "",
          basedOn: cm.basedOn ?? null,
          criteria: parsedCriteria,
        };
      }

      // Insert the project row in "pending" state.
      const now = new Date();
      const result = db
        .insert(aiGeneratedProjects)
        .values({
          userId: ctx.user.id,
          name: input.name,
          biomassId: input.biomassId,
          biomassData: JSON.stringify({
            name: input.biomassName,
            composition: input.biomassComposition ?? null,
            source: input.biomassSource ?? null,
          }),
          capacityTnYear: input.capacityTnYear,
          country: input.country.toUpperCase(),
          location: input.location ?? null,
          offtakerType: input.offtakerType,
          targetMethodology: input.targetMethodology ?? null,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const projectId = Number(result.lastInsertRowid);

      // Kick off background generation. We intentionally do NOT await this —
      // the user gets the project ID back immediately and the UI polls for
      // progress.
      const projectInput: ProjectInput = {
        projectName: input.name,
        biomass: {
          name: input.biomassName,
          elementalComposition: input.biomassComposition,
          source: input.biomassSource,
        },
        capacityTnYear: input.capacityTnYear,
        country: input.country.toUpperCase(),
        countryName: resolveCountryName(input.country),
        location: input.location,
        offtakerType: input.offtakerType,
        targetMethodology: input.targetMethodology,
        customMethodology: customMethodologyPayload,
        lang: input.lang,
      };

      // Fire and forget
      runGenerationInBackground(projectId, projectInput).catch((err) => {
        console.error(`[aiBuilder] Background generation failed for project ${projectId}:`, err);
        db.update(aiGeneratedProjects)
          .set({
            status: "error",
            errorMessage: err instanceof Error ? err.message : String(err),
            updatedAt: new Date(),
          })
          .where(eq(aiGeneratedProjects.id, projectId))
          .run();
      });

      return { projectId };
    }),

  /**
   * Fetch a single project with its generated docs. Used by the UI for
   * progressive rendering via polling.
   */
  get: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ ctx, input }) => {
      const db = requireDb();
      const rows = db
        .select()
        .from(aiGeneratedProjects)
        .where(
          and(
            eq(aiGeneratedProjects.id, input.projectId),
            eq(aiGeneratedProjects.userId, ctx.user.id),
          ),
        )
        .limit(1)
        .all();

      if (rows.length === 0) throw new Error("Project not found");
      const row = rows[0];

      let biomassData: unknown = null;
      try {
        if (row.biomassData) biomassData = JSON.parse(row.biomassData);
      } catch {}

      let docs: Record<string, GeneratedDoc> = {};
      try {
        if (row.generatedDocs) docs = JSON.parse(row.generatedDocs);
      } catch {}
      docs = Object.fromEntries(
        Object.entries(docs).map(([docId, doc]) => [
          docId,
          sanitizeGeneratedDocForDisplay(doc, undefined),
        ]),
      );
      const linkedProjects = findLinkedProjectsForAiProject(db, ctx.user.id, row.id);
      const canonicalLinkedProject = linkedProjects[0] ?? null;

      return {
        id: row.id,
        name: row.name,
        biomassId: row.biomassId,
        biomassData,
        capacityTnYear: row.capacityTnYear,
        country: row.country,
        location: row.location,
        offtakerType: row.offtakerType,
        targetMethodology: row.targetMethodology,
        status: row.status,
        errorMessage: row.errorMessage,
        docs,
        totalPromptTokens: row.totalPromptTokens ?? 0,
        totalCompletionTokens: row.totalCompletionTokens ?? 0,
        createdAt: row.createdAt ? new Date(row.createdAt).getTime() : 0,
        updatedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : 0,
        linkedProjectId: canonicalLinkedProject?.id ?? null,
        linkedProjectCount: linkedProjects.length,
      };
    }),

  /** List the user's AI-generated projects (ordered newest first). */
  list: protectedProcedure.query(({ ctx }) => {
    const db = requireDb();
    const rows = db
      .select()
      .from(aiGeneratedProjects)
      .where(eq(aiGeneratedProjects.userId, ctx.user.id))
      .orderBy(desc(aiGeneratedProjects.createdAt))
      .all();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      capacityTnYear: r.capacityTnYear,
      country: r.country,
      status: r.status,
      createdAt: r.createdAt ? new Date(r.createdAt).getTime() : 0,
      updatedAt: r.updatedAt ? new Date(r.updatedAt).getTime() : 0,
    }));
  }),

  /** Delete a project (owner only). */
  delete: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const db = requireDb();
      db.delete(aiGeneratedProjects)
        .where(
          and(
            eq(aiGeneratedProjects.id, input.projectId),
            eq(aiGeneratedProjects.userId, ctx.user.id),
          ),
        )
        .run();
      return { success: true };
    }),

  /**
   * Admin-only: aggregated stats for the AI Project Builder.
   * Used by the /admin/ai-stats dashboard to monitor LLM consumption, cost,
   * and adoption.
   */
  adminStats: adminProcedure.query(() => {
    const sqlite = getRawDb();
    if (!sqlite) {
      return {
        totalProjects: 0,
        byStatus: {},
        tokens: { prompt: 0, completion: 0, total: 0 },
        costUsd: 0,
        byUser: [],
        recentProjects: [],
        perDocStats: [],
      };
    }

    const totalRow = sqlite.prepare("SELECT COUNT(*) as c FROM aiGeneratedProjects").get() as { c: number };
    const statusRows = sqlite.prepare(
      "SELECT status, COUNT(*) as c FROM aiGeneratedProjects GROUP BY status",
    ).all() as Array<{ status: string; c: number }>;

    const tokenRows = sqlite.prepare(
      "SELECT SUM(totalPromptTokens) as p, SUM(totalCompletionTokens) as c FROM aiGeneratedProjects",
    ).get() as { p: number | null; c: number | null };

    const promptTokens = tokenRows.p ?? 0;
    const completionTokens = tokenRows.c ?? 0;

    const byUserRows = sqlite.prepare(
      `SELECT aiGeneratedProjects.userId as userId, users.email as email,
              COUNT(*) as projectCount,
              SUM(totalPromptTokens) as promptTokens,
              SUM(totalCompletionTokens) as completionTokens
       FROM aiGeneratedProjects
       LEFT JOIN users ON users.id = aiGeneratedProjects.userId
       GROUP BY aiGeneratedProjects.userId
       ORDER BY projectCount DESC
       LIMIT 20`,
    ).all() as Array<{ userId: number; email: string | null; projectCount: number; promptTokens: number | null; completionTokens: number | null }>;

    const recentRows = sqlite.prepare(
      `SELECT id, userId, name, country, capacityTnYear, status, totalPromptTokens, totalCompletionTokens, createdAt, updatedAt
       FROM aiGeneratedProjects
       ORDER BY createdAt DESC
       LIMIT 20`,
    ).all() as Array<{
      id: number; userId: number; name: string; country: string; capacityTnYear: number;
      status: string; totalPromptTokens: number | null; totalCompletionTokens: number | null;
      createdAt: number; updatedAt: number;
    }>;

    // Feedback aggregation per docId — tells us which generators underperform
    // at a glance. Sorted by % down (worst first) so the admin knows which
    // prompt to iterate on next.
    const feedbackRows = sqlite.prepare(
      `SELECT docId,
              SUM(CASE WHEN vote = 'up' THEN 1 ELSE 0 END) as up,
              SUM(CASE WHEN vote = 'down' THEN 1 ELSE 0 END) as down,
              COUNT(*) as total
       FROM aiDocFeedback
       GROUP BY docId`,
    ).all() as Array<{ docId: string; up: number; down: number; total: number }>;

    const perDocFeedback = feedbackRows.map((r) => ({
      docId: r.docId,
      up: r.up,
      down: r.down,
      total: r.total,
      downRate: r.total > 0 ? r.down / r.total : 0,
    })).sort((a, b) => b.downRate - a.downRate);

    return {
      totalProjects: totalRow.c,
      byStatus: Object.fromEntries(statusRows.map((r) => [r.status, r.c])),
      tokens: {
        prompt: promptTokens,
        completion: completionTokens,
        total: promptTokens + completionTokens,
      },
      costUsd: estimateCostUsd(promptTokens, completionTokens),
      byUser: byUserRows.map((r) => ({
        userId: r.userId,
        email: r.email ?? "(deleted)",
        projectCount: r.projectCount,
        promptTokens: r.promptTokens ?? 0,
        completionTokens: r.completionTokens ?? 0,
        costUsd: estimateCostUsd(r.promptTokens ?? 0, r.completionTokens ?? 0),
      })),
      recentProjects: recentRows.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        country: r.country,
        capacityTnYear: r.capacityTnYear,
        status: r.status,
        tokens: (r.totalPromptTokens ?? 0) + (r.totalCompletionTokens ?? 0),
        costUsd: estimateCostUsd(r.totalPromptTokens ?? 0, r.totalCompletionTokens ?? 0),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      perDocFeedback,
    };
  }),

  /**
   * Admin-only: aggregated stats for all OTHER AI calls (not the Project
   * Builder — those have their own dedicated stats above). Covers:
   *   - community.impact_report
   *   - buyer_readiness (per-buyer checks)
   *   - buyer_match
   *   - audit_package.exec_summary
   *
   * Reads from the generic aiCallLog table populated by logAiCall() in each
   * router. Lets us see runaway usage per feature before the Gemini bill
   * surprises us.
   */
  adminOtherAiStats: adminProcedure.query(() => {
    const sqlite = getRawDb();
    if (!sqlite) {
      return {
        totalCalls: 0,
        tokens: { prompt: 0, completion: 0, total: 0 },
        costUsd: 0,
        byFeature: [],
        byUser: [],
        recent: [],
      };
    }

    const totalRow = sqlite.prepare(
      "SELECT COUNT(*) as c, SUM(promptTokens) as p, SUM(completionTokens) as co, SUM(costUsd) as cost FROM aiCallLog",
    ).get() as { c: number; p: number | null; co: number | null; cost: number | null };

    const byFeatureRows = sqlite.prepare(
      `SELECT feature,
              COUNT(*) as calls,
              SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) as errors,
              SUM(promptTokens) as promptTokens,
              SUM(completionTokens) as completionTokens,
              SUM(costUsd) as costUsd
       FROM aiCallLog
       GROUP BY feature
       ORDER BY costUsd DESC`,
    ).all() as Array<{ feature: string; calls: number; errors: number; promptTokens: number | null; completionTokens: number | null; costUsd: number | null }>;

    const byUserRows = sqlite.prepare(
      `SELECT aiCallLog.userId as userId, users.email as email,
              COUNT(*) as calls,
              SUM(aiCallLog.promptTokens) as promptTokens,
              SUM(aiCallLog.completionTokens) as completionTokens,
              SUM(aiCallLog.costUsd) as costUsd
       FROM aiCallLog
       LEFT JOIN users ON users.id = aiCallLog.userId
       GROUP BY aiCallLog.userId
       ORDER BY costUsd DESC
       LIMIT 20`,
    ).all() as Array<{ userId: number | null; email: string | null; calls: number; promptTokens: number | null; completionTokens: number | null; costUsd: number | null }>;

    const recentRows = sqlite.prepare(
      `SELECT aiCallLog.id as id, aiCallLog.userId as userId, users.email as email,
              aiCallLog.feature as feature, aiCallLog.projectId as projectId,
              aiCallLog.promptTokens as promptTokens, aiCallLog.completionTokens as completionTokens,
              aiCallLog.costUsd as costUsd, aiCallLog.status as status,
              aiCallLog.errorMsg as errorMsg, aiCallLog.createdAt as createdAt
       FROM aiCallLog
       LEFT JOIN users ON users.id = aiCallLog.userId
       ORDER BY aiCallLog.createdAt DESC
       LIMIT 30`,
    ).all() as Array<{
      id: number; userId: number | null; email: string | null;
      feature: string; projectId: number | null;
      promptTokens: number; completionTokens: number;
      costUsd: number; status: string; errorMsg: string | null;
      createdAt: number;
    }>;

    return {
      totalCalls: totalRow.c,
      tokens: {
        prompt: totalRow.p ?? 0,
        completion: totalRow.co ?? 0,
        total: (totalRow.p ?? 0) + (totalRow.co ?? 0),
      },
      costUsd: totalRow.cost ?? 0,
      byFeature: byFeatureRows.map((r) => ({
        feature: r.feature,
        calls: r.calls,
        errors: r.errors,
        promptTokens: r.promptTokens ?? 0,
        completionTokens: r.completionTokens ?? 0,
        costUsd: r.costUsd ?? 0,
      })),
      byUser: byUserRows.map((r) => ({
        userId: r.userId,
        email: r.email ?? "(anonymous)",
        calls: r.calls,
        promptTokens: r.promptTokens ?? 0,
        completionTokens: r.completionTokens ?? 0,
        costUsd: r.costUsd ?? 0,
      })),
      recent: recentRows.map((r) => ({
        id: r.id,
        userId: r.userId,
        email: r.email ?? "(anonymous)",
        feature: r.feature,
        projectId: r.projectId,
        tokens: r.promptTokens + r.completionTokens,
        costUsd: r.costUsd,
        status: r.status,
        errorMsg: r.errorMsg,
        createdAt: r.createdAt,
      })),
    };
  }),

  /**
   * Submit a thumbs up/down vote for a doc in an AI-generated project. If the
   * user already voted, the vote is updated (idempotent, flip supported).
   * Passing `vote: null` removes their vote entirely.
   */
  submitFeedback: protectedProcedure
    .input(
      z.object({
        aiProjectId: z.number().int(),
        docId: z.string().min(1).max(100),
        vote: z.enum(["up", "down"]).nullable(),
        comment: z.string().max(1000).nullable().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const db = requireDb();
      const sqlite = getRawDb();
      if (!sqlite) throw new Error("Database unavailable");

      // Verify ownership of the AI project (prevents voting on someone else's project)
      const rows = db
        .select()
        .from(aiGeneratedProjects)
        .where(
          and(
            eq(aiGeneratedProjects.id, input.aiProjectId),
            eq(aiGeneratedProjects.userId, ctx.user.id),
          ),
        )
        .limit(1)
        .all();
      if (rows.length === 0) throw new Error("Project not found");

      if (input.vote === null) {
        // Remove existing vote
        sqlite.prepare(
          `DELETE FROM aiDocFeedback WHERE userId = ? AND aiProjectId = ? AND docId = ?`,
        ).run(ctx.user.id, input.aiProjectId, input.docId);
        return { success: true, vote: null };
      }

      // UPSERT — preserve createdAt on updates
      const now = Date.now();
      sqlite.prepare(
        `INSERT INTO aiDocFeedback (userId, aiProjectId, docId, vote, comment, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(userId, aiProjectId, docId)
         DO UPDATE SET vote = excluded.vote, comment = excluded.comment, updatedAt = excluded.updatedAt`,
      ).run(
        ctx.user.id,
        input.aiProjectId,
        input.docId,
        input.vote,
        input.comment ?? null,
        now,
        now,
      );

      return { success: true, vote: input.vote };
    }),

  /**
   * Return the current user's votes for all docs in a project. Used by the
   * UI to highlight the user's active vote buttons.
   */
  getFeedback: protectedProcedure
    .input(z.object({ aiProjectId: z.number().int() }))
    .query(({ ctx, input }) => {
      const sqlite = getRawDb();
      if (!sqlite) return { votes: {} };
      const rows = sqlite.prepare(
        `SELECT docId, vote, comment FROM aiDocFeedback
         WHERE userId = ? AND aiProjectId = ?`,
      ).all(ctx.user.id, input.aiProjectId) as Array<{ docId: string; vote: "up" | "down"; comment: string | null }>;

      const votes: Record<string, { vote: "up" | "down"; comment: string | null }> = {};
      for (const r of rows) votes[r.docId] = { vote: r.vote, comment: r.comment };
      return { votes };
    }),

  /**
   * Given an AI-generated project, create a regular Project (the kind managed
   * in /projects and used by the PDD Builder) and return its ID plus the
   * flattened PDD answers. The UI writes the answers to localStorage keyed to
   * the new project ID and navigates to /pdd/:projectId, giving the user an
   * instant PDD Builder pre-filled with the AI draft.
   */
  createPddFromAi: protectedProcedure
    .input(z.object({ aiProjectId: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const db = requireDb();

      // Load the AI project
      const aiRows = db
        .select()
        .from(aiGeneratedProjects)
        .where(
          and(
            eq(aiGeneratedProjects.id, input.aiProjectId),
            eq(aiGeneratedProjects.userId, ctx.user.id),
          ),
        )
        .limit(1)
        .all();
      if (aiRows.length === 0) throw new Error("AI project not found");
      const ai = aiRows[0];

      // Parse the pdd-pre-fill doc
      let flatAnswers: Record<string, string> = {};
      try {
        const docs = ai.generatedDocs ? JSON.parse(ai.generatedDocs) as Record<string, { content?: string }> : {};
        const pddDoc = docs["pdd-pre-fill"];
        if (pddDoc?.content) {
          const parsed = JSON.parse(pddDoc.content) as {
            workstreams?: Array<{ id?: string; answers?: Array<{ questionId: string; draftAnswer: string }> }>;
          };
          for (const ws of parsed.workstreams ?? []) {
            for (const a of ws.answers ?? []) {
              if (a.questionId && typeof a.draftAnswer === "string") {
                flatAnswers[a.questionId] = a.draftAnswer;
              }
            }
          }
        }
      } catch (err) {
        console.warn("[aiBuilder] Failed to parse pdd-pre-fill:", err);
      }

      // Create a regular Project row
      const now = new Date();
      const biomassData = ai.biomassData ?? null;
      let biomassId: string | null = ai.biomassId ?? null;
      let parsedBiomass: { name?: string } = {};
      try {
        if (ai.biomassData) parsedBiomass = JSON.parse(ai.biomassData);
      } catch {}
      // plantCapacityTph = tn/year / (8000 operating hours/year)
      const plantCapacityTph = ai.capacityTnYear ? ai.capacityTnYear / 8000 : null;
      const { handoffDescription, clause } = buildLinkedProjectHandoffClause(ai.id);
      const existingRows = findLinkedProjectsForAiProject(db, ctx.user.id, ai.id);

      if (existingRows.length > 0) {
        if (existingRows.some((row) => row.description !== handoffDescription)) {
          db.update(projects)
            .set({
              description: handoffDescription,
              updatedAt: now,
            })
            .where(and(eq(projects.userId, ctx.user.id), clause))
            .run();
        }
        return {
          projectId: existingRows[0].id,
          answers: flatAnswers,
          sourceAiProjectId: ai.id,
          sourceAiProjectName: ai.name,
          reusedExistingProject: true,
          linkedProjectCount: existingRows.length,
        };
      }

      const result = db
        .insert(projects)
        .values({
          userId: ctx.user.id,
          name: ai.name,
          description: handoffDescription,
          location: ai.location ?? null,
          country: ai.country,
          plantCapacityTph: plantCapacityTph ?? null,
          feedstockId: biomassId,
          feedstockData: (() => {
            const normalizedFeedstock = resolveProjectFeedstock(biomassId, biomassData, FEEDSTOCK_DB);
            return normalizedFeedstock ? JSON.stringify(normalizedFeedstock) : biomassData;
          })(),
          temperature: 650,
          residenceTime: 30,
          qualityGoal: "BALANCED",
          status: "draft",
          publicVisibility: "private",
          publicMethodology: ai.targetMethodology ?? "puro-earth",
          createdAt: now,
          updatedAt: now,
        })
        .run();

      const projectId = Number(result.lastInsertRowid);

      return {
        projectId,
        answers: flatAnswers,
        sourceAiProjectId: ai.id,
        sourceAiProjectName: ai.name,
        reusedExistingProject: false,
        linkedProjectCount: 1,
      };
    }),

  /** Re-generate a single doc (e.g. if it errored). */
  retryDoc: protectedProcedure
    .input(z.object({ projectId: z.number().int(), docId: z.string(), lang: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasTierAccessForUser(ctx.user, "engineer")) {
        throw new Error("UPGRADE_REQUIRED: AI Project Builder requires Engineer tier or higher.");
      }

      const db = requireDb();
      const rows = db
        .select()
        .from(aiGeneratedProjects)
        .where(
          and(
            eq(aiGeneratedProjects.id, input.projectId),
            eq(aiGeneratedProjects.userId, ctx.user.id),
          ),
        )
        .limit(1)
        .all();

      if (rows.length === 0) throw new Error("Project not found");
      const row = rows[0];

      const docDef = getDocDefinition(input.docId);
      if (!docDef) throw new Error("Unknown doc type");

      let biomassData: { name?: string; composition?: any; source?: string } = {};
      try {
        if (row.biomassData) biomassData = JSON.parse(row.biomassData);
      } catch {}

      const projectInput: ProjectInput = {
        projectName: row.name,
        biomass: {
          name: biomassData.name ?? "Unknown biomass",
          elementalComposition: biomassData.composition,
          source: biomassData.source,
        },
        capacityTnYear: row.capacityTnYear,
        country: row.country,
        countryName: resolveCountryName(row.country),
        location: row.location ?? undefined,
        offtakerType: (row.offtakerType ?? "both") as "investor" | "certifier" | "both",
        targetMethodology:
          (row.targetMethodology as ProjectInput["targetMethodology"]) ?? undefined,
        lang: input.lang,
        // NOTE: retry doesn't re-fetch the custom methodology — if you deleted
        // or edited it, the retried doc uses the edited version. That's the
        // intended behavior (edit your methodology, retry the doc to regenerate).
      };

      // For the Custom Methodology Compliance doc, pull in the methodology
      // the project was created with (or the latest version if still editable).
      if (docDef.id === CUSTOM_METHODOLOGY_DOC.id) {
        const cmRow = db
          .select()
          .from(customMethodologies)
          .where(eq(customMethodologies.userId, ctx.user.id))
          .limit(1)
          .all();
        if (cmRow.length > 0) {
          let parsedCriteria: Array<{ id: string; label: string; description: string; thresholdNote?: string }> = [];
          try {
            parsedCriteria = cmRow[0].criteria ? JSON.parse(cmRow[0].criteria) : [];
          } catch {}
          projectInput.customMethodology = {
            id: cmRow[0].id,
            name: cmRow[0].name,
            description: cmRow[0].description ?? "",
            basedOn: cmRow[0].basedOn ?? null,
            criteria: parsedCriteria,
          };
        }
      }

      const newDoc = await generateDoc(docDef, projectInput);

      // Merge into existing generatedDocs
      let existingDocs: Record<string, GeneratedDoc> = {};
      try {
        if (row.generatedDocs) existingDocs = JSON.parse(row.generatedDocs);
      } catch {}
      existingDocs[newDoc.docId] = newDoc;

      db.update(aiGeneratedProjects)
        .set({
          generatedDocs: JSON.stringify(existingDocs),
          totalPromptTokens: (row.totalPromptTokens ?? 0) + newDoc.tokenUsage.prompt,
          totalCompletionTokens: (row.totalCompletionTokens ?? 0) + newDoc.tokenUsage.completion,
          updatedAt: new Date(),
        })
        .where(eq(aiGeneratedProjects.id, input.projectId))
        .run();

      return newDoc;
    }),
});
