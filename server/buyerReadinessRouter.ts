/**
 * Buyer Readiness Checker — Stage 4, module 1.
 *
 * Evaluates a project's readiness against the public procurement criteria of
 * major corporate CDR buyers (Microsoft, Frontier, Shell, Altitude). Uses AI
 * to compare the project's Operational Evidence + Offtake Tracker + Community
 * Impact records against each buyer's published/known requirements and
 * returns a % readiness score plus a specific gap list with actions.
 *
 * Closes the loop: after the operator logs data in the 3 Stage-3 modules,
 * this tells them exactly what's still missing before a buyer will sign.
 *
 * Tier gate: Expert (admins bypass).
 */

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import {
  projects, operationalEvidence, biocharShipments, communityRecords,
} from "../drizzle/schema";
import { invokeLLM, buildLangDirective } from "./_core/llm";
import { logAiCall } from "./_core/aiCallLog";
import { requireTierAccess } from "./_core/access";

// ─── Buyer catalog ───────────────────────────────────────────────────────
//
// Hardcoded from each buyer's public procurement guidance (links in comments).
// When a buyer updates their criteria, edit this catalog — no data migration
// needed, the AI re-evaluates on every check.

export type BuyerId = "microsoft" | "frontier" | "shell" | "altitude";

export const BUYERS: Array<{
  id: BuyerId;
  name: string;
  description: string;
  criteria: Array<{ id: string; label: string; weight: number; dealBreaker: boolean; detail: string }>;
  publicUrl: string;
}> = [
  {
    id: "microsoft",
    name: "Microsoft",
    description: "World's largest corporate CDR buyer. BiCRS procurement cycle requires full DD package + operational plant + end-use + community evidence.",
    publicUrl: "https://www.microsoft.com/en-us/corporate-responsibility/sustainability",
    criteria: [
      { id: "ms_operational", label: "Plant is operational (not pre-FID)", weight: 10, dealBreaker: true, detail: "Microsoft explicitly stated in April 2026 they no longer purchase from paper/pre-FID projects. Must have batches produced and shipped." },
      { id: "ms_end_use_traceability", label: "Batch-level end-use traceability", weight: 9, dealBreaker: true, detail: "Microsoft requires shipment-by-shipment chain of custody from plant to end-user, with end-user confirmation." },
      { id: "ms_community_impact", label: "Documented community impact", weight: 9, dealBreaker: true, detail: "Real community impact evidence required — not just a written plan. Meetings, grievances resolved, local hires, community investments." },
      { id: "ms_icvcm_aligned", label: "Methodology is ICVCM-approved", weight: 8, dealBreaker: false, detail: "Strong preference for ICVCM Core Carbon Principles-aligned methodologies (Puro, Isometric, Rainbow)." },
      { id: "ms_lca_independent", label: "Independently reviewed LCA", weight: 8, dealBreaker: true, detail: "LCA must be reviewed by qualified third-party before contract. Self-developed LCAs don't pass DD." },
      { id: "ms_permanence_1000yr", label: "1000-year durability claim validated", weight: 7, dealBreaker: false, detail: "Microsoft prefers 1000-year durability (H:Corg < 0.4 + engineered permanence). 100-year claims accepted at lower price." },
      { id: "ms_additionality", label: "Financial additionality documented", weight: 7, dealBreaker: true, detail: "Must show project isn't viable without carbon credit revenue (IRR analysis + baseline)." },
      { id: "ms_eia_approved", label: "Environmental permits issued", weight: 7, dealBreaker: true, detail: "EIA / operating permit / air emission permit must all be issued (not just applied)." },
      { id: "ms_mrv_continuous", label: "Continuous MRV in operation", weight: 6, dealBreaker: false, detail: "Real-time batch logging + lab analyses per batch + monthly aggregated reports." },
      { id: "ms_indigenous_fpic", label: "Indigenous peoples FPIC (if applicable)", weight: 6, dealBreaker: true, detail: "If project is near indigenous territories, documented Free, Prior, Informed Consent." },
    ],
  },
  {
    id: "frontier",
    name: "Frontier (Stripe + Shopify + Alphabet coalition)",
    description: "$1B+ AMC fund. Tier-based criteria (durability, additionality, community safeguards). Favors novel removal with long durability.",
    publicUrl: "https://frontierclimate.com/",
    criteria: [
      { id: "fr_durability_high", label: "Durability ≥1000 years", weight: 10, dealBreaker: false, detail: "Frontier's core bet is long durability. 1000+ yr permanence strongly preferred. Shorter tier accepted but priced much lower." },
      { id: "fr_operational", label: "Plant operational OR clear path to op", weight: 8, dealBreaker: false, detail: "Frontier is more open to pre-commercial than Microsoft, but still needs evidence of path to operation." },
      { id: "fr_additionality", label: "Financial additionality documented", weight: 9, dealBreaker: true, detail: "Frontier specifically funds projects that wouldn't happen without their offtake. IRR analysis required." },
      { id: "fr_verification_thirdparty", label: "Third-party verification committed", weight: 8, dealBreaker: true, detail: "Accredited VVB must be selected and engaged." },
      { id: "fr_community_safeguards", label: "Community safeguards evidenced", weight: 7, dealBreaker: true, detail: "Stakeholder engagement plan + grievance mechanism + documented community benefit." },
      { id: "fr_lca_complete", label: "Complete cradle-to-grave LCA", weight: 8, dealBreaker: true, detail: "Full LCA including feedstock, energy, transport, leakage." },
      { id: "fr_scientific_rigor", label: "Scientific rigor in measurement", weight: 7, dealBreaker: false, detail: "Frontier's technical team reviews measurements directly — uncertainty analysis + sensitivity required." },
      { id: "fr_scale_potential", label: "Path to 100k+ tCO2e/year scale", weight: 5, dealBreaker: false, detail: "Frontier favors projects with clear scale-up potential to industrial volumes." },
    ],
  },
  {
    id: "shell",
    name: "Shell",
    description: "Oil major building CDR portfolio. Criteria less strict than Microsoft on community but very strict on MRV and permanence.",
    publicUrl: "https://www.shell.com/sustainability/our-climate-target.html",
    criteria: [
      { id: "sh_operational", label: "Operational or near-operational", weight: 9, dealBreaker: false, detail: "Shell will sign LOIs with pre-operational if strong evidence of near-term commissioning." },
      { id: "sh_permanence", label: "Permanence ≥100 years with measurement plan", weight: 8, dealBreaker: true, detail: "Shell requires explicit permanence horizon + measurement plan." },
      { id: "sh_mrv_robust", label: "Robust MRV with dMRV integration", weight: 9, dealBreaker: true, detail: "Shell strongly prefers digital MRV (Crystalchain, Carbonfuture, Pyroccs) over manual reporting." },
      { id: "sh_leakage_assessed", label: "Leakage risks assessed and mitigated", weight: 7, dealBreaker: true, detail: "Biomass sourcing leakage + market leakage + reversal risk all evaluated." },
      { id: "sh_verification", label: "Annual third-party verification", weight: 7, dealBreaker: true, detail: "Accredited VVB doing annual verification." },
      { id: "sh_lca_audit", label: "LCA audited by qualified reviewer", weight: 8, dealBreaker: true, detail: "Self-developed LCAs not accepted. Must be reviewed by qualified consultancy." },
    ],
  },
  {
    id: "altitude",
    name: "Altitude",
    description: "Specialized carbon project financier. More lax on pre-FID but strict on developer track record.",
    publicUrl: "https://altitudecarbon.com/",
    criteria: [
      { id: "al_developer_track_record", label: "Developer has prior project track record", weight: 9, dealBreaker: true, detail: "Altitude typically backs experienced developers. First-time developers need strong technical partner." },
      { id: "al_operational_path", label: "Clear path to operational with financing", weight: 8, dealBreaker: false, detail: "Financing structure + timeline + milestones must be concrete." },
      { id: "al_feedstock_secured", label: "Feedstock supply secured", weight: 8, dealBreaker: true, detail: "Multi-year feedstock agreement in place (LOI or signed contract)." },
      { id: "al_methodology_selected", label: "Methodology selected + VVB identified", weight: 7, dealBreaker: true, detail: "Specific methodology (Puro/Isometric/Verra/Rainbow/etc) selected, VVB shortlisted or engaged." },
      { id: "al_community_plan", label: "Community engagement plan", weight: 5, dealBreaker: false, detail: "Plan required but evidence of execution optional at offtake signing stage." },
      { id: "al_financial_model", label: "Investor-grade financial model", weight: 8, dealBreaker: true, detail: "Financial model showing revenue, CAPEX, OPEX, IRR under Altitude's typical price assumptions." },
    ],
  },
];

