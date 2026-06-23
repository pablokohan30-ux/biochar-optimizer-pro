/**
 * Custom LCA Methodology router — Expert tier feature.
 *
 * Lets Expert users define their own methodology (a named list of criteria)
 * and have the AI Builder generate a Custom Methodology Compliance doc that
 * evaluates any project against those criteria. Typical use: an internal
 * compliance framework that isn't covered by Puro/Isometric/etc.
 */

import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import { customMethodologies } from "../drizzle/schema";
import { requireTierAccess } from "./_core/access";

// Criterion shape. Matches what methodologyCompliance expects in aiProjectBuilder.ts.
const criterionSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  description: z.string().max(500),
  thresholdNote: z.string().max(300).optional(),
});

const criteriaArraySchema = z.array(criterionSchema).min(1).max(30);

function requireExpert(user: { role: string; subscriptionTier: string | null; subscriptionStatus: string | null }) {
  requireTierAccess(user, "expert", "UPGRADE_REQUIRED: Custom LCA methodology requires Expert tier.");
}

export const customMethodologyRouter = router({
  /**
   * List all custom methodologies belonging to the authenticated user.
   * Returns an empty array if the user hasn't created any yet.
   */
  list: protectedProcedure.query(({ ctx }) => {
    const db = requireDb();
    const rows = db
      .select()
      .from(customMethodologies)
      .where(eq(customMethodologies.userId, ctx.user.id))
      .orderBy(desc(customMethodologies.updatedAt))
      .all();
    return rows.map((r) => {
      let criteria: unknown = [];
      try { criteria = r.criteria ? JSON.parse(r.criteria) : []; } catch {}
      return {
        id: r.id,
        name: r.name,
        description: r.description ?? "",
        basedOn: r.basedOn ?? null,
        criteria,
        createdAt: r.createdAt ? new Date(r.createdAt).getTime() : 0,
        updatedAt: r.updatedAt ? new Date(r.updatedAt).getTime() : 0,
      };
    });
  }),

  /**
   * Fetch a single methodology (owner-scoped).
   */
  get: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(({ ctx, input }) => {
      const db = requireDb();
      const rows = db
        .select()
        .from(customMethodologies)
        .where(
          and(
            eq(customMethodologies.id, input.id),
            eq(customMethodologies.userId, ctx.user.id),
          ),
        )
        .limit(1)
        .all();
      if (rows.length === 0) throw new Error("Methodology not found");
      const r = rows[0];
      let criteria: unknown = [];
      try { criteria = r.criteria ? JSON.parse(r.criteria) : []; } catch {}
      return {
        id: r.id,
        name: r.name,
        description: r.description ?? "",
        basedOn: r.basedOn ?? null,
        criteria,
        createdAt: r.createdAt ? new Date(r.createdAt).getTime() : 0,
        updatedAt: r.updatedAt ? new Date(r.updatedAt).getTime() : 0,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        basedOn: z.enum(["puro-earth", "isometric", "ebc", "verra-vm0044", "gold-standard", "rainbow-standard"]).nullable().optional(),
        criteria: criteriaArraySchema,
      }),
    )
    .mutation(({ ctx, input }) => {
      requireExpert(ctx.user);
      const db = requireDb();
      const now = new Date();
      const result = db
        .insert(customMethodologies)
        .values({
          userId: ctx.user.id,
          name: input.name.trim(),
          description: input.description?.trim() ?? null,
          basedOn: input.basedOn ?? null,
          criteria: JSON.stringify(input.criteria),
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
        name: z.string().min(1).max(200).optional(),
        description: z.string().max(1000).nullable().optional(),
        basedOn: z.enum(["puro-earth", "isometric", "ebc", "verra-vm0044", "gold-standard", "rainbow-standard"]).nullable().optional(),
        criteria: criteriaArraySchema.optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      requireExpert(ctx.user);
      const db = requireDb();
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.name !== undefined) updates.name = input.name.trim();
      if (input.description !== undefined) updates.description = input.description?.trim() ?? null;
      if (input.basedOn !== undefined) updates.basedOn = input.basedOn ?? null;
      if (input.criteria !== undefined) updates.criteria = JSON.stringify(input.criteria);

      db.update(customMethodologies)
        .set(updates as any)
        .where(
          and(
            eq(customMethodologies.id, input.id),
            eq(customMethodologies.userId, ctx.user.id),
          ),
        )
        .run();
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const db = requireDb();
      db.delete(customMethodologies)
        .where(
          and(
            eq(customMethodologies.id, input.id),
            eq(customMethodologies.userId, ctx.user.id),
          ),
        )
        .run();
      return { success: true };
    }),
});
