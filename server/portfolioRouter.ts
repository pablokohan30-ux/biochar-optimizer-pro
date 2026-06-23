/**
 * Portfolio router — Expert tier flagship for multi-site operators.
 *
 * Aggregates both regular projects (created manually via /projects) and
 * AI-generated projects (from /ai-builder) into a unified portfolio view.
 * Gives operators of multiple facilities a single pane of glass.
 */

import { eq, desc } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import { projects, aiGeneratedProjects } from "../drizzle/schema";
import { hasTierAccessForUser } from "./_core/access";

// Heuristic estimates for a site if exact numbers aren't available.
// Biochar yield ~30% of biomass, credits ~3 tCO2e/t biochar × 85% permanence.
function estimateCdr(tnPerYearBiomass: number | null | undefined): number {
  if (!tnPerYearBiomass || tnPerYearBiomass <= 0) return 0;
  return Math.round(tnPerYearBiomass * 0.30 * 3 * 0.85);
}

function estimateBiochar(tnPerYearBiomass: number | null | undefined): number {
  if (!tnPerYearBiomass || tnPerYearBiomass <= 0) return 0;
  return Math.round(tnPerYearBiomass * 0.30);
}

export const portfolioRouter = router({
  /**
   * Unified portfolio dashboard for the authenticated user. Expert tier only
   * (admins bypass the gate).
   */
  dashboard: protectedProcedure.query(({ ctx }) => {
    if (!hasTierAccessForUser(ctx.user, "expert")) {
      throw new Error("UPGRADE_REQUIRED: Portfolio Dashboard requires Expert tier.");
    }

    const db = requireDb();

    // Regular projects (manually managed via /projects)
    const regularRows = db
      .select()
      .from(projects)
      .where(eq(projects.userId, ctx.user.id))
      .orderBy(desc(projects.createdAt))
      .all();

    // AI-generated projects
    const aiRows = db
      .select()
      .from(aiGeneratedProjects)
      .where(eq(aiGeneratedProjects.userId, ctx.user.id))
      .orderBy(desc(aiGeneratedProjects.createdAt))
      .all();

    // Normalize both into a common "Site" shape.
    type Site = {
      id: string;          // "project-{id}" or "ai-{id}"
      source: "project" | "ai";
      name: string;
      country: string | null;
      location: string | null;
      latitude: number | null;
      longitude: number | null;
      capacityTnYear: number | null;
      plantCapacityTph: number | null;
      biocharTnYear: number;
      cdrTCo2ePerYear: number;
      methodology: string | null;
      status: string;
      createdAt: number;
      linkHref: string;
    };

    const sites: Site[] = [];

    for (const p of regularRows) {
      const tnYear = p.plantCapacityTph ? p.plantCapacityTph * 8000 : null;
      sites.push({
        id: `project-${p.id}`,
        source: "project",
        name: p.name,
        country: p.country ?? null,
        location: p.location ?? null,
        latitude: p.latitude ?? null,
        longitude: p.longitude ?? null,
        capacityTnYear: tnYear,
        plantCapacityTph: p.plantCapacityTph ?? null,
        biocharTnYear: estimateBiochar(tnYear),
        cdrTCo2ePerYear: estimateCdr(tnYear),
        methodology: p.publicMethodology ?? null,
        status: p.status ?? "draft",
        createdAt: p.createdAt ? new Date(p.createdAt).getTime() : 0,
        linkHref: `/projects/${p.id}`,
      });
    }

    for (const a of aiRows) {
      sites.push({
        id: `ai-${a.id}`,
        source: "ai",
        name: a.name,
        country: a.country,
        location: a.location ?? null,
        latitude: null,
        longitude: null,
        capacityTnYear: a.capacityTnYear,
        plantCapacityTph: a.capacityTnYear ? a.capacityTnYear / 8000 : null,
        biocharTnYear: estimateBiochar(a.capacityTnYear),
        cdrTCo2ePerYear: estimateCdr(a.capacityTnYear),
        methodology: a.targetMethodology ?? null,
        status: a.status ?? "pending",
        createdAt: a.createdAt ? new Date(a.createdAt).getTime() : 0,
        linkHref: `/ai-builder/${a.id}`,
      });
    }

    // Sort by most recent
    sites.sort((a, b) => b.createdAt - a.createdAt);

    // Aggregates
    const totalSites = sites.length;
    const totalCapacityTnYear = sites.reduce((s, x) => s + (x.capacityTnYear ?? 0), 0);
    const totalBiocharTnYear = sites.reduce((s, x) => s + x.biocharTnYear, 0);
    const totalCdrTCo2ePerYear = sites.reduce((s, x) => s + x.cdrTCo2ePerYear, 0);

    const byCountry: Record<string, number> = {};
    for (const s of sites) {
      if (s.country) byCountry[s.country] = (byCountry[s.country] ?? 0) + 1;
    }

    const byMethodology: Record<string, number> = {};
    for (const s of sites) {
      if (s.methodology) byMethodology[s.methodology] = (byMethodology[s.methodology] ?? 0) + 1;
    }

    const byStatus: Record<string, number> = {};
    for (const s of sites) {
      byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    }

    const bySource = {
      project: sites.filter((s) => s.source === "project").length,
      ai: sites.filter((s) => s.source === "ai").length,
    };

    return {
      totals: {
        sites: totalSites,
        capacityTnYear: totalCapacityTnYear,
        biocharTnYear: totalBiocharTnYear,
        cdrTCo2ePerYear: totalCdrTCo2ePerYear,
      },
      bySource,
      byCountry,
      byMethodology,
      byStatus,
      sites,
    };
  }),
});
