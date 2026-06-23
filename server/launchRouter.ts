import { count, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { requireDb } from "./db";
import { launchInquiries } from "../drizzle/schema";
import { isCorporateEmail } from "../shared/corporateEmail";

const INQUIRY_WINDOW_MS = 60 * 60 * 1000;
const MAX_INQUIRIES_PER_IP = 6;
const MAX_INQUIRIES_PER_EMAIL = 2;

const inquiryAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  return raw?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
}

function checkInquiryRateLimit(key: string, max: number) {
  const now = Date.now();
  const entry = inquiryAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    inquiryAttempts.set(key, { count: 1, resetAt: now + INQUIRY_WINDOW_MS });
    return;
  }
  if (entry.count >= max) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many access requests. Please try again later or contact us directly.",
    });
  }
  entry.count += 1;
}

export const launchRouter = router({
  submitInquiry: publicProcedure
    .input(z.object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().email(),
      company: z.string().trim().min(2).max(160),
      message: z.string().trim().min(10).max(4_000),
      source: z.enum(["pricing_contact", "early_access"]).optional(),
    }))
    .mutation(({ ctx, input }) => {
      if (!isCorporateEmail(input.email)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please use a corporate email address. Personal email providers are not accepted.",
        });
      }

      const normalizedEmail = input.email.trim().toLowerCase();
      checkInquiryRateLimit(`ip:${getClientIp(ctx.req)}`, MAX_INQUIRIES_PER_IP);
      checkInquiryRateLimit(`email:${normalizedEmail}`, MAX_INQUIRIES_PER_EMAIL);

      const db = requireDb();
      const now = new Date();

      db.insert(launchInquiries).values({
        name: input.name.trim(),
        email: normalizedEmail,
        company: input.company.trim(),
        message: input.message.trim(),
        source: input.source ?? "pricing_contact",
        status: "new",
        createdAt: now,
        updatedAt: now,
      }).run();

      return { success: true };
    }),

  adminListInquiries: adminProcedure.query(() => {
    const db = requireDb();
    const items = db
      .select()
      .from(launchInquiries)
      .orderBy(desc(launchInquiries.createdAt))
      .limit(200)
      .all();

    const [totals] = db.select({ total: count() }).from(launchInquiries).all();
    const [newTotals] = db
      .select({ total: count() })
      .from(launchInquiries)
      .where(eq(launchInquiries.status, "new"))
      .all();

    return {
      items,
      total: totals?.total ?? 0,
      newCount: newTotals?.total ?? 0,
    };
  }),

  updateInquiryStatus: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      status: z.enum(["new", "reviewed", "closed"]),
    }))
    .mutation(({ input }) => {
      const db = requireDb();
      db.update(launchInquiries)
        .set({
          status: input.status,
          updatedAt: new Date(),
        })
        .where(eq(launchInquiries.id, input.id))
        .run();

      return { success: true };
    }),
});
