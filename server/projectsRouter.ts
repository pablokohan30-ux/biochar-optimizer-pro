import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import { projects } from "../drizzle/schema";
import { geocodeAddress } from "./_core/geocoding";

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
});

function requireAnalyst(tier: string | null | undefined, status: string | null | undefined) {
  if (tier === "free" || !tier) {
    throw new Error("UPGRADE_REQUIRED: Project management requires the Analyst plan or higher.");
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
      return rows[0] ?? null;
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

      const result = db
        .insert(projects)
        .values({
          userId: ctx.user.id,
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

      return { id: Number(result.lastInsertRowid) };
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

  geocode: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      requireAnalyst(ctx.user.subscriptionTier, ctx.user.subscriptionStatus);
      return await geocodeAddress(input.query);
    }),
});