// ─── Tier gate helper ─────────────────────────────────────────────────────

function requireExpert(user: { role: string; subscriptionTier: string | null; subscriptionStatus: string | null }) {
  requireTierAccess(user, "expert", "UPGRADE_REQUIRED: Buyer Readiness Checker requires Expert tier.");
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

export const buyerReadinessRouter = router({
  /** List supported buyers with their public criteria (client uses this for tile rendering). */
  buyers: protectedProcedure.query(() => {
    return BUYERS.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      criteriaCount: b.criteria.length,
      dealBreakerCount: b.criteria.filter((c) => c.dealBreaker).length,
      publicUrl: b.publicUrl,
    }));
  }),

  /**
   * Run an AI readiness check for a project against a specific buyer. Returns
   * a % score + per-criterion status (MEETS/PARTIAL/MISSING) + a prioritized
   * gap list with specific actions.
   *
   * Reads data from: operationalEvidence, biocharShipments, communityRecords.
   * If any category is empty, the AI will flag that explicitly.
   */
  check: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        buyerId: z.enum(["microsoft", "frontier", "shell", "altitude"]),
        lang: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireExpert(ctx.user);
      const project = assertOwnsProject(ctx.user.id, input.projectId);

      const buyer = BUYERS.find((b) => b.id === input.buyerId);
      if (!buyer) throw new Error("Unknown buyer");

      const db = requireDb();

      // Load all operational data for the project (capped for LLM context)
      const evidenceRows = db.select().from(operationalEvidence)
        .where(eq(operationalEvidence.projectId, input.projectId))
        .limit(100).all();
      const shipmentRows = db.select().from(biocharShipments)
        .where(eq(biocharShipments.projectId, input.projectId))
        .limit(100).all();
      const communityRows = db.select().from(communityRecords)
        .where(eq(communityRecords.projectId, input.projectId))
        .limit(100).all();

      // Summarize to keep the prompt bounded — don't dump 100 full records
      const evidenceSummary = {
        total: evidenceRows.length,
        byType: evidenceRows.reduce((acc, r) => {
          acc[r.dataType] = (acc[r.dataType] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byStatus: evidenceRows.reduce((acc, r) => {
          const s = r.validationStatus ?? "PENDING";
          acc[s] = (acc[s] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        samples: evidenceRows.slice(0, 10).map((r) => {
          let c: any = null;
          try { c = r.content ? JSON.parse(r.content) : null; } catch {}
          return { type: r.dataType, status: r.validationStatus, dateIso: r.periodStart ? new Date(r.periodStart).toISOString() : null, summary: summarizeEvidenceContent(r.dataType, c) };
        }),
      };

      const shipmentSummary = {
        total: shipmentRows.length,
        byStatus: shipmentRows.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        tonnesShipped: shipmentRows.reduce((s, r) => s + (r.tonnes ?? 0), 0),
        tonnesApplied: shipmentRows.filter((r) => r.status === "applied").reduce((s, r) => s + (r.confirmedTonnesApplied ?? r.tonnes ?? 0), 0),
        byEndUse: shipmentRows.reduce((acc, r) => {
          const c = r.endUseCategory ?? "unspecified";
          acc[c] = (acc[c] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        confirmedShipments: shipmentRows
          .filter((r) => r.status === "applied" || r.confirmedByName || r.confirmedTonnesApplied != null)
          .slice(0, 20)
          .map((r) => ({
            shipmentCode: r.shipmentCode,
            shipmentDateIso: r.shipmentDate ? new Date(r.shipmentDate).toISOString().slice(0, 10) : null,
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
      };

      const communitySummary = {
        total: communityRows.length,
        byType: communityRows.reduce((acc, r) => {
          acc[r.recordType] = (acc[r.recordType] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        grievances: {
          total: communityRows.filter((r) => r.recordType === "grievance").length,
          resolved: communityRows.filter((r) => r.recordType === "grievance" && (r.status === "resolved" || r.status === "closed")).length,
        },
        samples: communityRows.slice(0, 10).map((r) => {
          let c: any = null;
          try { c = r.content ? JSON.parse(r.content) : null; } catch {}
          return { type: r.recordType, dateIso: r.recordDate ? new Date(r.recordDate).toISOString() : null, status: r.status, summary: summarizeCommunityContent(r.recordType, c) };
        }),
      };

      const systemPrompt = `You are a senior CDR procurement analyst who has worked on due diligence for Microsoft, Shell, and other corporate carbon buyers. You evaluate biochar projects' readiness against specific buyer criteria with rigor and honesty.

Output format: STRICT JSON matching the schema. Never invent evidence the project doesn't have. If a criterion has no supporting data, mark it MISSING. Be specific about what's needed to move a criterion to MEETS.

The \`overallReadinessPct\` is weighted by criterion weight. Deal-breaker criteria that are MISSING cap the overall at 60% (the project can't contract with this buyer until those are addressed).${buildLangDirective(input.lang)}`;

      const userPrompt = `Evaluate project "${project.name}" (${project.country ?? "unknown country"}) for readiness to contract with ${buyer.name}.

Project context:
${JSON.stringify({
  location: project.location,
  status: project.status,
  publicMethodology: project.publicMethodology,
  plantCapacityTph: project.plantCapacityTph,
}, null, 2)}

Buyer: ${buyer.name}
Buyer description: ${buyer.description}

Buyer criteria (evaluate each):
${JSON.stringify(buyer.criteria, null, 2)}

Project operational data summary:
- Operational evidence: ${JSON.stringify(evidenceSummary, null, 2)}
- Biochar shipments: ${JSON.stringify(shipmentSummary, null, 2)}
- Community records: ${JSON.stringify(communitySummary, null, 2)}

Important interpretation rules:
- If a shipment is listed under confirmedShipments with status "applied", confirmedTonnesApplied, confirmedByName, destination, and coordinates, treat it as positive end-user confirmation evidence. Do not say end-user confirmation is absent; instead mark any remaining gap as scale, coverage across all batches, signed PDF attachment, or methodology-specific chain-of-custody documentation.
- A soil_application_plan supports agronomic end-use planning, but it is weaker than confirmedShipments evidence. Use both when present.
- If publicMethodology is present, treat it as selected methodology evidence; if it is absent, mark methodology selection as missing.

Return JSON with this exact structure:
{
  "buyerId": "${buyer.id}",
  "buyerName": "${buyer.name}",
  "overallReadinessPct": <integer 0-100, weighted by criterion weight, capped at 60 if any deal-breaker is MISSING>,
  "summary": "<2-3 sentence executive summary of where the project stands>",
  "criteria": [
    {
      "criterionId": "<id from criteria list>",
      "label": "<label>",
      "status": "MEETS" | "PARTIAL" | "MISSING",
      "evidence": "<what in the project data supports the status — cite specific records, counts, statuses>",
      "gap": "<if not MEETS, exactly what's missing>",
      "action": "<concrete next step to move to MEETS — '1. Do X. 2. Do Y.'>",
      "priority": "P1_CRITICAL" | "P2_IMPORTANT" | "P3_NICE_TO_HAVE"
    },
    ...one entry per criterion
  ],
  "topActions": [
    <array of 3-5 strings, the highest-priority actions to move from current readiness to contract-ready>
  ],
  "dealBreakerIssues": <integer — count of deal-breaker criteria currently MISSING or PARTIAL>,
  "contractTimelineEstimate": "<'ready to pitch now' | 'weeks to ready' | '1-3 months to ready' | '3-6 months to ready' | '6+ months to ready'>"
}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "buyer_readiness",
            strict: false,
            schema: {
              type: "object",
              properties: {
                buyerId: { type: "string" },
                buyerName: { type: "string" },
                overallReadinessPct: { type: "number" },
                summary: { type: "string" },
                criteria: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      criterionId: { type: "string" },
                      label: { type: "string" },
                      status: { type: "string" },
                      evidence: { type: "string" },
                      gap: { type: "string" },
                      action: { type: "string" },
                      priority: { type: "string" },
                    },
                  },
                },
                topActions: { type: "array", items: { type: "string" } },
                dealBreakerIssues: { type: "number" },
                contractTimelineEstimate: { type: "string" },
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
        feature: "buyer_readiness",
        projectId: input.projectId,
        promptTokens,
        completionTokens,
        status: parsed ? "ok" : "error",
        errorMsg: parsed ? null : "LLM response not parseable JSON",
        metadata: {
          buyerId: input.buyerId,
          evidenceCount: evidenceRows.length,
          shipmentCount: shipmentRows.length,
          communityCount: communityRows.length,
          overallReadinessPct: parsed?.overallReadinessPct ?? null,
        },
      });

      return {
        report: parsed,
        tokenUsage: {
          prompt: promptTokens,
          completion: completionTokens,
        },
        dataPoints: {
          evidenceCount: evidenceRows.length,
          shipmentCount: shipmentRows.length,
          communityCount: communityRows.length,
        },
      };
    }),
});

// ─── Helpers: compact content summarizers for the LLM prompt ─────────────

function summarizeEvidenceContent(dataType: string, c: any): string {
  if (!c) return "—";
  if (dataType === "pyrolysis_batch") return `batch ${c.batchId}: ${c.biomassInputTonnes}t→${c.biocharOutputTonnes}t @ ${c.peakTempC}°C ${c.residenceTimeMin}min`;
  if (dataType === "lab_analysis") return `${c.labName}: H/Corg=${c.hCorgMolar ?? "?"}, C=${c.organicCarbonPct ?? "?"}%`;
  if (dataType === "biomass_receipt") return `${c.supplierName}: ${c.tonnesReceived}t ${c.biomassType}`;
  if (dataType === "energy_reading") return `${c.electricityKwh}kWh${c.dieselLiters ? ` +${c.dieselLiters}L diesel` : ""}`;
  if (dataType === "shift_log") return `${c.shiftId}: ${c.biocharOutputTonnes ?? 0}t`;
  if (dataType === "incident") return `[${c.severity}] ${c.category}`;
  if (dataType === "soil_application_plan") return `${c.planTitle}: ${c.targetCrop}, ${c.totalAreaHa}ha @ ${c.applicationRateKgPerHa}kg/ha (${c.applicationFrequency})`;
  return JSON.stringify(c).slice(0, 100);
}

function summarizeCommunityContent(recordType: string, c: any): string {
  if (!c) return "—";
  if (recordType === "meeting") return `${c.title} (${c.attendeesCount} attendees)`;
  if (recordType === "grievance") return `[${c.severity}] ${c.category}: ${c.description?.slice(0, 80)}`;
  if (recordType === "local_hire") return `${c.personName} (${c.isFromLocalCommunity ? "local" : "non-local"})`;
  if (recordType === "local_procurement") return `${c.supplierName}: USD ${c.amountUsd} ${c.isFromLocalCommunity ? "local" : "non-local"}`;
  if (recordType === "community_investment") return `${c.category}: USD ${c.amountUsd} → ${c.beneficiariesCount ?? 0} ben.`;
  if (recordType === "benefit_share") return `${c.type}: ${c.tonnesBiochar ?? 0}t`;
  if (recordType === "env_monitoring") return `${c.parameter}=${c.value}${c.unit} ${c.passesThreshold ? "✓" : "✗"}`;
  return JSON.stringify(c).slice(0, 100);
}
