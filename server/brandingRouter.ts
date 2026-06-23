/**
 * White-label branding router — Developer tier feature.
 *
 * Lets operators replace Biochar Optimizer Pro branding on PDF exports with
 * their own logo, company name, and primary color. Used by AiBuilderPrint,
 * SubmissionPrint, and ExecutiveSummary pages.
 *
 * Design:
 * - Logo is stored inline as base64 (PNG/SVG/JPG, max ~250 KB decoded).
 *   Avoids S3 / filesystem storage complexity; fine for small logos.
 * - Primary color is a hex string, validated.
 * - Company name + footer text are plain strings with length caps.
 * - Everything is optional. If unset, the default BOP branding is used.
 * - Branding applies platform-wide to that user's exports (not per-project).
 */

import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import { users } from "../drizzle/schema";
import { hasTierAccessForUser } from "./_core/access";

// ~250 KB decoded logo. The base64 string ends up ~333 KB due to encoding
// overhead; enforce on the decoded size to match what the browser actually
// renders. Most SVG/PNG logos sit comfortably under 100 KB.
const MAX_LOGO_BYTES = 250 * 1024;

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

// Validate a base64 string claiming to be an image. Accepts either bare
// base64 or a data URL. Returns a normalized data URL or throws.
function validateLogoBase64(input: string): string {
  if (!input) throw new Error("Logo is empty");

  let dataUrl = input.trim();
  let mimeType: string | null = null;
  let base64Part: string;

  const dataUrlMatch = dataUrl.match(/^data:(image\/(png|jpg|jpeg|svg\+xml|webp));base64,(.+)$/);
  if (dataUrlMatch) {
    mimeType = dataUrlMatch[1];
    base64Part = dataUrlMatch[3];
  } else {
    // Bare base64; assume PNG
    mimeType = "image/png";
    base64Part = dataUrl;
  }

  // Rough size check — 4 base64 chars → 3 bytes
  const estimatedBytes = Math.floor((base64Part.length * 3) / 4);
  if (estimatedBytes > MAX_LOGO_BYTES) {
    throw new Error(`Logo too large (~${Math.round(estimatedBytes / 1024)} KB, max ${MAX_LOGO_BYTES / 1024} KB).`);
  }

  // Validate base64 is actually decodable
  try {
    Buffer.from(base64Part, "base64");
  } catch {
    throw new Error("Logo is not valid base64.");
  }

  return `data:${mimeType};base64,${base64Part}`;
}

export const brandingRouter = router({
  /**
   * Read the user's current branding. Returns nulls if unset. Unauthenticated
   * users get all-nulls (print pages fall back to default branding).
   */
  get: protectedProcedure.query(({ ctx }) => {
    return {
      companyName: ctx.user.brandCompanyName ?? null,
      primaryColor: ctx.user.brandPrimaryColor ?? null,
      logoDataUrl: ctx.user.brandLogoBase64 ?? null,
      footerText: ctx.user.brandFooterText ?? null,
    };
  }),

  /**
   * Update branding. Developer tier or higher required (admins bypass). Any subset of
   * fields can be passed — undefined means "don't change". To clear a field,
   * pass null.
   */
  update: protectedProcedure
    .input(
      z.object({
        companyName: z.string().max(200).nullable().optional(),
        primaryColor: z.string().max(16).nullable().optional(),
        logoDataUrl: z.string().max(400_000).nullable().optional(), // 400 KB string → ~300 KB decoded
        footerText: z.string().max(500).nullable().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      if (!hasTierAccessForUser(ctx.user, "developer")) {
        throw new Error("UPGRADE_REQUIRED: White-label branding requires Developer tier or higher.");
      }

      const db = requireDb();
      const updates: Record<string, string | null> = {};

      if (input.companyName !== undefined) {
        updates.brandCompanyName = input.companyName?.trim() || null;
      }

      if (input.primaryColor !== undefined) {
        if (input.primaryColor === null || input.primaryColor.trim() === "") {
          updates.brandPrimaryColor = null;
        } else {
          const color = input.primaryColor.trim();
          if (!HEX_COLOR_RE.test(color)) {
            throw new Error("Primary color must be a valid hex like #22c55e or #2c5.");
          }
          updates.brandPrimaryColor = color;
        }
      }

      if (input.logoDataUrl !== undefined) {
        if (input.logoDataUrl === null || input.logoDataUrl.trim() === "") {
          updates.brandLogoBase64 = null;
        } else {
          updates.brandLogoBase64 = validateLogoBase64(input.logoDataUrl);
        }
      }

      if (input.footerText !== undefined) {
        updates.brandFooterText = input.footerText?.trim() || null;
      }

      if (Object.keys(updates).length === 0) {
        return { success: true, updated: 0 };
      }

      // Force updatedAt refresh too
      (updates as any).updatedAt = new Date();

      db.update(users).set(updates as any).where(eq(users.id, ctx.user.id)).run();

      return { success: true, updated: Object.keys(updates).length - 1 /* ignore updatedAt */ };
    }),

  /**
   * Convenience: clear all branding (reverts to default BOP branding).
   */
  clear: protectedProcedure.mutation(({ ctx }) => {
    const db = requireDb();
    db.update(users)
      .set({
        brandCompanyName: null,
        brandPrimaryColor: null,
        brandLogoBase64: null,
        brandFooterText: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, ctx.user.id))
      .run();
    return { success: true };
  }),
});
