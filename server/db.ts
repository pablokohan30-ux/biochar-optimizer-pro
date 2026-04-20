import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { TRPCError } from "@trpc/server";
import { users, type InsertUser } from "../drizzle/schema";
import * as schema from "../drizzle/schema";
import path from "path";
import fs from "fs";

let _db: ReturnType<typeof drizzle> | null = null;
let _sqlite: Database.Database | null = null;

/** Returns the raw better-sqlite3 connection (used for tables not in drizzle schema, like api_keys). */
export function getRawDb(): Database.Database | null {
  if (!_sqlite) getDb(); // trigger init
  return _sqlite;
}

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
      _sqlite = sqlite;

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
        CREATE TABLE IF NOT EXISTS api_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          name TEXT NOT NULL DEFAULT 'Default',
          key_hash TEXT NOT NULL UNIQUE,
          key_prefix TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          last_used_at INTEGER,
          revoked_at INTEGER,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
        CREATE TABLE IF NOT EXISTS lab_analyses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          biomass_name TEXT,
          source_pdf_name TEXT,
          pyrolysis_T INTEGER,
          pyrolysis_time INTEGER,
          biomass_data TEXT,   -- JSON: C, H, N, S, O, ash, moisture, volatiles, fixed_carbon
          biochar_data TEXT,   -- JSON: C, H, N, S, O, HCorg, BET, pH, pore_volume, etc.
          heavy_metals TEXT,   -- JSON: Pb, Cd, Cr, Cu, Ni, Zn, Hg, As (µg/g)
          extracted_json TEXT, -- full structured response from the AI
          allow_public_use INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `);

      // Migrations: SQLite's ALTER TABLE ADD COLUMN has no IF NOT EXISTS — catch "duplicate column" error.
      const migrations: Array<{ col: string; sql: string }> = [
        { col: "accessExpiresAt", sql: "ALTER TABLE users ADD COLUMN accessExpiresAt INTEGER" },
        { col: "socialShareAiCredits", sql: "ALTER TABLE users ADD COLUMN socialShareAiCredits INTEGER NOT NULL DEFAULT 0" },
        { col: "socialShareUrl", sql: "ALTER TABLE users ADD COLUMN socialShareUrl TEXT" },
        { col: "projects.bopId", sql: "ALTER TABLE projects ADD COLUMN bopId TEXT" },
        { col: "projects.status", sql: "ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'draft'" },
        { col: "projects.publicVisibility", sql: "ALTER TABLE projects ADD COLUMN publicVisibility TEXT DEFAULT 'summary'" },
        { col: "projects.publicMethodology", sql: "ALTER TABLE projects ADD COLUMN publicMethodology TEXT" },
      ];
      for (const m of migrations) {
        try {
          sqlite.exec(m.sql);
          console.log(`[Database] Migration: added ${m.col} column to users`);
        } catch (err: any) {
          if (!/duplicate column/i.test(err?.message ?? "")) {
            console.warn(`[Database] ${m.col} migration error:`, err);
          }
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
