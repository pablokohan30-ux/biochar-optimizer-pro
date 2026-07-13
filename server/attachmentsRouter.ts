/**
 * File attachments router — shared across every Expert operational feature
 * that needs to attach a real document to a record (lab PDF against a
 * pyrolysis batch, FSC certificate against a biomass receipt, meeting act
 * against a community record, signed remito against a shipment, etc.).
 *
 * Storage strategy: base64 upload via tRPC (consistent with the existing
 * lab-analysis PDF pattern, zero new deps), files written to disk under
 * ATTACHMENTS_ROOT = /app/data/attachments/<userId>/<uuid>.<ext>.
 * The storageKey we persist is the RELATIVE path — the ATTACHMENTS_ROOT
 * lives only in env config, so no path can ever be crafted by user input.
 *
 * Access control:
 *   - Every mutation checks ctx.user.id.
 *   - Downloads go through an Express endpoint that runs the same session
 *     auth as tRPC.
 *   - We do NOT verify that the referenced record (relatedType, relatedId)
 *     is owned by the user, only that the attachment itself is owned by
 *     the user. Rationale: users can only ever attach to records that show
 *     up in their own pages, and re-checking every home table would couple
 *     this router to all downstream schemas.
 */

import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import { attachments } from "../drizzle/schema";

// ─── Config ────────────────────────────────────────────────────────────────

/**
 * Where to write files. In production on Fly.io we get a persistent volume
 * mounted at /app/data, so /app/data/attachments is the intended path. In
 * local dev the process typically can't create /app/, so we fall back to
 * ./data/attachments relative to cwd. Both paths can be overridden with
 * the ATTACHMENTS_ROOT env var.
 */
function defaultAttachmentsRoot(): string {
  if (process.env.ATTACHMENTS_ROOT) return process.env.ATTACHMENTS_ROOT;
  // In production the volume is guaranteed to exist because fly.toml mounts
  // it before the process boots — we detect prod via NODE_ENV, not by
  // stat-ing /app/data (which would race with the mount).
  if (process.env.NODE_ENV === "production") return "/app/data/attachments";
  return path.resolve(process.cwd(), "data/attachments");
}

export const ATTACHMENTS_ROOT = defaultAttachmentsRoot();

/** 20 MB decoded size limit. Base64 payload arrives ~33% larger. */
const MAX_BYTES = 20 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set<string>([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/csv",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/msword", // doc (legacy)
  "application/vnd.ms-excel", // xls (legacy)
]);

const ALLOWED_RELATED_TYPES = new Set<string>([
  "evidence",
  "shipment",
  "community_record",
  "audit_package",
  "project",
]);

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Ensure the on-disk directory for a user exists, best-effort. */
function ensureUserDir(userId: number): string {
  const dir = path.join(ATTACHMENTS_ROOT, String(userId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Pick a filesystem-safe extension from the original filename. Falls back
 *  to a MIME-derived hint. Extensions never used as security (we always
 *  serve with the stored contentType) — this is purely for user readability
 *  if they browse the volume. */
function pickExtension(filename: string, contentType: string): string {
  const dotAt = filename.lastIndexOf(".");
  if (dotAt >= 0 && dotAt < filename.length - 1) {
    const ext = filename.slice(dotAt + 1).toLowerCase();
    if (/^[a-z0-9]{1,8}$/.test(ext)) return ext;
  }
  // Derive from content type as a fallback
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "image/png") return "png";
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "text/csv") return "csv";
  return "bin";
}

/** Strip path characters + trim to reasonable length; keep the user's
 *  original name for display but sanitised. */
function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/\x00-\x1f]/g, "_").trim();
  if (cleaned.length === 0) return "attachment";
  return cleaned.length > 180 ? cleaned.slice(0, 180) : cleaned;
}

/** Build the absolute path from a userId + storageKey. Rejects any key
 *  that tries to escape the user's directory. */
export function resolveAttachmentPath(userId: number, storageKey: string): string {
  const userDir = path.join(ATTACHMENTS_ROOT, String(userId));
  const full = path.resolve(userDir, storageKey);
  if (!full.startsWith(path.resolve(userDir) + path.sep) && full !== path.resolve(userDir)) {
    throw new Error("Invalid storage key");
  }
  return full;
}

// ─── Zod ───────────────────────────────────────────────────────────────────

const createInput = z.object({
  relatedType: z.string().min(1).max(40),
  relatedId: z.number().int().nonnegative(),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(3).max(120),
  base64: z.string().min(4),
});

