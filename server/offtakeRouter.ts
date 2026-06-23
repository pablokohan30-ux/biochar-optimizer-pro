/**
 * Offtake Tracker router — Stage 3 of the biochar journey.
 *
 * For operators of running plants that need to prove to buyers (Microsoft,
 * Shell, etc.) exactly where every tonne of biochar ends up. The operator
 * logs each shipment; the end-user confirms receipt + application via a
 * public /confirm/:token URL.
 *
 * Tier gate: Expert (admins bypass).
 *
 * Public confirmation endpoint (confirmByToken + getByToken) is NOT tier-
 * gated — the end-user who receives the biochar probably isn't a paying
 * user. The token is unguessable so the only way to hit it is by opening
 * the link the operator sent.
 */

import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import { biocharShipments, projects } from "../drizzle/schema";
import { requireTierAccess } from "./_core/access";

// ─── Tier gate helper ─────────────────────────────────────────────────────

function requireExpert(user: { role: string; subscriptionTier: string | null; subscriptionStatus: string | null }) {
  requireTierAccess(user, "expert", "UPGRADE_REQUIRED: Offtake Tracker requires Expert tier.");
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

function generateShipmentCode(): string {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `SHIP-${year}-${rand}`;
}

function generateConfirmationToken(): string {
  // 24 bytes = 32 base64url chars — plenty unguessable and URL-safe.
  return crypto.randomBytes(24).toString("base64url");
}

// ─── Router ───────────────────────────────────────────────────────────────

export const offtakeRouter = router({
  /** List all shipments for a project, newest first. */
  list: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ ctx, input }) => {
      assertOwnsProject(ctx.user.id, input.projectId);
      const db = requireDb();
      const rows = db
        .select()
        .from(biocharShipments)
        .where(eq(biocharShipments.projectId, input.projectId))
        .orderBy(desc(biocharShipments.shipmentDate))
        .all();
      return rows.map((r) => {
        let batchRefs: number[] = [];
        try { batchRefs = r.batchRefs ? JSON.parse(r.batchRefs) : []; } catch {}
        return {
          id: r.id,
          shipmentCode: r.shipmentCode,
          shipmentDate: r.shipmentDate ? new Date(r.shipmentDate).getTime() : 0,
          tonnes: r.tonnes,
          batchRefs,
          endUseCategory: r.endUseCategory,
          destinationName: r.destinationName,
          destinationAddress: r.destinationAddress,
          destinationCountry: r.destinationCountry,
          destinationLat: r.destinationLat,
          destinationLon: r.destinationLon,
          carrierName: r.carrierName,
          carrierVehicle: r.carrierVehicle,
          confirmationToken: r.confirmationToken,
          status: r.status,
          confirmedAt: r.confirmedAt ? new Date(r.confirmedAt).getTime() : null,
          confirmedByName: r.confirmedByName,
          confirmedByEmail: r.confirmedByEmail,
          confirmedTonnesApplied: r.confirmedTonnesApplied,
          confirmedApplicationDate: r.confirmedApplicationDate ? new Date(r.confirmedApplicationDate).getTime() : null,
          confirmedApplicationType: r.confirmedApplicationType,
          confirmedCropOrUseType: r.confirmedCropOrUseType,
          confirmedLat: r.confirmedLat,
          confirmedLon: r.confirmedLon,
          confirmedNotes: r.confirmedNotes,
          notes: r.notes,
          attachmentRef: r.attachmentRef,
          createdAt: r.createdAt ? new Date(r.createdAt).getTime() : 0,
          updatedAt: r.updatedAt ? new Date(r.updatedAt).getTime() : 0,
        };
      });
    }),

  /** Aggregate stats for a project — tonnes shipped vs confirmed-applied, etc. */
  summary: protectedProcedure
    .input(z.object({ projectId: z.number().int() }))
    .query(({ ctx, input }) => {
      assertOwnsProject(ctx.user.id, input.projectId);
      const db = requireDb();
      const rows = db
        .select()
        .from(biocharShipments)
        .where(eq(biocharShipments.projectId, input.projectId))
        .all();

      const totalShipments = rows.length;
      const totalTonnesShipped = rows.reduce((s, r) => s + (r.tonnes ?? 0), 0);
      const appliedRows = rows.filter((r) => r.status === "applied");
      const totalTonnesApplied = appliedRows.reduce(
        (s, r) => s + (r.confirmedTonnesApplied ?? r.tonnes ?? 0),
        0,
      );
      const byStatus: Record<string, number> = {};
      for (const r of rows) {
        const s = r.status ?? "draft";
        byStatus[s] = (byStatus[s] ?? 0) + 1;
      }
      const byCategory: Record<string, number> = {};
      for (const r of rows) {
        const c = r.endUseCategory ?? "unspecified";
        byCategory[c] = (byCategory[c] ?? 0) + (r.tonnes ?? 0);
      }
      const byCountry: Record<string, number> = {};
      for (const r of rows) {
        const c = r.destinationCountry ?? "unknown";
        byCountry[c] = (byCountry[c] ?? 0) + (r.tonnes ?? 0);
      }

      const traceabilityPct = totalTonnesShipped > 0
        ? Math.round((totalTonnesApplied / totalTonnesShipped) * 100)
        : 0;

      return {
        totalShipments,
        totalTonnesShipped,
        totalTonnesApplied,
        traceabilityPct,
        byStatus,
        byCategory,
        byCountry,
      };
    }),

  /** Create a new shipment. Auto-generates code + token. */
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.number().int(),
        shipmentDateMs: z.number(),
        tonnes: z.number().positive(),
        batchRefs: z.array(z.number().int()).optional(),
        endUseCategory: z.enum(["agricultural_soil", "horticulture", "cement_substitute", "construction_filler", "water_filtration", "livestock_feed", "other"]).optional(),
        destinationName: z.string().max(200).optional(),
        destinationAddress: z.string().max(500).optional(),
        destinationCountry: z.string().max(100).optional(),
        destinationLat: z.number().min(-90).max(90).optional(),
        destinationLon: z.number().min(-180).max(180).optional(),
        carrierName: z.string().max(200).optional(),
        carrierVehicle: z.string().max(100).optional(),
        notes: z.string().max(1000).optional(),
        status: z.enum(["draft", "dispatched", "in_transit", "delivered"]).default("dispatched"),
      }),
    )
    .mutation(({ ctx, input }) => {
      requireExpert(ctx.user);
      assertOwnsProject(ctx.user.id, input.projectId);
      const db = requireDb();
      const now = new Date();

      // Retry loop in case of (extremely rare) token collision
      let token = generateConfirmationToken();
      let code = generateShipmentCode();
      for (let i = 0; i < 3; i++) {
        try {
          const result = db
            .insert(biocharShipments)
            .values({
              userId: ctx.user.id,
              projectId: input.projectId,
              shipmentCode: code,
              shipmentDate: new Date(input.shipmentDateMs),
              tonnes: input.tonnes,
              batchRefs: input.batchRefs ? JSON.stringify(input.batchRefs) : null,
              endUseCategory: input.endUseCategory ?? null,
              destinationName: input.destinationName ?? null,
              destinationAddress: input.destinationAddress ?? null,
              destinationCountry: input.destinationCountry ?? null,
              destinationLat: input.destinationLat ?? null,
              destinationLon: input.destinationLon ?? null,
              carrierName: input.carrierName ?? null,
              carrierVehicle: input.carrierVehicle ?? null,
              confirmationToken: token,
              status: input.status,
              notes: input.notes ?? null,
              createdAt: now,
              updatedAt: now,
            })
            .run();
          return { id: Number(result.lastInsertRowid), shipmentCode: code, confirmationToken: token };
        } catch (err: any) {
          // UNIQUE constraint on confirmationToken — regenerate and retry
          if (/UNIQUE/i.test(err?.message ?? "")) {
            token = generateConfirmationToken();
            code = generateShipmentCode();
            continue;
          }
          throw err;
        }
      }
      throw new Error("Failed to generate unique shipment token after 3 attempts");
    }),

  /** Update operator-controlled fields. Does NOT allow modifying confirmed* fields (those come via public endpoint). */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int(),
        shipmentDateMs: z.number().optional(),
        tonnes: z.number().positive().optional(),
        batchRefs: z.array(z.number().int()).optional(),
        endUseCategory: z.enum(["agricultural_soil", "horticulture", "cement_substitute", "construction_filler", "water_filtration", "livestock_feed", "other"]).nullable().optional(),
        destinationName: z.string().max(200).nullable().optional(),
        destinationAddress: z.string().max(500).nullable().optional(),
        destinationCountry: z.string().max(100).nullable().optional(),
        destinationLat: z.number().min(-90).max(90).nullable().optional(),
        destinationLon: z.number().min(-180).max(180).nullable().optional(),
        carrierName: z.string().max(200).nullable().optional(),
        carrierVehicle: z.string().max(100).nullable().optional(),
        notes: z.string().max(1000).nullable().optional(),
        status: z.enum(["draft", "dispatched", "in_transit", "delivered", "rejected", "lost"]).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      requireExpert(ctx.user);
      const db = requireDb();
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.shipmentDateMs != null) updates.shipmentDate = new Date(input.shipmentDateMs);
      if (input.tonnes != null) updates.tonnes = input.tonnes;
      if (input.batchRefs !== undefined) updates.batchRefs = input.batchRefs ? JSON.stringify(input.batchRefs) : null;
      if (input.endUseCategory !== undefined) updates.endUseCategory = input.endUseCategory;
      if (input.destinationName !== undefined) updates.destinationName = input.destinationName;
      if (input.destinationAddress !== undefined) updates.destinationAddress = input.destinationAddress;
      if (input.destinationCountry !== undefined) updates.destinationCountry = input.destinationCountry;
      if (input.destinationLat !== undefined) updates.destinationLat = input.destinationLat;
      if (input.destinationLon !== undefined) updates.destinationLon = input.destinationLon;
      if (input.carrierName !== undefined) updates.carrierName = input.carrierName;
      if (input.carrierVehicle !== undefined) updates.carrierVehicle = input.carrierVehicle;
      if (input.notes !== undefined) updates.notes = input.notes;
      if (input.status !== undefined) updates.status = input.status;

      db.update(biocharShipments)
        .set(updates as any)
        .where(
          and(
            eq(biocharShipments.id, input.id),
            eq(biocharShipments.userId, ctx.user.id),
          ),
        )
        .run();
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      const db = requireDb();
      db.delete(biocharShipments)
        .where(
          and(
            eq(biocharShipments.id, input.id),
            eq(biocharShipments.userId, ctx.user.id),
          ),
        )
        .run();
      return { success: true };
    }),

  /**
   * Regenerate the confirmation token (invalidates previous links/QRs). Use
   * when an operator accidentally shared the link with the wrong party.
   */
  regenerateToken: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(({ ctx, input }) => {
      requireExpert(ctx.user);
      const db = requireDb();
      const newToken = generateConfirmationToken();
      db.update(biocharShipments)
        .set({ confirmationToken: newToken, updatedAt: new Date() })
        .where(
          and(
            eq(biocharShipments.id, input.id),
            eq(biocharShipments.userId, ctx.user.id),
          ),
        )
        .run();
      return { confirmationToken: newToken };
    }),

  // ─── PUBLIC endpoints — end-user confirmation side ────────────────────

  /**
   * Look up a shipment by its confirmation token. Public (no auth).
   *
   * Returns a SUBSET of the shipment — only fields the end-user needs to
   * see. We don't leak the operator's ID, project ID, or internal notes.
   */
  getByToken: publicProcedure
    .input(z.object({ token: z.string().min(1).max(100) }))
    .query(({ input }) => {
      const db = requireDb();
      const rows = db
        .select()
        .from(biocharShipments)
        .where(eq(biocharShipments.confirmationToken, input.token))
        .limit(1)
        .all();
      if (rows.length === 0) throw new Error("Shipment not found or link expired");
      const r = rows[0];

      // Try to fetch the operator's brand for the page header
      // (so the end-user sees the brand the operator configured, not BOP default).
      // Safe — we just pull companyName + logo, no PII.
      return {
        shipmentCode: r.shipmentCode,
        shipmentDate: r.shipmentDate ? new Date(r.shipmentDate).getTime() : 0,
        tonnes: r.tonnes,
        endUseCategory: r.endUseCategory,
        destinationName: r.destinationName,
        destinationAddress: r.destinationAddress,
        carrierName: r.carrierName,
        status: r.status,
        confirmedAt: r.confirmedAt ? new Date(r.confirmedAt).getTime() : null,
        confirmedByName: r.confirmedByName,
        alreadyConfirmed: r.status === "applied",
      };
    }),

  /**
   * End-user submits confirmation. Public (no auth). The token authenticates.
   * Sets status=applied and stores the end-user's reported data.
   *
   * Idempotent-ish: if the shipment is already applied, returns an error so
   * the end-user knows not to submit twice.
   */
  confirmByToken: publicProcedure
    .input(
      z.object({
        token: z.string().min(1).max(100),
        confirmedByName: z.string().min(1).max(200),
        confirmedByEmail: z.string().max(200).optional(),
        tonnesApplied: z.number().positive(),
        applicationDateMs: z.number(),
        applicationType: z.string().max(200).optional(),
        cropOrUseType: z.string().max(200).optional(),
        applicationLat: z.number().min(-90).max(90).optional(),
        applicationLon: z.number().min(-180).max(180).optional(),
        notes: z.string().max(2000).optional(),
      }),
    )
    .mutation(({ input }) => {
      const db = requireDb();
      const rows = db
        .select()
        .from(biocharShipments)
        .where(eq(biocharShipments.confirmationToken, input.token))
        .limit(1)
        .all();
      if (rows.length === 0) throw new Error("Shipment not found or link expired");
      const shipment = rows[0];

      if (shipment.status === "applied") {
        throw new Error("This shipment was already confirmed. Contact the operator if this is an error.");
      }
      if (shipment.status === "rejected" || shipment.status === "lost") {
        throw new Error("This shipment is no longer active. Contact the operator.");
      }

      db.update(biocharShipments)
        .set({
          status: "applied",
          confirmedAt: new Date(),
          confirmedByName: input.confirmedByName.trim(),
          confirmedByEmail: input.confirmedByEmail?.trim() ?? null,
          confirmedTonnesApplied: input.tonnesApplied,
          confirmedApplicationDate: new Date(input.applicationDateMs),
          confirmedApplicationType: input.applicationType?.trim() ?? null,
          confirmedCropOrUseType: input.cropOrUseType?.trim() ?? null,
          confirmedLat: input.applicationLat ?? null,
          confirmedLon: input.applicationLon ?? null,
          confirmedNotes: input.notes?.trim() ?? null,
          updatedAt: new Date(),
        })
        .where(eq(biocharShipments.id, shipment.id))
        .run();

      return { success: true, shipmentCode: shipment.shipmentCode };
    }),
});
