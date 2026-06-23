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
        CREATE TABLE IF NOT EXISTS launchInquiries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          company TEXT NOT NULL,
          message TEXT NOT NULL,
          source TEXT NOT NULL DEFAULT 'pricing_contact',
          status TEXT NOT NULL DEFAULT 'new',
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_launch_inquiries_created_at ON launchInquiries(createdAt DESC);
        CREATE INDEX IF NOT EXISTS idx_launch_inquiries_status ON launchInquiries(status, createdAt DESC);
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
        CREATE TABLE IF NOT EXISTS aiGeneratedProjects (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          name TEXT NOT NULL,
          biomassId TEXT,
          biomassData TEXT,
          capacityTnYear REAL NOT NULL,
          country TEXT NOT NULL,
          location TEXT,
          offtakerType TEXT DEFAULT 'both',
          targetMethodology TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          errorMessage TEXT,
          generatedDocs TEXT,
          totalPromptTokens INTEGER DEFAULT 0,
          totalCompletionTokens INTEGER DEFAULT 0,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS aiDocFeedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          aiProjectId INTEGER NOT NULL,
          docId TEXT NOT NULL,
          vote TEXT NOT NULL,
          comment TEXT,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL,
          UNIQUE(userId, aiProjectId, docId)
        );
        CREATE TABLE IF NOT EXISTS customMethodologies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          basedOn TEXT,
          criteria TEXT NOT NULL,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS operationalEvidence (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          projectId INTEGER NOT NULL,
          dataType TEXT NOT NULL,
          periodStart INTEGER NOT NULL,
          periodEnd INTEGER,
          content TEXT NOT NULL,
          validationStatus TEXT DEFAULT 'PENDING',
          validationNotes TEXT,
          attachmentRef TEXT,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_operational_evidence_project ON operationalEvidence(projectId, dataType, periodStart);
        CREATE TABLE IF NOT EXISTS biocharShipments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          projectId INTEGER NOT NULL,
          shipmentCode TEXT NOT NULL,
          shipmentDate INTEGER NOT NULL,
          tonnes REAL NOT NULL,
          batchRefs TEXT,
          endUseCategory TEXT,
          destinationName TEXT,
          destinationAddress TEXT,
          destinationCountry TEXT,
          destinationLat REAL,
          destinationLon REAL,
          carrierName TEXT,
          carrierVehicle TEXT,
          confirmationToken TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL DEFAULT 'draft',
          confirmedAt INTEGER,
          confirmedByName TEXT,
          confirmedByEmail TEXT,
          confirmedTonnesApplied REAL,
          confirmedApplicationDate INTEGER,
          confirmedApplicationType TEXT,
          confirmedCropOrUseType TEXT,
          confirmedLat REAL,
          confirmedLon REAL,
          confirmedNotes TEXT,
          notes TEXT,
          attachmentRef TEXT,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_biochar_shipments_project ON biocharShipments(projectId, shipmentDate);
        CREATE INDEX IF NOT EXISTS idx_biochar_shipments_token ON biocharShipments(confirmationToken);
        CREATE TABLE IF NOT EXISTS communityRecords (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          projectId INTEGER NOT NULL,
          recordType TEXT NOT NULL,
          recordDate INTEGER NOT NULL,
          content TEXT NOT NULL,
          status TEXT DEFAULT 'closed',
          attachmentRef TEXT,
          createdAt INTEGER NOT NULL,
          updatedAt INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_community_records_project ON communityRecords(projectId, recordType, recordDate);
        CREATE TABLE IF NOT EXISTS aiCallLog (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER,
          feature TEXT NOT NULL,
          projectId INTEGER,
          promptTokens INTEGER NOT NULL DEFAULT 0,
          completionTokens INTEGER NOT NULL DEFAULT 0,
          costUsd REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'ok',
          errorMsg TEXT,
          metadata TEXT,
          createdAt INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_ai_call_log_feature ON aiCallLog(feature, createdAt DESC);
        CREATE INDEX IF NOT EXISTS idx_ai_call_log_user ON aiCallLog(userId, createdAt DESC);
      `);

      // Migrations: SQLite's ALTER TABLE ADD COLUMN has no IF NOT EXISTS — catch "duplicate column" error.
      const migrations: Array<{ col: string; sql: string }> = [
        { col: "accessExpiresAt", sql: "ALTER TABLE users ADD COLUMN accessExpiresAt INTEGER" },
        { col: "socialShareAiCredits", sql: "ALTER TABLE users ADD COLUMN socialShareAiCredits INTEGER NOT NULL DEFAULT 0" },
        { col: "socialShareUrl", sql: "ALTER TABLE users ADD COLUMN socialShareUrl TEXT" },
        { col: "brandLogoBase64", sql: "ALTER TABLE users ADD COLUMN brandLogoBase64 TEXT" },
        { col: "brandPrimaryColor", sql: "ALTER TABLE users ADD COLUMN brandPrimaryColor TEXT" },
        { col: "brandCompanyName", sql: "ALTER TABLE users ADD COLUMN brandCompanyName TEXT" },
        { col: "brandFooterText", sql: "ALTER TABLE users ADD COLUMN brandFooterText TEXT" },
        { col: "projects.bopId", sql: "ALTER TABLE projects ADD COLUMN bopId TEXT" },
        { col: "projects.status", sql: "ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'draft'" },
        { col: "projects.publicVisibility", sql: "ALTER TABLE projects ADD COLUMN publicVisibility TEXT DEFAULT 'summary'" },
        { col: "projects.publicMethodology", sql: "ALTER TABLE projects ADD COLUMN publicMethodology TEXT" },
        // Manual pre-assessment check states, JSON-encoded. Swaps out the old
        // localStorage-only persistence so state syncs across devices.
        { col: "projects.manualChecks", sql: "ALTER TABLE projects ADD COLUMN manualChecks TEXT" },
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

      // Recover AI-builder projects stuck in "generating" state.
      //
      // If the Fly.io machine restarted (deploy, crash, auto-stop) while an
      // AI Builder project was mid-generation, the background job is gone
      // but the DB row stays in "generating" forever, which would show as a
      // permanent spinner for the user. Mark any project older than 15 min
      // in generating/pending state as "error" so the user can retry each
      // doc from the UI.
      try {
        const STALE_MS = 15 * 60 * 1000;
        const staleCutoff = Date.now() - STALE_MS;
        const result = sqlite.prepare(
          `UPDATE aiGeneratedProjects
           SET status = 'error',
               errorMessage = 'Generation interrupted by server restart. Use "Retry this document" on any missing docs.',
               updatedAt = ?
           WHERE status IN ('generating', 'pending')
             AND updatedAt < ?`,
        ).run(Date.now(), staleCutoff);
        if (result.changes > 0) {
          console.log(`[Database] Recovered ${result.changes} stuck AI builder project(s)`);
        }
      } catch (err) {
        console.warn("[Database] Failed to recover stuck AI projects:", err);
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
