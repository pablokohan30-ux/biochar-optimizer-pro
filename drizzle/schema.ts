import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  // Stripe integration
  stripeCustomerId: text("stripeCustomerId"),
  stripeSubscriptionId: text("stripeSubscriptionId"),
  subscriptionTier: text("subscriptionTier", { enum: ["free", "analyst", "developer", "engineer", "expert"] }).default("free").notNull(),
  subscriptionStatus: text("subscriptionStatus").default("inactive"),
  // Time-limited access (one-time passes like Carbon Forum). When set, this is the expiry timestamp
  // for the current tier. When null, access follows normal subscription billing logic.
  accessExpiresAt: integer("accessExpiresAt", { mode: "timestamp" }),
  // Social share unlock: free users get N AI analyses after sharing on LinkedIn/X
  socialShareAiCredits: integer("socialShareAiCredits").default(0).notNull(),
  socialShareUrl: text("socialShareUrl"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const aiSearchUsage = sqliteTable("aiSearchUsage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  query: text("query").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type AiSearchUsage = typeof aiSearchUsage.$inferSelect;

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  // Public-facing project ID stamped on every export. Format: BOP-YYYY-NNNN
  // (e.g. "BOP-2026-0042"). Assigned on creation, immutable afterwards.
  bopId: text("bopId"),
  name: text("name").notNull(),
  description: text("description"),
  location: text("location"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  country: text("country"),
  plantCapacityTph: real("plantCapacityTph"),
  feedstockId: text("feedstockId"),
  feedstockData: text("feedstockData"),
  temperature: integer("temperature").default(650),
  residenceTime: integer("residenceTime").default(30),
  qualityGoal: text("qualityGoal", { enum: ["MAX_CARBON", "AGRONOMY", "BALANCED"] }).default("BALANCED"),
  // Project lifecycle status — owner-set, surfaced on the public verify page.
  status: text("status", { enum: ["draft", "submitted", "approved", "rejected"] }).default("draft"),
  // Owner controls what's visible on the public /verify/:bopId page.
  // - "private": 404 the public page (project hidden completely).
  // - "summary" (default): show name, country, score, methodology, status, dates. No exact coords, no params.
  // - "full": include simulation params + exact coords (for users who want max transparency).
  publicVisibility: text("publicVisibility", { enum: ["private", "summary", "full"] }).default("summary"),
  // Selected methodology for the public score display. Defaults to "puro-earth".
  publicMethodology: text("publicMethodology"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
