/**
 * Buyer Match — Stage 4 module 3.
 *
 * Inverse of Buyer Readiness. The operator says "I have this project, who
 * should I sell to first?" and the AI ranks the 4 supported buyers by fit
 * based on the project's actual data (evidence + offtake + community +
 * methodology + country + scale).
 *
 * Reuses the BUYERS catalog from buyerReadinessRouter. Single-call prompt
 * to get a comparative ranking rather than N parallel checks — cheaper and
 * the AI can reason across buyers.
 *
 * Tier gate: Expert (admins bypass).
 */

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import { projects, operationalEvidence, biocharShipments, communityRecords } from "../drizzle/schema";
import { invokeLLM, buildLangDirective } from "./_core/llm";
import { logAiCall, getLatestAiRunOutput } from "./_core/aiCallLog";
import { BUYERS } from "./buyerReadinessRouter";
import { requireTierAccess } from "./_core/access";

function requireExpert(user: { role: string; subscriptionTier: string | null; subscriptionStatus: string | null }) {
  requireTierAccess(user, "expert", "UPGRADE_REQUIRED: Buyer Match requires Expert tier.");
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

export const buyerMatchRouter = router({
  /**
   * Score the project against all 4 supported buyers in a single LLM call
   * and return a comparative ranking with reasoning.
   */
  recommend: protectedProcedure
    .input(z.object({ projectId: z.number().int(), lang: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      requireExpert(ctx.user);
      const project = assertOwnsProject(ctx.user.id, input.projectId);
      const db = requireDb();

      const evidenceRows = db.select().from(operationalEvidence)
        .where(eq(operationalEvidence.projectId, input.projectId)).limit(200).all();
      const shipmentRows = db.select().from(biocharShipments)
        .where(eq(biocharShipments.projectId, input.projectId)).limit(200).all();
      const communityRows = db.select().from(communityRecords)
        .where(eq(communityRecords.projectId, input.projectId)).limit(200).all();

      // Compact data summary for the LLM
      const evidenceByType = evidenceRows.reduce((acc, r) => {
        acc[r.dataType] = (acc[r.dataType] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const evidenceByStatus = evidenceRows.reduce((acc, r) => {
        const s = r.validationStatus ?? "PENDING";
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const totalTonnesShipped = shipmentRows.reduce((s, r) => s + (r.tonnes ?? 0), 0);
      const totalTonnesApplied = shipmentRows
        .filter((r) => r.status === "applied")
        .reduce((s, r) => s + (r.confirmedTonnesApplied ?? r.tonnes ?? 0), 0);
      const traceabilityPct = totalTonnesShipped > 0 ? Math.round((totalTonnesApplied / totalTonnesShipped) * 100) : 0;

      const communityByType = communityRows.reduce((acc, r) => {
        acc[r.recordType] = (acc[r.recordType] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const grievances = communityRows.filter((r) => r.recordType === "grievance");
      const grievancesResolved = grievances.filter((g) => g.status === "resolved" || g.status === "closed").length;

      // Sample a few biochar properties from lab analyses
      const labAnalyses = evidenceRows
        .filter((r) => r.dataType === "lab_analysis")
        .slice(0, 5)
        .map((r) => {
          try { return r.content ? JSON.parse(r.content) : null; } catch { return null; }
        })
        .filter(Boolean);
      const latestHCorg = labAnalyses.length > 0 ? (labAnalyses[0] as any).hCorgMolar : null;
      const latestC = labAnalyses.length > 0 ? (labAnalyses[0] as any).organicCarbonPct : null;

      const projectSnapshot = {
        name: project.name,
        country: project.country,
        location: project.location,
        plantCapacityTph: project.plantCapacityTph,
        publicMethodology: project.publicMethodology,
        status: project.status,
        operationalMaturity: evidenceRows.length > 5 ? "operational" : evidenceRows.length > 0 ? "early-operational" : "pre-operational",
        evidence: {
          total: evidenceRows.length,
          byType: evidenceByType,
          byStatus: evidenceByStatus,
          latestHCorg,
          latestOrganicCarbonPct: latestC,
        },
        offtake: {
          totalShipments: shipmentRows.length,
          totalTonnesShipped,
          totalTonnesApplied,
          traceabilityPct,
          confirmedShipments: shipmentRows
            .filter((r) => r.status === "applied" || r.confirmedByName || r.confirmedTonnesApplied != null)
            .slice(0, 20)
            .map((r) => ({
              shipmentCode: r.shipmentCode,
              status: r.status,
              tonnes: r.tonnes,
              endUseCategory: r.endUseCategory,
              destinationName: r.destinationName,
              destinationCountry: r.destinationCountry,
              confirmedByName: r.confirmedByName,
              confirmedTonnesApplied: r.confirmedTonnesApplied,
              confirmedApplicationType: r.confirmedApplicationType,
              confirmedCropOrUseType: r.confirmedCropOrUseType,
              confirmedLat: r.confirmedLat,
              confirmedLon: r.confirmedLon,
            })),
        },
        community: {
          total: communityRows.length,
          byType: communityByType,
          grievances: grievances.length,
          grievancesResolved,
        },
      };

      const systemPrompt = `You are a senior CDR commercial strategist who has negotiated offtake deals with Microsoft, Frontier, Shell, and Altitude. You know each buyer's real preferences beyond their public criteria — what closes fast, what gets stuck in DD, and what price tiers they pay.

You evaluate a biochar project's actual data + context + methodology and give an HONEST, comparative ranking of which buyer is most likely to sign first, second, third, last.

Output: STRICT JSON. Never invent data not present in the snapshot. Rank buyers by likelihood of signing a contract within 6 months — not just theoretical fit. An ICVCM-approved methodology + operational data + community records = fast-track with several buyers. A paper-only project = nobody signs.${buildLangDirective(input.lang)}`;

      const userPrompt = `Rank the 4 buyers below by likelihood of signing an offtake contract with this project within 6 months.

Buyers (public criteria):
${JSON.stringify(BUYERS.map((b) => ({
  id: b.id,
  name: b.name,
  description: b.description,
  criteriaCount: b.criteria.length,
  dealBreakerCount: b.criteria.filter((c) => c.dealBreaker).length,
})), null, 2)}

Project snapshot:
${JSON.stringify(projectSnapshot, null, 2)}

Interpretation rules:
- If offtake.confirmedShipments includes applied shipments with confirmedTonnesApplied, confirmedByName, destination, and coordinates, treat that as positive chain-of-custody/end-user confirmation evidence.
- Do not describe end-use confirmation as absent when confirmedShipments is populated. If traceability is still weak, frame the gap as limited scale, limited sample size, missing signed attachments, or need to repeat coverage across future batches.
- If publicMethodology is present, treat methodology selection as evidence. If absent, call that out as a commercial gap.

Return JSON:
{
  "projectSummary": "<1-sentence summary of the project's commercial profile — operational vs pre-FID, methodology status, scale, community evidence level>",
  "ranking": [
    {
      "rank": 1,
      "buyerId": "<id>",
      "buyerName": "<name>",
      "fitScore": <integer 0-100, your honest probability-weighted score>,
      "strengths": ["<3-4 specific things in the project data that match this buyer>"],
      "gaps": ["<2-3 specific things missing that would stop this buyer from signing>"],
      "timeline": "<'ready to pitch now' | 'weeks to ready' | '1-3 months to ready' | '3-6 months to ready' | 'unlikely within 6mo'>",
      "priceTier": "<'premium 1000-yr tier' | 'standard 100-yr tier' | 'low-tier VCM' | 'not viable'>",
      "nextStep": "<one specific action the operator should do first to engage this buyer>"
    },
    ... (4 entries total, one per buyer, ranked 1-4)
  ],
  "commercialNarrative": "<2-3 sentences: who to approach first, who to approach second, why. Specific to this project's data.>",
  "fatalIssues": ["<deal-stoppers that apply across all buyers — e.g. 'no operational data at all' or 'methodology not ICVCM-approved'. Empty array if none.>"]
}

Be rigorous. Don't rank buyers optimistically just because the user has Expert tier. If the project is pre-FID with zero evidence, say "unlikely within 6mo" across the board — that's the truth and they need to hear it.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "buyer_match",
            strict: false,
            schema: {
              type: "object",
              properties: {
                projectSummary: { type: "string" },
                ranking: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      rank: { type: "number" },
                      buyerId: { type: "string" },
                      buyerName: { type: "string" },
                      fitScore: { type: "number" },
                      strengths: { type: "array", items: { type: "string" } },
                      gaps: { type: "array", items: { type: "string" } },
                      timeline: { type: "string" },
                      priceTier: { type: "string" },
                      nextStep: { type: "string" },
                    },
                  },
                },
                commercialNarrative: { type: "string" },
                fatalIssues: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      });

      const content = response.choices[0]?.message?.content ?? "";
      let parsed: any = null;
      try { parsed = JSON.parse(content); } catch {}

      const promptTokens = response.usage?.prompt_tokens ?? 0;
      const completionTokens = response.usage?.completion_tokens ?? 0;

      logAiCall({
        userId: ctx.user.id,
        feature: "buyer_match",
        projectId: input.projectId,
        promptTokens,
        completionTokens,
        status: parsed ? "ok" : "error",
        errorMsg: parsed ? null : "LLM response not parseable JSON",
        metadata: {
          evidenceCount: evidenceRows.length,
          shipmentCount: shipmentRows.length,
          communityCount: communityRows.length,
          topBuyerId: parsed?.ranking?.[0]?.buyerId ?? null,
        },
        // Persist so the UI can re-hydrate on page reload instead of
        // burning another LLM call.
        output: parsed,
      });

      return {
        result: parsed,
        tokenUsage: {
          prompt: promptTokens,
          completion: completionTokens,
        },
        dataPoints: {
          evidence: evidenceRows.length,
          shipments: shipmentRows.length,
          community: communityRows.length,
        },
      };
    }),

  /**
   * Return the last persisted `recommend` output for the project so the
   * page hydrates the operator's most recent buyer ranking on load instead
   * of showing an empty state and forcing another Gemini call.
   */
  latest: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ ctx, input }) => {
      requireExpert(ctx.user);
      assertOwnsProject(ctx.user.id, input.projectId);
      return getLatestAiRunOutput({
        userId: ctx.user.id,
        feature: "buyer_match",
        projectId: input.projectId,
      });
    }),
});
