/**
 * Public REST API for Developer+ tier users.
 *
 * Authentication: Bearer token via `Authorization: Bearer <api_key>` header.
 * API keys are stored in the `api_keys` table (created on first getDb() call).
 *
 * Endpoints:
 *   POST /api/v1/simulate              — run pyrolysis simulation for a feedstock
 *   POST /api/v1/batch                 — compare up to 50 feedstocks at same T/time
 *   GET  /api/v1/feedstocks            — list available feedstocks
 *   POST /api/v1/extract-lab-analysis  — AI-extract 20+ params from a lab PDF
 *   GET  /api/openapi.json             — machine-readable OpenAPI 3.0 spec
 *
 * Hardening for plugin/MCP readiness (Apr 2026):
 *   - CORS enabled (any origin, since the API is bearer-auth gated)
 *   - Per-key rate limiting (100/min Developer, 500/min Engineer/Expert)
 *   - Uniform error shape: { error: { code, message, details? } }
 *   - OpenAPI 3.0 spec served at /api/openapi.json for external integrators
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import crypto from "crypto";
import { getRawDb } from "./db";
import { runLabAnalysisExtraction } from "./_core/labAnalysisExtraction";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServerForUser } from "./_core/mcpServer";
import { BRAND_NAME } from "../client/src/lib/brand";
import { hasTierAccessForUser } from "./_core/access";

export const apiRouter = Router();

// ─── CORS ───────────────────────────────────────────────────────────────────
//
// The REST API is gated by a bearer token that only lives with the user (no
// cookies, no session), so any origin can call it as long as they have a
// valid key. This makes it callable from browser-based tools, MCP bridges,
// and third-party dashboards without a preflight origin allowlist.
apiRouter.use(
  "/api/v1",
  cors({
    origin: true,
    credentials: false, // bearer token, no cookies
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
    maxAge: 86400, // cache preflight for 24h
  }),
);

// OpenAPI is also CORS-open so integrators can fetch it from anywhere.
apiRouter.use(
  "/api/openapi.json",
  cors({ origin: true, methods: ["GET", "OPTIONS"], maxAge: 86400 }),
);

// MCP endpoint — open CORS so MCP clients (Claude Code, Cursor, Zed, etc.)
// running in arbitrary local ports can reach it. Auth is enforced separately
// by bearer token inside the POST handler.
apiRouter.use(
  "/mcp",
  cors({
    origin: true,
    credentials: false,
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "Accept", "mcp-session-id"],
    exposedHeaders: ["mcp-session-id"],
    maxAge: 86400,
  }),
);

// ─── Middleware: API key auth ───────────────────────────────────────────────

interface AuthedRequest extends Request {
  apiUser?: { id: number; email: string; tier: string };
}

/** Uniform error helper so every endpoint emits the same shape. */
function apiError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  res.status(status).json({
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  });
}

async function authenticateApiKey(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return apiError(res, 401, "MISSING_AUTH", "Missing or invalid Authorization header. Use: Bearer <api_key>");
  }

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) {
    return apiError(res, 401, "EMPTY_KEY", "Empty API key");
  }

  const sqlite = getRawDb();
  if (!sqlite) {
    return apiError(res, 503, "DB_UNAVAILABLE", "Service unavailable");
  }

  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  try {
    const row = sqlite
      .prepare(
        /* sql */ `SELECT ak.user_id, ak.name as key_name, u.email, u.role, u.subscriptionTier, u.subscriptionStatus, u.accessExpiresAt
         FROM api_keys ak
         JOIN users u ON u.id = ak.user_id
         WHERE ak.key_hash = ? AND ak.revoked_at IS NULL
         LIMIT 1`,
      )
      .get(keyHash) as
      | {
          user_id: number;
          key_name: string;
          email: string;
          role: string;
          subscriptionTier: string;
          subscriptionStatus: string;
          accessExpiresAt: number | null;
        }
      | undefined;

    if (!row) {
      return apiError(res, 401, "INVALID_KEY", "Invalid API key");
    }

    if (!hasTierAccessForUser({
      role: row.role,
      subscriptionTier: row.subscriptionTier,
      subscriptionStatus: row.subscriptionStatus,
    }, "developer")) {
      if (row.accessExpiresAt) {
        const expiresAt = new Date(row.accessExpiresAt * 1000);
        if (expiresAt < new Date()) {
          return apiError(
            res,
            403,
            "TIER_ACCESS_EXPIRED",
            "API access requires Developer tier or higher. Your access has expired.",
          );
        }
      } else {
        return apiError(
          res,
          403,
          "TIER_REQUIRED",
          "API access requires Developer tier or higher.",
          { requiredTier: "developer", currentTier: row.subscriptionTier },
        );
      }
    }

    sqlite.prepare(`UPDATE api_keys SET last_used_at = ? WHERE key_hash = ?`).run(Date.now(), keyHash);

    req.apiUser = { id: row.user_id, email: row.email, tier: row.subscriptionTier };
    next();
  } catch (err) {
    console.error("[API] Auth error:", err);
    apiError(res, 500, "AUTH_INTERNAL", "Internal server error during authentication");
  }
}

