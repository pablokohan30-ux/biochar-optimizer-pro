import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { TRPCError } from "@trpc/server";
import { users, type InsertUser } from "../drizzle/schema";
import * as schema from "../drizzle/schema";
import path from "path";
import fs from "fs";

let _db: ReturnType<typeof drizzle> | null = null;

function getDbPath(): string {
  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return path.join(dataDir, "biochar.db");
}

export function getDb() {
  if (!_db) {
    try {
      const sqlite = new Database(getDbPath());
      sqlite.pragma("journal_mode = WAL");
      _db = drizzle(sqlite, { schema });

      // Create tables if they don't exist
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          passwordHash TEXT NOT NULL,
          name TEXT,
          role TEXT NOT NULL DEFAULT 'user',
          stripeCustomerId TEXT,
          stripeSubscriptionId TEXT,
          subscriptionTier TEXT NOT NULL DEFAULT 'free',
          subscriptionStatus TEXT DEFAULT 'inactive',
          accessExpiresAt INTEGER,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          lastSignedIn INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS aiSearchUsage (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          query TEXT NOT NULL,
          createdAt INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS projects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          location TEXT,
          latitude REAL,
          longitude REAL,
          country TEXT,
          plantCapacityTph REAL,
          feedstockId TEXT,
          feedstockData TEXT,
          temperature INTEGER DEFAULT 650,
          residenceTime INTEGER DEFAULT 30,
          qualityGoal TEXT DEFAULT 'BALANCED',
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );
      `);

      // Migration: add accessExpiresAt column to existing users tables.
      // SQLite's ALTER TABLE ADD COLUMN has no IF NOT EXISTS — catch "duplicate column" error.
      try {
        sqlite.exec(`ALTER TABLE users ADD COLUMN accessExpiresAt INTEGER`);
        console.log("[Database] Migration: added accessExpiresAt column to users");
      } catch (err: any) {
        if (!/duplicate column/i.test(err?.message ?? "")) {
          console.warn("[Database] accessExpiresAt migration error:", err);
        }
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/** Returns the drizzle instance or throws a TRPCError if DB is unavailable. */
export function requireDb() {
  const db = getDb();
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  }
  return db;
}

export function getUserByEmail(email: string) {
  const db = getDb();
  if (!db) return undefined;
  const result = db.select().from(users).where(eq(users.email, email)).limit(1).all();
  return result.length > 0 ? result[0] : undefined;
}

export function getUserById(id: number) {
  const db = getDb();
  if (!db) return undefined;
  const result = db.select().from(users).where(eq(users.id, id)).limit(1).all();
  return result.length > 0 ? result[0] : undefined;
}
