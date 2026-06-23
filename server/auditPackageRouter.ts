/**
 * Audit Package builder — Stage 4 module 2.
 *
 * Consolidates everything a VVB / corporate buyer wants to see into one
 * payload: Operational Evidence + Offtake chain-of-custody + Community Impact
 * + (optional) Buyer Readiness check. The frontend renders it as a
 * print-ready PDF with the user's white-label branding applied.
 *
 * Closes the Stage 3/4 loop: the operator logs data in the 3 trackers, runs
 * a Buyer Readiness check, then exports this PDF to send to the buyer.
 *
 * Tier gate: Expert (admins bypass).
 */

import { z } from "zod";
import { eq, and, gte, lte } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import {
  projects, operationalEvidence, biocharShipments, communityRecords,
} from "../drizzle/schema";
import { invokeLLM, buildLangDirective } from "./_core/llm";
import { logAiCall } from "./_core/aiCallLog";
import { requireTierAccess } from "./_core/access";

function requireExpert(user: { role: string; subscriptionTier: string | null; subscriptionStatus: string | null }) {
  requireTierAccess(user, "expert", "UPGRADE_REQUIRED: Audit Package export requires Expert tier.");
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

export const auditPackageRouter = router({
  /**
   * Build a complete audit package for the given period. Returns a
   * structured payload the UI renders into a print-ready PDF.
   *
   * The AI generates an executive summary + per-section narratives; the
   * raw data tables are returned as structured arrays for the UI to render.
   */
  build: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        periodStartMs: z.number(),
        periodEndMs: z.number(),
        buyerName: z.string().max(200).optional(), // free-text for the narrative context
        lang: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireExpert(ctx.user);
      const project = assertOwnsProject(ctx.user.id, input.projectId);
      const db = requireDb();

      // Pull raw data
      const periodStart = new Date(input.periodStartMs);
      const periodEnd = new Date(input.periodEndMs);

      const evidenceRows = db
        .select()
        .from(operationalEvidence)
        .where(
          and(
            eq(operationalEvidence.projectId, input.projectId),
            gte(operationalEvidence.periodStart, periodStart),
            lte(operationalEvidence.periodStart, periodEnd),
          ),
        )
        .all();

      const shipmentRows = db
        .select()
        .from(biocharShipments)
        .where(
          and(
            eq(biocharShipments.projectId, input.projectId),
            gte(biocharShipments.shipmentDate, periodStart),
            lte(biocharShipments.shipmentDate, periodEnd),
          ),
        )
        .all();

      const communityRows = db
        .select()
        .from(communityRecords)
        .where(
          and(
            eq(communityRecords.projectId, input.projectId),
            gte(communityRecords.recordDate, periodStart),
            lte(communityRecords.recordDate, periodEnd),
          ),
        )
        .all();

      // Parse content JSON for display
      const parseContent = (s: string | null): unknown => {
        if (!s) return null;
        try { return JSON.parse(s); } catch { return null; }
      };

      const evidence = evidenceRows.map((r) => ({
        id: r.id,
        dataType: r.dataType,
        periodStartMs: r.periodStart ? new Date(r.periodStart).getTime() : 0,
        periodEndMs: r.periodEnd ? new Date(r.periodEnd).getTime() : null,
        content: parseContent(r.content),
        validationStatus: r.validationStatus,
        validationNotes: r.validationNotes,
      }));

      const shipments = shipmentRows.map((r) => ({
        id: r.id,
        shipmentCode: r.shipmentCode,
        shipmentDateMs: r.shipmentDate ? new Date(r.shipmentDate).getTime() : 0,
        tonnes: r.tonnes,
        endUseCategory: r.endUseCategory,
        destinationName: r.destinationName,
        destinationCountry: r.destinationCountry,
        status: r.status,
        confirmedByName: r.confirmedByName,
        confirmedTonnesApplied: r.confirmedTonnesApplied,
        confirmedApplicationType: r.confirmedApplicationType,
        confirmedCropOrUseType: r.confirmedCropOrUseType,
        confirmedLat: r.confirmedLat,
        confirmedLon: r.confirmedLon,
      }));

      const community = communityRows.map((r) => ({
        id: r.id,
        recordType: r.recordType,
        recordDateMs: r.recordDate ? new Date(r.recordDate).getTime() : 0,
        content: parseContent(r.content),
        status: r.status,
      }));

      // Totals
      const totalBiomassReceived = evidence
        .filter((e) => e.dataType === "biomass_receipt")
        .reduce((s, e) => s + ((e.content as any)?.tonnesReceived ?? 0), 0);
      const totalBiomassProcessed = evidence
        .filter((e) => e.dataType === "pyrolysis_batch")
        .reduce((s, e) => s + ((e.content as any)?.biomassInputTonnes ?? 0), 0);
      const totalBiocharProduced = evidence
        .filter((e) => e.dataType === "pyrolysis_batch")
        .reduce((s, e) => s + ((e.content as any)?.biocharOutputTonnes ?? 0), 0);
      const totalTonnesShipped = shipments.reduce((s, sh) => s + (sh.tonnes ?? 0), 0);
      const totalTonnesApplied = shipments
        .filter((sh) => sh.status === "applied")
        .reduce((s, sh) => s + (sh.confirmedTonnesApplied ?? sh.tonnes ?? 0), 0);
      const traceabilityPct = totalTonnesShipped > 0 ? Math.round((totalTonnesApplied / totalTonnesShipped) * 100) : 0;

      const grievances = community.filter((c) => c.recordType === "grievance");
      const grievancesResolved = grievances.filter((g) => g.status === "resolved" || g.status === "closed").length;
      const grievanceResolutionPct = grievances.length > 0 ? Math.round((grievancesResolved / grievances.length) * 100) : 100;

      const localHires = community.filter((c) => c.recordType === "local_hire");
      const localHireCount = localHires.filter((h) => (h.content as any)?.isFromLocalCommunity === true).length;
      const localHirePct = localHires.length > 0 ? Math.round((localHireCount / localHires.length) * 100) : 0;

      const investments = community.filter((c) => c.recordType === "community_investment");
      const totalInvestmentUsd = investments.reduce((s, i) => s + ((i.content as any)?.amountUsd ?? 0), 0);
      const totalBeneficiaries = investments.reduce((s, i) => s + ((i.content as any)?.beneficiariesCount ?? 0), 0);

      // Bail out early if everything is empty
      const totalDataPoints = evidence.length + shipments.length + community.length;
      if (totalDataPoints === 0) {
        throw new Error("No audit data in the selected period. Log operational evidence, shipments, or community records first.");
      }

      // Executive summary narrative — AI-generated, compact prompt
      const systemPrompt = `You are an ESG audit specialist writing the Executive Summary of a Biochar Carbon Removal audit package. Corporate buyers (Microsoft, Shell, Frontier, Altitude) and VVBs (third-party verifiers) read this first.

You write with factual honesty — only cite numbers that are present in the data. You note gaps explicitly. You never invent evidence.

Output: a 250-400 word executive summary in Markdown. Structure:
1. Project identity + period (1 sentence)
2. Operational throughput (tonnes biomass processed, biochar produced)
3. Chain-of-custody to end-use (% traceability, key destinations)
4. Community impact highlights (grievances resolution, local workforce, investments)
5. Audit readiness verdict (one honest sentence about how ready this data is for buyer/VVB review)${buildLangDirective(input.lang)}`;

      const dataForAI = {
        projectName: project.name,
        country: project.country,
        location: project.location,
        periodStart: periodStart.toISOString().slice(0, 10),
        periodEnd: periodEnd.toISOString().slice(0, 10),
        buyerName: input.buyerName,
        totals: {
          totalBiomassReceived: Math.round(totalBiomassReceived * 100) / 100,
          totalBiomassProcessed: Math.round(totalBiomassProcessed * 100) / 100,
          totalBiocharProduced: Math.round(totalBiocharProduced * 100) / 100,
          totalTonnesShipped: Math.round(totalTonnesShipped * 100) / 100,
          totalTonnesApplied: Math.round(totalTonnesApplied * 100) / 100,
          traceabilityPct,
          evidenceRecords: evidence.length,
          shipments: shipments.length,
          communityRecords: community.length,
          grievances: grievances.length,
          grievanceResolutionPct,
          localHireCount,
          localHireTotal: localHires.length,
          localHirePct,
          totalInvestmentUsd,
          totalBeneficiaries,
        },
        evidenceByType: evidence.reduce((acc, e) => {
          acc[e.dataType] = (acc[e.dataType] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        evidenceByStatus: evidence.reduce((acc, e) => {
          const s = e.validationStatus ?? "PENDING";
          acc[s] = (acc[s] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        shipmentsByStatus: shipments.reduce((acc, s) => {
          acc[s.status] = (acc[s.status] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        keyShipments: shipments.slice(0, 10).map((s) => ({
          shipmentCode: s.shipmentCode,
          tonnes: s.tonnes,
          status: s.status,
          endUseCategory: s.endUseCategory,
          destinationName: s.destinationName,
          destinationCountry: s.destinationCountry,
          confirmedByName: s.confirmedByName,
          confirmedTonnesApplied: s.confirmedTonnesApplied,
          confirmedApplicationType: s.confirmedApplicationType,
          confirmedCropOrUseType: s.confirmedCropOrUseType,
          confirmedLat: s.confirmedLat,
          confirmedLon: s.confirmedLon,
        })),
      };

      const userPrompt = `Write the Executive Summary for the audit package of:

${JSON.stringify(dataForAI, null, 2)}

Be specific. Every number you cite must be in the data above. If a category is zero, say so honestly. ${input.buyerName ? `Frame the audit readiness verdict with the named buyer in mind (${input.buyerName}).` : ""}`;

      let executiveSummary = "";
      let execSummaryTokens = { prompt: 0, completion: 0 };
      let execSummaryStatus: "ok" | "error" = "ok";
      let execSummaryError: string | null = null;
      try {
        const resp = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "text" },
        });
        executiveSummary = resp.choices[0]?.message?.content ?? "";
        execSummaryTokens = {
          prompt: resp.usage?.prompt_tokens ?? 0,
          completion: resp.usage?.completion_tokens ?? 0,
        };
        if (!executiveSummary) {
          execSummaryStatus = "error";
          execSummaryError = "Empty LLM response";
        }
      } catch (err: any) {
        // Non-fatal — PDF still valid without narrative
        executiveSummary = "(Executive summary could not be auto-generated. The raw data below still constitutes the audit evidence.)";
        execSummaryStatus = "error";
        execSummaryError = err?.message ?? "LLM call threw";
      }

      logAiCall({
        userId: ctx.user.id,
        feature: "audit_package.exec_summary",
        projectId: input.projectId,
        promptTokens: execSummaryTokens.prompt,
        completionTokens: execSummaryTokens.completion,
        status: execSummaryStatus,
        errorMsg: execSummaryError,
        metadata: {
          evidenceCount: evidence.length,
          shipmentCount: shipments.length,
          communityCount: community.length,
          buyerName: input.buyerName ?? null,
        },
      });

      const packageId = `AUDIT-${project.id}-${Date.now().toString(36).toUpperCase()}`;

      return {
        packageId,
        generatedAtMs: Date.now(),
        project: {
          id: project.id,
          name: project.name,
          country: project.country,
          location: project.location,
          bopId: project.bopId,
        },
        period: {
          startMs: input.periodStartMs,
          endMs: input.periodEndMs,
        },
        buyerName: input.buyerName ?? null,
        executiveSummary,
        totals: dataForAI.totals,
        evidence,
        shipments,
        community,
        tokenUsage: execSummaryTokens,
      };
    }),
});