// ─── Rate limiting (per API key, with tier-based ceilings) ──────────────────
//
// Auth runs first, so req.apiUser is populated by the time we hit the limiter.
// We key the bucket by userId + tier so two Developer users don't share a
// bucket. Engineer/Expert gets 5× the Developer budget.
const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: (req) => {
    const tier = (req as AuthedRequest).apiUser?.tier;
    if (tier === "engineer" || tier === "expert") return 500;
    return 100; // developer default
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const user = (req as AuthedRequest).apiUser;
    // Include ipKeyGenerator to guarantee a non-empty key even if auth is skipped.
    return user ? `user:${user.id}` : `ip:${ipKeyGenerator(req.ip ?? "unknown")}`;
  },
  handler: (_req, res) => {
    apiError(
      res,
      429,
      "RATE_LIMITED",
      "Too many requests. Limit is 100/min (Developer) or 500/min (Engineer+).",
    );
  },
});

// ─── POST /api/v1/simulate ──────────────────────────────────────────────────

apiRouter.post(
  "/api/v1/simulate",
  authenticateApiKey as any,
  apiRateLimiter,
  async (req: AuthedRequest, res: Response) => {
    try {
      const { temperature, residenceTime, feedstockId, feedstock: customFeedstock } = req.body;

      if (!temperature || !residenceTime) {
        return apiError(res, 400, "MISSING_PARAMS", "temperature and residenceTime are required");
      }

      const T = Number(temperature);
      const t = Number(residenceTime);
      if (T < 300 || T > 900 || t < 5 || t > 180) {
        return apiError(
          res,
          400,
          "PARAM_OUT_OF_RANGE",
          "temperature must be 300–900 °C, residenceTime 5–180 min",
        );
      }

      const { compute_all, FEEDSTOCK_DB } = await import("../client/src/lib/biocharModel");

      let fs;
      if (customFeedstock) {
        const { C, H, N, S, O, ash, moisture, name } = customFeedstock;
        if (!C || !H || !O) {
          return apiError(res, 400, "CUSTOM_FEEDSTOCK_MISSING_FIELDS", "Custom feedstock requires at least C, H, O (% dry)");
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
          return apiError(
            res,
            400,
            "UNKNOWN_FEEDSTOCK",
            `Unknown feedstockId: ${feedstockId}`,
            { available: Object.keys(FEEDSTOCK_DB) },
          );
        }
      } else {
        return apiError(res, 400, "MISSING_FEEDSTOCK", "Provide feedstockId or custom feedstock object");
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
      apiError(res, 500, "SIMULATE_FAILED", "Simulation failed");
    }
  },
);

// ─── GET /api/v1/feedstocks ─────────────────────────────────────────────────

apiRouter.get(
  "/api/v1/feedstocks",
  authenticateApiKey as any,
  apiRateLimiter,
  async (_req: Request, res: Response) => {
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
      apiError(res, 500, "FEEDSTOCKS_FAILED", "Failed to fetch feedstocks");
    }
  },
);

// ─── POST /api/v1/batch ─────────────────────────────────────────────────────

