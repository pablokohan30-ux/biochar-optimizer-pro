import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import { projects } from "../drizzle/schema";
import { geocodeAddress, searchAddresses } from "./_core/geocoding";
import { fetchClimateData } from "./_core/openmeteo";
import { fetchSoilData } from "./_core/soilgrids";
import { buildSubmissionPayload } from "./_core/submissionExporter";
import { resolveProjectFeedstock } from "../client/src/lib/projectFeedstock";

/**
 * Generate the next BOP project ID for the current year.
 * Format: `BOP-YYYY-NNNN` (e.g. "BOP-2026-0042").
 *
 * Uses a count-based strategy — counts existing projects with a bopId for
 * the current year, adds 1, pads to 4 digits. Race condition risk is low
 * (single-tenant SQLite, low write volume) and worst case two projects get
 * the same ID — but UNIQUE index isn't enforced to keep this simple.
 */
function generateBopId(db: ReturnType<typeof requireDb>): string {
  const year = new Date().getFullYear();
  const prefix = `BOP-${year}-`;
  // Count projects this year
  const rows = db
    .select({ count: sql<number>`count(*)` })
    .from(projects)
    .where(sql`${projects.bopId} LIKE ${prefix + "%"}`)
    .all();
  const next = (rows[0]?.count ?? 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

const projectInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  plantCapacityTph: z.number().min(0).max(1000).optional().nullable(),
  feedstockId: z.string().max(200).optional().nullable(),
  feedstockData: z.string().optional().nullable(),
  temperature: z.number().int().min(300).max(900).optional(),
  residenceTime: z.number().int().min(5).max(180).optional(),
  qualityGoal: z.enum(["MAX_CARBON", "AGRONOMY", "BALANCED"]).optional(),
  status: z.enum(["draft", "submitted", "approved", "rejected"]).optional(),
  publicVisibility: z.enum(["private", "summary", "full"]).optional(),
  publicMethodology: z.string().max(50).optional().nullable(),
});

function requireAnalyst(tier: string | null | undefined, status: string | null | undefined) {
  if (tier === "free" || !tier) {
    throw new Error("UPGRADE_REQUIRED: Project management requires the Analyst plan or higher.");
  }
  if (status && status !== "active") {
    throw new Error("UPGRADE_REQUIRED: Your subscription is not active. Please update your payment method.");
  }
}

function requireDeveloper(tier: string | null | undefined, status: string | null | undefined) {
  const ok = tier === "developer" || tier === "engineer" || tier === "expert";
  if (!ok) {
    throw new Error("UPGRADE_REQUIRED: Submission export requires the Developer plan or higher.");
  }
  if (status && status !== "active") {
    throw new Error("UPGRADE_REQUIRED: Your subscription is not active. Please update your payment method.");
  }
}

