/**
 * Admin helper: grant Analyst tier to a user by email.
 *
 * Usage (local DB):
 *   npx tsx scripts/grant-analyst.ts user@example.com [DAYS]
 *
 * Usage (prod via Fly SSH):
 *   fly ssh console -a biochar-optimizer-pro -C "node dist/index.js-like --no-op"  # NO, see below
 *
 * For production, run directly inside the container:
 *   fly ssh console -a biochar-optimizer-pro
 *   cd /app
 *   node -e "const db=require('better-sqlite3')('/app/data/biochar.db'); \
 *            db.prepare('UPDATE users SET subscriptionTier=?,subscriptionStatus=?,accessExpiresAt=? WHERE email=?') \
 *              .run('analyst','active',Date.now()+30*86400*1000,'user@example.com')"
 *
 * The script below is for local dev / testing convenience.
 *
 * DAYS defaults to 30 (Carbon Forum Pass length). Pass 0 for permanent access (no expiry).
 */

import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { users } from "../drizzle/schema";

const email = process.argv[2];
const daysArg = process.argv[3];

if (!email) {
  console.error("Usage: npx tsx scripts/grant-analyst.ts <email> [days=30]");
  process.exit(1);
}

const days = daysArg !== undefined ? parseInt(daysArg, 10) : 30;
if (isNaN(days) || days < 0) {
  console.error("days must be a non-negative integer (0 = permanent access)");
  process.exit(1);
}

const db = getDb();
if (!db) {
  console.error("Database unavailable");
  process.exit(1);
}

const user = db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1).all();
if (user.length === 0) {
  console.error(`No user with email ${email}`);
  process.exit(1);
}

const expiresAt = days === 0 ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

db.update(users)
  .set({
    subscriptionTier: "analyst",
    subscriptionStatus: "active",
    accessExpiresAt: expiresAt,
    updatedAt: new Date(),
  })
  .where(eq(users.email, email.toLowerCase()))
  .run();

console.log(
  `✅ Granted Analyst to ${email}${
    expiresAt ? ` (expires ${expiresAt.toISOString()})` : " (permanent)"
  }`
);
process.exit(0);