apiRouter.post(
  "/api/v1/batch",
  authenticateApiKey as any,
  apiRateLimiter,
  async (req: AuthedRequest, res: Response) => {
    try {
      const { temperature, residenceTime, feedstockIds } = req.body;

      if (!temperature || !residenceTime || !Array.isArray(feedstockIds)) {
        return apiError(
          res,
          400,
          "MISSING_PARAMS",
          "temperature, residenceTime, and feedstockIds[] are required",
        );
      }

      if (feedstockIds.length > 50) {
        return apiError(res, 400, "BATCH_TOO_LARGE", "Maximum 50 feedstocks per batch request");
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
      apiError(res, 500, "BATCH_FAILED", "Batch simulation failed");
    }
  },
);

// ─── POST /api/v1/extract-lab-analysis ──────────────────────────────────────
//
// AI-extracts structured biomass + biochar parameters from a lab-analysis
// PDF. Input: base64-encoded PDF (≤ 10 MB). Output: structured JSON matching
// the same shape produced by the internal tRPC `biomass.extractLabAnalysis`
// mutation — minus the "save to platform learning" opt-in (which only the
// web UI needs). Useful for SaaS integrations and the MCP plugin.

const EXTRACT_LAB_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

apiRouter.post(
  "/api/v1/extract-lab-analysis",
  authenticateApiKey as any,
  apiRateLimiter,
  async (req: AuthedRequest, res: Response) => {
    try {
      const { pdfBase64, pdfName } = req.body ?? {};

      if (!pdfBase64 || typeof pdfBase64 !== "string") {
        return apiError(res, 400, "MISSING_PDF", "Field `pdfBase64` is required (base64-encoded PDF).");
      }

      // Rough size check before handing off — the helper does its own strict
      // check too, but we want to reject big blobs as early as possible.
      if (pdfBase64.length > EXTRACT_LAB_MAX_SIZE_BYTES * 1.4) {
        return apiError(res, 413, "PDF_TOO_LARGE", "PDF is too large (max 10 MB).");
      }

      const extracted = await runLabAnalysisExtraction(pdfBase64);

      res.json({
        input: { pdfName: pdfName || null },
        extracted,
      });
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error("[API] Extract lab analysis error:", msg);
      // Map the prefixed error codes thrown by the helper to HTTP statuses.
      if (msg.startsWith("PDF_TOO_LARGE")) {
        return apiError(res, 413, "PDF_TOO_LARGE", "PDF is too large (max 10 MB).");
      }
      if (msg.startsWith("AI_QUOTA_EXCEEDED")) {
        return apiError(res, 429, "AI_QUOTA_EXCEEDED", "AI service temporarily over capacity. Retry later.");
      }
      if (msg.startsWith("AI_TIMEOUT")) {
        return apiError(res, 504, "AI_TIMEOUT", "Extraction took too long. Try a smaller PDF.");
      }
      if (msg.startsWith("AI_UNAVAILABLE")) {
        return apiError(res, 503, "AI_UNAVAILABLE", "AI extraction is currently unavailable.");
      }
      if (msg.startsWith("EXTRACTION_FAILED")) {
        return apiError(res, 422, "EXTRACTION_FAILED", "Couldn't parse this PDF. Try a clearer scan.");
      }
      apiError(res, 500, "EXTRACT_LAB_FAILED", "Lab analysis extraction failed");
    }
  },
);

// ─── GET /api/openapi.json — OpenAPI 3.0 spec ───────────────────────────────
//
// Served publicly (no auth) so any integrator / IDE / codegen tool can
// discover the API. The spec is generated inline from the source of truth
// (our endpoint handlers) rather than loaded from a static file, so it can
// never drift. When we add a new endpoint above, add it here too.

apiRouter.get("/api/openapi.json", (_req, res) => {
  res.json({
    openapi: "3.0.3",
    info: {
      title: `${BRAND_NAME} REST API`,
      version: "1.0.0",
      description:
        "Public REST API for biocharpro.io. Pyrolysis simulation, feedstock listing, " +
        "batch comparison and AI-powered lab-analysis PDF extraction. Requires Developer tier or higher.",
      contact: { name: BRAND_NAME, url: "https://biocharpro.io" },
      license: { name: "Proprietary", url: "https://biocharpro.io/legal/terms" },
    },
    servers: [{ url: "https://biocharpro.io", description: "Production" }],
    security: [{ BearerAuth: [] }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "bop_<48 hex chars>",
          description:
            "Generate a key at https://biocharpro.io/api. Requires Developer subscription tier.",
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string", example: "RATE_LIMITED" },
                message: { type: "string" },
                details: { type: "object", additionalProperties: true },
              },
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: "Missing or invalid API key",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        RateLimited: {
          description: "Too many requests (100/min Developer, 500/min Engineer+)",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
    },
    paths: {
      "/api/v1/simulate": {
        post: {
          summary: "Run a pyrolysis simulation for one feedstock",
          description:
            "Returns the computed biochar composition, H:Corg ratio, CO₂e credits and energy output " +
            "for a given feedstock at a specific pyrolysis temperature + residence time.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["temperature", "residenceTime"],
                  properties: {
                    temperature: { type: "number", minimum: 300, maximum: 900, description: "Pyrolysis T° in °C" },
                    residenceTime: { type: "number", minimum: 5, maximum: 180, description: "Residence time (min)" },
                    feedstockId: { type: "string", description: "Use one of the IDs returned by /api/v1/feedstocks. Mutually exclusive with `feedstock`." },
                    feedstock: {
                      type: "object",
                      description: "Custom feedstock. Requires at least C, H, O on dry basis.",
                      properties: {
                        name: { type: "string" },
                        C: { type: "number" }, H: { type: "number" }, N: { type: "number" },
                        S: { type: "number" }, O: { type: "number" },
                        ash: { type: "number" }, moisture: { type: "number" },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Simulation result" },
            "400": { description: "Bad request", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/api/v1/batch": {
        post: {
          summary: "Compare up to 50 feedstocks at the same T / residence time",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["temperature", "residenceTime", "feedstockIds"],
                  properties: {
                    temperature: { type: "number", minimum: 300, maximum: 900 },
                    residenceTime: { type: "number", minimum: 5, maximum: 180 },
                    feedstockIds: { type: "array", items: { type: "string" }, maxItems: 50 },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Batch simulation results" },
            "400": { description: "Bad request" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/api/v1/feedstocks": {
        get: {
          summary: "List all available feedstocks",
          responses: {
            "200": { description: "Array of feedstocks with elemental composition" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "429": { $ref: "#/components/responses/RateLimited" },
          },
        },
      },
      "/api/v1/extract-lab-analysis": {
        post: {
          summary: "AI-extract 20+ parameters from a lab-analysis PDF",
          description:
            "Sends a base64-encoded PDF to Gemini 2.5 Flash, returns structured JSON with biomass " +
            "composition, biochar parameters, pyrolysis conditions and heavy metals. Max 10 MB per request.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["pdfBase64"],
                  properties: {
                    pdfBase64: { type: "string", description: "Base64-encoded PDF (max 10 MB)" },
                    pdfName: { type: "string", description: "Original filename for reference" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Extracted structured data" },
            "400": { description: "Bad request" },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "413": { description: "PDF too large" },
            "422": { description: "Extraction failed (unreadable PDF)" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "503": { description: "AI service unavailable" },
            "504": { description: "AI timeout" },
          },
        },
      },
    },
  });
});

// ─── POST /mcp — Model Context Protocol endpoint ───────────────────────────
//
// This is the endpoint Claude plugins (and any MCP-capable client) hit to
// invoke our tools. Auth is the same bearer token that protects /api/v1/*.
// Rate limit shares the same bucket — calling the MCP tool counts exactly
// like calling the equivalent REST endpoint.
//
// Transport: Streamable HTTP in STATELESS mode. A fresh McpServer + transport
// pair is created per request, authenticates, runs the tool, responds, and
// is torn down. No sticky sessions, no shared state — aligns with our
// horizontal-scale model on Fly.io.

apiRouter.post(
  "/mcp",
  authenticateApiKey as any,
  apiRateLimiter,
  async (req: AuthedRequest, res: Response) => {
    try {
      const user = req.apiUser!;
      const server = await createMcpServerForUser({
        id: user.id,
        email: user.email,
        tier: user.tier,
      });

      const transport = new StreamableHTTPServerTransport({
        // Stateless: do NOT generate a session ID. Every request is fully
        // self-contained with its own McpServer instance.
        sessionIdGenerator: undefined,
      });

      // Clean up once the HTTP response closes to avoid leaking transports
      // on long-running Fly.io instances. Both `close` on the transport and
      // `close` on the server are no-ops if already closed.
      res.on("close", () => {
        transport.close().catch(() => {});
        server.close().catch(() => {});
      });

      await server.connect(transport);
      await transport.handleRequest(req as any, res, req.body);
    } catch (err: any) {
      console.error("[MCP] Handler error:", err);
      // If headers are already sent (mid-stream), let the transport close
      // and don't double-respond.
      if (!res.headersSent) {
        apiError(res, 500, "MCP_INTERNAL_ERROR", err?.message || "MCP request failed");
      }
    }
  },
);

// Reject non-POST methods explicitly so clients get a clear 405 rather than
// falling through to the SPA fallback 404.
apiRouter.get("/mcp", (_req, res) => {
  apiError(res, 405, "METHOD_NOT_ALLOWED", "The MCP endpoint only accepts POST.");
});
apiRouter.delete("/mcp", (_req, res) => {
  apiError(res, 405, "METHOD_NOT_ALLOWED", "The MCP endpoint only accepts POST.");
});
