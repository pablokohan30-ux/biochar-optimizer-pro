import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Stripe integration
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 64 }),
  // Current subscription tier: free | analyst | developer | engineer | expert
  subscriptionTier: mysqlEnum("subscriptionTier", ["free", "analyst", "developer", "engineer", "expert"]).default("free").notNull(),
  subscriptionStatus: varchar("subscriptionStatus", { length: 32 }).default("inactive"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tracks AI biomass searches per user for rate limiting on free tier.
 */
export const aiSearchUsage = mysqlTable("aiSearchUsage", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  query: text("query").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiSearchUsage = typeof aiSearchUsage.$inferSelect;
