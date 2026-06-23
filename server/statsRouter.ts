import { sql } from "drizzle-orm";
import { publicProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import { projects } from "../drizzle/schema";
import {
  COVERED_METHODOLOGIES,
  LIVE_METHODOLOGIES,
  METHODOLOGIES,
} from "../client/src/lib/methodologies";
import { FEEDSTOCK_DB } from "../client/src/lib/biocharModel";

/**
 * Public marketing stats endpoint — powers the hero trust-indicator grid on
 * the landing page.
 *
 * Design rule: we NEVER show embarrassing usage numbers.
 *
 * Coverage stats (always visible) reflect what we've built and will always
 * feel impressive: number of active methodologies, feedstocks catalogued,
 * languages supported, model accuracy vs peer-reviewed data.
 *
 * Usage stats (projects with BOP ID, etc.) are only returned if they cross a
 * threshold — below that, the client hides the tile entirely. This lets us
 * ship the feature now and watch it light up as adoption grows, without
 * auto-sabotaging the hero with a "1 project created" display today.
 */

// Minimum value for a "usage" tile to be worth showing publicly.
const USAGE_THRESHOLD_PROJECTS = 5;

export const statsRouter = router({
  getLandingStats: publicProcedure.query(() => {
    // ─── Coverage (static / derived from our own artifacts) ────────────────
    const activeMethodologies = LIVE_METHODOLOGIES.length;
    const totalMethodologies = COVERED_METHODOLOGIES.length;
    const feedstocks = Object.keys(FEEDSTOCK_DB).length;
    // "Active" credit-issuing methodologies — the ones that actually mint carbon credits
    const activeCreditIssuing = LIVE_METHODOLOGIES.filter(
      (id) => METHODOLOGIES[id].credits,
    ).length;

    // ─── Usage (from DB) ───────────────────────────────────────────────────
    let totalProjects = 0;
    let projectsWithBopId = 0;
    try {
      const db = requireDb();
      const allRows = db.select({ c: sql<number>`count(*)` }).from(projects).all();
      totalProjects = allRows[0]?.c ?? 0;
      const bopRows = db
        .select({ c: sql<number>`count(*)` })
        .from(projects)
        .where(sql`${projects.bopId} IS NOT NULL`)
        .all();
      projectsWithBopId = bopRows[0]?.c ?? 0;
    } catch {
      // If the DB is down, just skip usage stats — don't break the landing.
    }

    // Only surface usage numbers when they're worth showing.
    const usageVisible = projectsWithBopId >= USAGE_THRESHOLD_PROJECTS;

    return {
      coverage: {
        activeMethodologies,
        totalMethodologies,
        activeCreditIssuing,
        feedstocks,
        languages: 2, // EN, ES
        // Model calibration accuracy vs peer-reviewed literature (CINDECA / CONICET etc.)
        modelAccuracy: "±5-8%",
      },
      usage: {
        visible: usageVisible,
        totalProjects: usageVisible ? totalProjects : null,
        projectsWithBopId: usageVisible ? projectsWithBopId : null,
      },
    };
  }),
});
