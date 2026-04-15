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
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