const listInput = z.object({
  relatedType: z.string().min(1).max(40),
  relatedId: z.number().int().nonnegative(),
});

const deleteInput = z.object({
  id: z.number().int().positive(),
});

// ─── Router ────────────────────────────────────────────────────────────────

export const attachmentsRouter = router({
  create: protectedProcedure
    .input(createInput)
    .mutation(({ ctx, input }) => {
      if (!ALLOWED_RELATED_TYPES.has(input.relatedType)) {
        throw new Error(`Unsupported relatedType: ${input.relatedType}`);
      }
      if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
        throw new Error(`Unsupported contentType: ${input.contentType}`);
      }

      let buffer: Buffer;
      try {
        buffer = Buffer.from(input.base64, "base64");
      } catch {
        throw new Error("Invalid base64 payload");
      }
      if (buffer.length === 0) throw new Error("Empty file payload");
      if (buffer.length > MAX_BYTES) {
        throw new Error(
          `File too large: ${(buffer.length / 1024 / 1024).toFixed(1)} MB (limit ${
            MAX_BYTES / 1024 / 1024
          } MB)`,
        );
      }

      const dir = ensureUserDir(ctx.user.id);
      const ext = pickExtension(input.filename, input.contentType);
      const uuid = crypto.randomBytes(16).toString("hex");
      const storageKey = `${uuid}.${ext}`;
      const absPath = path.join(dir, storageKey);
      fs.writeFileSync(absPath, buffer);

      const db = requireDb();
      const result = db
        .insert(attachments)
        .values({
          userId: ctx.user.id,
          relatedType: input.relatedType,
          relatedId: input.relatedId,
          filename: sanitizeFilename(input.filename),
          contentType: input.contentType,
          sizeBytes: buffer.length,
          storageKey,
        })
        .run();

      const id = Number(result.lastInsertRowid);
      return {
        id,
        filename: sanitizeFilename(input.filename),
        contentType: input.contentType,
        sizeBytes: buffer.length,
        downloadUrl: `/api/attachments/${id}/download`,
      };
    }),

  list: protectedProcedure
    .input(listInput)
    .query(({ ctx, input }) => {
      const db = requireDb();
      const rows = db
        .select({
          id: attachments.id,
          filename: attachments.filename,
          contentType: attachments.contentType,
          sizeBytes: attachments.sizeBytes,
          createdAt: attachments.createdAt,
        })
        .from(attachments)
        .where(
          and(
            eq(attachments.userId, ctx.user.id),
            eq(attachments.relatedType, input.relatedType),
            eq(attachments.relatedId, input.relatedId),
          ),
        )
        .orderBy(desc(attachments.createdAt))
        .all();

      return rows.map((r) => ({
        id: r.id,
        filename: r.filename,
        contentType: r.contentType,
        sizeBytes: r.sizeBytes,
        createdAt: r.createdAt ? new Date(r.createdAt).getTime() : 0,
        downloadUrl: `/api/attachments/${r.id}/download`,
      }));
    }),

  delete: protectedProcedure
    .input(deleteInput)
    .mutation(({ ctx, input }) => {
      const db = requireDb();
      const rows = db
        .select()
        .from(attachments)
        .where(
          and(
            eq(attachments.id, input.id),
            eq(attachments.userId, ctx.user.id),
          ),
        )
        .limit(1)
        .all();
      if (rows.length === 0) throw new Error("Attachment not found");
      const row = rows[0];

      // Best-effort file delete — DB deletion succeeds even if the file is
      // already missing (e.g. volume restored from a stale snapshot).
      try {
        const absPath = resolveAttachmentPath(ctx.user.id, row.storageKey);
        fs.unlinkSync(absPath);
      } catch (err: unknown) {
        if ((err as { code?: string }).code !== "ENOENT") {
          console.warn("[attachments] File delete failed:", err);
        }
      }

      db.delete(attachments).where(eq(attachments.id, input.id)).run();
      return { success: true as const };
    }),
});

/** Backend-only accessor for the Express download endpoint. Returns
 *  metadata + on-disk path, scoped to the user. */
export function getAttachmentForDownload(userId: number, attachmentId: number) {
  const db = requireDb();
  const rows = db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.id, attachmentId),
        eq(attachments.userId, userId),
      ),
    )
    .limit(1)
    .all();
  if (rows.length === 0) return null;
  const row = rows[0];
  const absPath = resolveAttachmentPath(userId, row.storageKey);
  return {
    filename: row.filename,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    absPath,
  };
}
