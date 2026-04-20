/**
 * Public REST API for Developer+ tier users.
 *
 * Authentication: Bearer token via `Authorization: Bearer <api_key>` header.
 * API keys are stored in the `api_keys` table (created on first getDb() call).
 *
 * Endpoints:
 *   POST /api/v1/simulate  — run pyrolysis simulation for a feedstock
 *   GET  /api/v1/feedstocks — list available feedstocks
 */

import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { getRawDb } from "./db";
import { hasAccess } from "./stripeProducts";

// We inline the compute function from the client model for the API.
// To keep things DRY and avoid bundling issues, we duplicate the core
// calculation server-side. A future refactor could extract a shared package.

// For now, we expose a lightweight proxy that validates the API key,
// then runs the computation via a dynamic import of the client model.
// Since the client model is pure math (no React/DOM), it works fine in Node.

export const apiRouter = Router();

// ─── Middleware: API key auth ─────────────────────────────────────────────────

interface AuthedRequest extends Request {
  apiUser?: { id: number; email: string; tier: string };
}

async function authenticateApiKey(req: AuthedRequest, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header. Use: Bearer <api_key>" });
    return;
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    res.status(401).json({ error: "Empty API key" });
    return;
  }

  const sqlite = getRawDb();
  if (!sqlite) {
    res.status(503).json({ error: "Service unavailable" });
    return;
  }

  // Hash the key for lookup (we store hashed keys)
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  try {
    const row = sqlite.prepare(
      /* sql */ `SELECT ak.user_id, ak.name as key_name, u.email, u.subscriptionTier, u.subscriptionStatus, u.accessExpiresAt
       FROM api_keys ak
       JOIN users u ON u.id = ak.user_id
       WHERE ak.key_hash = ? AND ak.revoked_at IS NULL
       LIMIT 1`,
    ).get(keyHash) as { user_id: number; key_name: string; email: string; subscriptionTier: string; subscriptionStatus: string; accessExpiresAt: number | null } | undefined;

    if (!row) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    // Check tier
    if (!hasAccess(row.subscriptionTier, "developer", row.subscriptionStatus)) {
      // Also check time-limited access
      if (row.accessExpiresAt) {
        const expiresAt = new Date(row.accessExpiresAt * 1000);
        if (expiresAt < new Date()) {
          res.status(403).json({ error: "API access requires Developer tier or higher. Your access has expired." });
          return;
        }
      } else {
        res.status(403).json({ error: "API access requires Developer tier or higher." });
        return;
      }
    }

    // Update last_used
    sqlite.prepare(`UPDATE api_keys SET last_used_at = ? WHERE key_hash = ?`).run(Date.now(), keyHash);

    req.apiUser = { id: row.user_id, email: row.email, tier: row.subscriptionTier };
    next();
  } catch (err) {
    console.error("[API] Auth error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── POST /api/v1/simulate ────────────────────────────────────────────────────

apiRouter.post("/api/v1/simulate", authenticateApiKey as any, async (req: AuthedRequest, res: Response) => {
  try {
    const { temperature, residenceTime, feedstockId, feedstock: customFeedstock } = req.body;

    if (!temperature || !residenceTime) {
      res.status(400).json({ error: "temperature and residenceTime are required" });
      return;
    }

    const T = Number(temperature);
    const t = Number(residenceTime);
    if (T < 300 || T > 900 || t < 5 || t > 180) {
      res.status(400).json({ error: "temperature must be 300–900 °C, residenceTime 5–180 min" });
      return;
    }

    // Dynamic import of the model (pure math, no DOM dependencies)
    const { compute_all, FEEDSTOCK_DB } = await import("../client/src/lib/biocharModel");

    let fs;
    if (customFeedstock) {
      // Validate custom feedstock
      const { C, H, N, S, O, ash, moisture, name } = customFeedstock;
      if (!C || !H || !O) {
        res.status(400).json({ error: "Custom feedstock requires at least C, H, O (% dry)" });
        return;
      }
      fs = {
        name: name || "Custom",
        C: Number(C), H: Number(H), N: Number(N || 0), S: Number(S || 0),
        O: Number(O), ash: Number(ash || 0), moisture: Number(moisture || 0),
        source: "API",
      };
    } else if (feedstockId) {
      fs = FEEDSTOCK_DB[feedstockId];
      if (!fs) {
        res.status(400).json({
          error: `Unknown feedstockId: ${feedstockId}`,
          available: Object.keys(FEEDSTOCK_DB),
        });
        return;
      }
    } else {
      res.status(400).json({ error: "Provide feedstockId or custom feedstock object" });
      return;
    }

    const result = compute_all(T, t, fs as any);

    res.json({
      input: {
        temperature: T,
        residenceTime: t,
        feedstock: { id: feedstockId || null, name: fs.name },
      },
      result: {
        carbonContent: result.C,
        hydrogenContent: result.H,
        yield: result.yield_,
        hCorgRatio: result.H_Corg,
        oCorgRatio: result.O_Corg,
        betSurface: result.BET,
        pH: result.pH,
        ebcClass: result.credits.class,
        stabilityFactor: result.credits.sf,
        grossCo2e: result.credits.gross,
        netCo2e: result.credits.net,
        energy: {
          syngasYield: result.energy.syngas_yield,
          syngasHhv: result.energy.syngas_hhv,
          thermalPowerMw: result.energy.thermal_power_mw,
        },
      },
    });
  } catch (err) {
    console.error("[API] Simulate error:", err);
    res.status(500).json({ error: "Simulation failed" });
  }
});

// ─── GET /api/v1/feedstocks ───────────────────────────────────────────────────

apiRouter.get("/api/v1/feedstocks", authenticateApiKey as any, async (_req: Request, res: Response) => {
  try {
    const { FEEDSTOCK_DB } = await import("../client/src/lib/biocharModel");
    const feedstocks = Object.entries(FEEDSTOCK_DB).map(([id, fs]: [string, any]) => ({
      id,
      name: fs.name,
      carbon: fs.C,
      hydrogen: fs.H,
      nitrogen: fs.N,
      sulfur: fs.S,
      oxygen: fs.O,
      ash: fs.ash,
      moisture: fs.moisture,
      source: fs.source,
    }));
    res.json({ feedstocks, count: feedstocks.length });
  } catch (err) {
    console.error("[API] Feedstocks error:", err);
    res.status(500).json({ error: "Failed to fetch feedstocks" });
  }
});

// ─── POST /api/v1/batch ──────────────────────────────────────────────────────

apiRouter.post("/api/v1/batch", authenticateApiKey as any, async (req: AuthedRequest, res: Response) => {
  try {
    const { temperature, residenceTime, feedstockIds } = req.body;

    if (!temperature || !residenceTime || !Array.isArray(feedstockIds)) {
      res.status(400).json({ error: "temperature, residenceTime, and feedstockIds[] are required" });
      return;
    }

    if (feedstockIds.length > 50) {
      res.status(400).json({ error: "Maximum 50 feedstocks per batch request" });
      return;
    }

    const T = Number(temperature);
    const t = Number(residenceTime);
    const { compute_all, FEEDSTOCK_DB } = await import("../client/src/lib/biocharModel");

    const results = feedstockIds.map((id: string) => {
      const fs = FEEDSTOCK_DB[id];
      if (!fs) return { feedstockId: id, error: "Unknown feedstock" };
      const r = compute_all(T, t, fs);
      return {
        feedstockId: id,
        name: fs.name,
        carbonContent: r.C,
        yield: r.yield_,
        hCorgRatio: r.H_Corg,
        netCo2e: r.credits.net,
        ebcClass: r.credits.class,
        betSurface: r.BET,
        pH: r.pH,
      };
    });

    res.json({ input: { temperature: T, residenceTime: t }, results, count: results.length });
  } catch (err) {
    console.error("[API] Batch error:", err);
    res.status(500).json({ error: "Batch simulation failed" });
  }
});