export const projectsRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    requireAnalyst(ctx.user.subscriptionTier, ctx.user.subscriptionStatus);
    const db = requireDb();
    return db
      .select()
      .from(projects)
      .where(eq(projects.userId, ctx.user.id))
      .orderBy(desc(projects.updatedAt))
      .all();
  }),

  get: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(({ ctx, input }) => {
      requireAnalyst(ctx.user.subscriptionTier, ctx.user.subscriptionStatus);
      const db = requireDb();
      const rows = db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)))
        .limit(1)
        .all();
      let project = rows[0];
      if (!project) return null;
      // Lazy backfill: assign a bopId to legacy projects on first read.
      if (!project.bopId) {
        const newBopId = generateBopId(db);
        db.update(projects)
          .set({ bopId: newBopId })
          .where(eq(projects.id, project.id))
          .run();
        project = { ...project, bopId: newBopId };
      }
      return project;
    }),

  create: protectedProcedure
    .input(projectInput)
    .mutation(async ({ ctx, input }) => {
      requireAnalyst(ctx.user.subscriptionTier, ctx.user.subscriptionStatus);
      const db = requireDb();
      const now = new Date();

      // If location provided but no coords, geocode it
      let latitude = input.latitude ?? null;
      let longitude = input.longitude ?? null;
      let country = input.country ?? null;
      if (input.location && (latitude === null || longitude === null)) {
        try {
          const geo = await geocodeAddress(input.location);
          if (geo) {
            latitude = geo.lat;
            longitude = geo.lon;
            country = geo.country;
          }
        } catch (err) {
          console.warn("[projects.create] Geocoding failed:", err);
        }
      }

      const bopId = generateBopId(db);
      const result = db
        .insert(projects)
        .values({
          userId: ctx.user.id,
          bopId,
          name: input.name,
          description: input.description ?? null,
          location: input.location ?? null,
          latitude,
          longitude,
          country,
          plantCapacityTph: input.plantCapacityTph ?? null,
          feedstockId: input.feedstockId ?? null,
          feedstockData: input.feedstockData ?? null,
          temperature: input.temperature ?? 650,
          residenceTime: input.residenceTime ?? 30,
          qualityGoal: input.qualityGoal ?? "BALANCED",
          createdAt: now,
          updatedAt: now,
        })
        .run();

      return { id: Number(result.lastInsertRowid), bopId };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number().int(), data: projectInput.partial() }))
    .mutation(({ ctx, input }) => {
      requireAnalyst(ctx.user.subscriptionTier, ctx.user.subscriptionStatus);
      const db = requireDb();
      const existing = db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)))
        .limit(1)
        .all();
      if (existing.length === 0) throw new Error("Project not found");

      db.update(projects)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)))
        .run();

      return { success: true as const };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      requireAnalyst(ctx.user.subscriptionTier, ctx.user.subscriptionStatus);
      const db = requireDb();
      db.delete(projects)
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)))
        .run();
      return { success: true as const };
    }),

  /**
   * Persist the user's "manual confirmation" check states for pre-assessment.
   *
   * Shape: { methodologyId → { checkId → boolean | null } }. `null` is used
   * instead of `undefined` so the JSON round-trip is stable.
   *
   * Separate from `update` because (a) the validation is specific to the
   * check state shape, and (b) these writes happen on every single toggle —
   * keeping the endpoint narrow makes it obvious this isn't a full project
   * edit and lets us optimise independently later (e.g. debouncing).
   */
  updateManualChecks: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        // methodologyId → checkId → true (pass) | false (fail) | null (unset)
        manualChecks: z.record(
          z.string().min(1).max(100),
          z.record(
            z.string().min(1).max(100),
            z.boolean().nullable()
          )
        ),
      })
    )
    .mutation(({ ctx, input }) => {
      requireAnalyst(ctx.user.subscriptionTier, ctx.user.subscriptionStatus);
      const db = requireDb();
      const existing = db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)))
        .limit(1)
        .all();
      if (existing.length === 0) throw new Error("Project not found");

      db.update(projects)
        .set({
          manualChecks: JSON.stringify(input.manualChecks),
          updatedAt: new Date(),
        })
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)))
        .run();

      return { success: true as const };
    }),

  geocode: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      requireAnalyst(ctx.user.subscriptionTier, ctx.user.subscriptionStatus);
      return await geocodeAddress(input.query);
    }),

  /** Live-search address suggestions for autocomplete dropdown. */
  searchLocation: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(500) }))
    .query(async ({ ctx, input }) => {
      requireAnalyst(ctx.user.subscriptionTier, ctx.user.subscriptionStatus);
      if (input.query.trim().length < 3) return [];
      return await searchAddresses(input.query, 5);
    }),

  /** Fetch climate + soil data for a project's coordinates. */
  getRegionalData: protectedProcedure
    .input(z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }))
    .query(async ({ ctx, input }) => {
      requireAnalyst(ctx.user.subscriptionTier, ctx.user.subscriptionStatus);
      const [climate, soil] = await Promise.all([
        fetchClimateData(input.lat, input.lon),
        fetchSoilData(input.lat, input.lon),
      ]);
      return { climate, soil };
    }),

  /**
   * PUBLIC version of getRegionalData — used by the /demo page and any other
   * unauthenticated surface. Underlying APIs (Open-Meteo, SoilGrids) are free
   * and have their own rate limits, so this is safe to expose.
   */
  getRegionalDataPublic: publicProcedure
    .input(z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }))
    .query(async ({ input }) => {
      const [climate, soil] = await Promise.all([
        fetchClimateData(input.lat, input.lon),
        fetchSoilData(input.lat, input.lon),
      ]);
      return { climate, soil };
    }),

  /**
   * Export a project's data as a structured submission JSON for the selected
   * methodology. Developer+ tier. Returns the payload directly — the client
   * can either trigger a JSON download or render a printable PDF page.
   *
   * Implemented as a query (not mutation) because it's pure read: same inputs
   * always produce the same output, no side effects. Lets the PDF page
   * leverage react-query caching + refetch.
   */
  exportSubmission: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      methodologyId: z.enum(["puro-earth", "isometric", "ebc", "verra-vm0044", "gold-standard", "rainbow-standard"]),
    }))
    .query(async ({ ctx, input }) => {
      requireDeveloper(ctx.user.subscriptionTier, ctx.user.subscriptionStatus);
      const db = requireDb();
      const rows = db
        .select()
        .from(projects)
        .where(and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id)))
        .limit(1)
        .all();
      const project = rows[0];
      if (!project) throw new Error("Project not found");

      // Load biochar model + methodology registry dynamically
      const { compute_all, FEEDSTOCK_DB } = await import("../client/src/lib/biocharModel");
      const { calculateScore } = await import("../client/src/lib/biocharScore");
      const { ACTIVE_METHODOLOGIES, METHODOLOGIES } = await import("../client/src/lib/methodologies");

      // Resolve feedstock
      const feedstock = resolveProjectFeedstock(project.feedstockId, project.feedstockData, FEEDSTOCK_DB);
      if (!feedstock) {
        throw new Error("Cannot resolve feedstock — export requires a valid feedstock configured on the project.");
      }

      const T = project.temperature ?? 650;
      const t = project.residenceTime ?? 30;

      const result = compute_all(T, t, feedstock);

      const methodology = METHODOLOGIES[input.methodologyId];
      if (!methodology) throw new Error(`Methodology ${input.methodologyId} not found.`);

      // Evaluate auto checks
      const autoCheckResults = methodology.checks
        .filter((c) => c.type === "auto")
        .map((c) => {
          if (!c.evaluator) {
            return { id: c.id, passed: false, critical: c.critical, detail: "no-evaluator" };
          }
          const r = c.evaluator({
            result,
            feedstock,
            temperature: T,
            residenceTime: t,
            plantCapacityTph: project.plantCapacityTph,
            country: project.country,
          });
          return { id: c.id, passed: r.pass, critical: c.critical, detail: r.detail };
        });

      const payload = buildSubmissionPayload({
        methodologyId: input.methodologyId,
        project,
        result,
        feedstock: {
          id: project.feedstockId ?? undefined,
          name: feedstock.name,
          category: typeof (feedstock as { category?: unknown }).category === "string"
            ? (feedstock as { category?: string }).category
            : undefined,
          elemental: {
            C: feedstock.C,
            H: feedstock.H,
            N: feedstock.N,
            S: feedstock.S,
            O: feedstock.O,
          },
          ash_pct: feedstock.ash,
          moisture_pct: feedstock.moisture,
        },
        methodology: {
          id: methodology.id,
          name: methodology.name,
          shortName: methodology.shortName,
          priceRange: methodology.priceRange,
          durability: methodology.durability,
          checks: methodology.checks.map((c) => ({
            id: c.id,
            type: c.type,
            critical: c.critical,
            weight: c.weight,
            labelKey: c.labelKey,
            descKey: c.descKey,
          })),
        },
        autoCheckResults,
      });

      return payload;
    }),

  /**
   * PUBLIC verify endpoint — looks up a project by its BOP ID and returns a
   * sanitized public summary (or null if not found / private).
   *
   * NO authentication required. Anyone with a valid BOP ID can call this.
   *
   * Returns:
   * - If not found OR `publicVisibility = "private"` → null (caller renders 404)
   * - If `publicVisibility = "summary"` (default) → name, country, status, methodology, dates, registered flag
   * - If `publicVisibility = "full"` → above + city-level location + simulation snapshot (T, time, feedstock id only — never lab data)
   *
   * IMPORTANT: We never expose `feedstockData` (may contain proprietary lab
   * results), `userId`, or the exact lat/lon coordinates. The "full" mode
   * only adds the city/country location string and the pyrolysis params.
   */
  verifyByBopId: publicProcedure
    .input(z.object({ bopId: z.string().min(1).max(50) }))
    .query(async ({ input }) => {
      const db = requireDb();
      // Normalize the input — accept both `BOP-2026-0042` and `bop-2026-0042`.
      const bopId = input.bopId.toUpperCase().trim();

      // Load biochar model + methodologies dynamically (shared with client).
      // Used for server-side annual estimates and auto-check summaries.
      const { compute_all, FEEDSTOCK_DB } = await import("../client/src/lib/biocharModel");
      const { calculateScore } = await import("../client/src/lib/biocharScore");
      const { ACTIVE_METHODOLOGIES, METHODOLOGIES } = await import("../client/src/lib/methodologies");

      // Reference CORC price used for annual revenue estimates.
      // Conservative mid-market figure; publicly cited range is $130-$250 (2025).
      const CORC_PRICE_USD = 150;
      const ANNUAL_OPERATING_HOURS = 8000;

      /**
       * Computes annual estimates + auto-check pass/fail summary for a given
       * project snapshot. Used for both the DEMO and real projects when we
       * have enough data (capacity + feedstock + temperature).
       */
      function enrich(opts: {
        methodologyId: string;
        feedstockId: string | null;
        feedstockData: string | null;
        temperature: number | null;
        residenceTime: number | null;
        plantCapacityTph: number | null;
        country: string | null;
      }) {
        const T = opts.temperature;
        const t = opts.residenceTime;
        const cap = opts.plantCapacityTph;

        // Resolve feedstock (from custom JSON or FEEDSTOCK_DB)
        let feedstock = null as ReturnType<typeof resolveFeedstock>;
        try {
          feedstock = resolveFeedstock(opts.feedstockId, opts.feedstockData, FEEDSTOCK_DB);
        } catch {
          feedstock = null;
        }

        if (!feedstock || T === null || t === null) {
          return {
            annualBiocharOutput: null,
            annualFeedstock: null,
            annualCO2Removals: null,
            annualRevenuePotential: null,
            autoChecksSummary: null,
          };
        }

        const result = compute_all(T, t, feedstock);

        // Annual throughput (only if we know capacity).
        //
        // IMPORTANT unit convention:
        //   `result.credits.net` is t CO2e per tonne of BIOCHAR (not feedstock).
        //   Per tonne of feedstock: multiply by yield fraction.
        //   Equivalent: annualBiochar × credits.net (used below for clarity).
        const annualFeedstock = cap ? cap * ANNUAL_OPERATING_HOURS : null;
        const annualBiocharOutput = annualFeedstock ? annualFeedstock * (result.yield_ / 100) : null;
        const annualCO2Removals = annualBiocharOutput ? annualBiocharOutput * result.credits.net : null;
        const annualRevenuePotential = annualCO2Removals ? annualCO2Removals * CORC_PRICE_USD : null;

        // Auto-check summary for the target methodology
        const methodology = METHODOLOGIES[opts.methodologyId as keyof typeof METHODOLOGIES] ?? METHODOLOGIES["puro-earth"];
        const autoChecks = methodology.checks.filter((c) => c.type === "auto");
        const checkInput = {
          result,
          feedstock,
          temperature: T,
          residenceTime: t,
          plantCapacityTph: cap,
          country: opts.country,
        };
        const runChecks = autoChecks.map((c) => {
          if (!c.evaluator) return { id: c.id, passed: false, detail: "no-evaluator", critical: c.critical };
          const r = c.evaluator(checkInput);
          return { id: c.id, passed: r.pass, detail: r.detail, critical: c.critical };
        });
        const passed = runChecks.filter((r) => r.passed).length;
        const autoChecksSummary = {
          passed,
          total: autoChecks.length,
          methodologyShortName: methodology.shortName,
          checks: runChecks,
        };

        return {
          annualBiocharOutput,
          annualFeedstock,
          annualCO2Removals,
          annualRevenuePotential,
          autoChecksSummary,
        };
      }

      function pickPublicMethodology(opts: {
        methodologyId: string | null;
        feedstockId: string | null;
        feedstockData: string | null;
        temperature: number | null;
        residenceTime: number | null;
        plantCapacityTph: number | null;
        country: string | null;
      }) {
        const explicitMethodology = opts.methodologyId?.trim() ?? null;
        if (
          explicitMethodology &&
          explicitMethodology in METHODOLOGIES
        ) {
          return explicitMethodology;
        }

        let feedstock = null as ReturnType<typeof resolveFeedstock>;
        try {
          feedstock = resolveFeedstock(opts.feedstockId, opts.feedstockData, FEEDSTOCK_DB);
        } catch {
          feedstock = null;
        }

        if (!feedstock || opts.temperature === null || opts.residenceTime === null) {
          return "puro-earth";
        }

        const temperature = opts.temperature;
        const residenceTime = opts.residenceTime;
        const result = compute_all(temperature, residenceTime, feedstock);
        const recommendation = ACTIVE_METHODOLOGIES
          .map((id: keyof typeof METHODOLOGIES) => ({
            id,
            score: calculateScore(METHODOLOGIES[id], {
              result,
              feedstock,
              temperature,
              residenceTime,
              plantCapacityTph: opts.plantCapacityTph,
              country: opts.country,
              manualStates: {},
            }),
          }))
          .sort(
            (
              a: { id: keyof typeof METHODOLOGIES; score: { value: number } },
              b: { id: keyof typeof METHODOLOGIES; score: { value: number } },
            ) => b.score.value - a.score.value,
          )[0];

        return recommendation?.id ?? "puro-earth";
      }

      // Special case: the public demo project is hardcoded (not in the DB).
      // The /demo page links here so visitors can see the verify flow end-to-end.
      if (bopId === "BOP-2026-DEMO") {
        const now = new Date();
        const demoMeta = {
          bopId: "BOP-2026-DEMO",
          name: "Huila Coffee Husk Pyrolysis Plant",
          country: "Colombia",
          location: "Neiva, Huila, Colombia",
          status: "submitted" as const,
          methodology: "puro-earth",
          temperature: 650,
          residenceTime: 30,
          qualityGoal: "BALANCED" as const,
          plantCapacityTph: 1.5,
          feedstockId: "coffee_husk",
          createdAt: now,
          updatedAt: now,
          visibility: "full" as const,
          // NEW: demographics / project identity
          developer: "Anonymous developer · demo project",
          projectType: "Industrial continuous pyrolysis",
          technology: "Continuous screw reactor · mid-temperature regime",
          commissioningDate: "Q2 2026 (planned)",
          feedstockCategory: "Agricultural residue — coffee husk / cascara",
          feedstockOrigin: "Regional coffee mills within 80 km radius",
        };
        const enriched = enrich({
          methodologyId: demoMeta.methodology,
          feedstockId: demoMeta.feedstockId,
          feedstockData: null,
          temperature: demoMeta.temperature,
          residenceTime: demoMeta.residenceTime,
          plantCapacityTph: demoMeta.plantCapacityTph,
          country: demoMeta.country,
        });
        return { ...demoMeta, ...enriched };
      }

      // Basic sanity check on format to avoid wasting DB lookups on garbage.
      if (!/^BOP-\d{4}-\d{1,6}$/.test(bopId)) return null;

      const rows = db
        .select()
        .from(projects)
        .where(eq(projects.bopId, bopId))
        .limit(1)
        .all();

      const project = rows[0];
      if (!project) return null;

      // Owner has hidden this project from public view → behave as not-found.
      if (project.publicVisibility === "private") return null;

      const isFull = project.publicVisibility === "full";

      // Annual estimates + auto-check summary are computable any time we have
      // capacity + feedstock + T/time — they're high-level marketing numbers,
      // not proprietary. Surface them in BOTH summary and full modes so the
      // page feels substantial regardless of visibility setting.
      const publicMethodology = pickPublicMethodology({
        methodologyId: project.publicMethodology,
        feedstockId: project.feedstockId,
        feedstockData: project.feedstockData,
        temperature: project.temperature,
        residenceTime: project.residenceTime,
        plantCapacityTph: project.plantCapacityTph,
        country: project.country,
      });

      const enriched = enrich({
        methodologyId: publicMethodology,
        feedstockId: project.feedstockId,
        feedstockData: project.feedstockData,
        temperature: project.temperature,
        residenceTime: project.residenceTime,
        plantCapacityTph: project.plantCapacityTph,
        country: project.country,
      });

      return {
        bopId: project.bopId,
        name: project.name,
        // Always show country (low risk for verification purposes).
        country: project.country,
        // City-level location string only in full mode. Coordinates NEVER shown.
        location: isFull ? project.location : null,
        status: project.status ?? "draft",
        methodology: publicMethodology,
        // Pyrolysis snapshot in full mode (no lab data ever leaked).
        temperature: isFull ? project.temperature : null,
        residenceTime: isFull ? project.residenceTime : null,
        qualityGoal: isFull ? project.qualityGoal : null,
        plantCapacityTph: isFull ? project.plantCapacityTph : null,
        feedstockId: isFull ? project.feedstockId : null,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        // Visibility level (the client uses this to render different layouts).
        visibility: project.publicVisibility ?? "summary",
        // NEW: metadata fields (null for now — real projects don't have a UI to
        // populate these yet; can be added to schema later).
        developer: null,
        projectType: null,
        technology: null,
        commissioningDate: null,
        feedstockCategory: null,
        feedstockOrigin: null,
        // NEW: enriched fields (annual estimates + auto-check summary).
        ...enriched,
      };
    }),
});

/**
 * Resolve a feedstock from either a custom JSON blob or the shared FEEDSTOCK_DB
 * index. Server-side helper for verifyByBopId.
 */
function resolveFeedstock(
  feedstockId: string | null,
  feedstockData: string | null,
  FEEDSTOCK_DB: Record<string, any>,
) {
  return resolveProjectFeedstock(feedstockId, feedstockData, FEEDSTOCK_DB);
}
