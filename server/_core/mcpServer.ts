/**
 * Model Context Protocol (MCP) server for biocharpro.io.
 *
 * Exposes our 4 REST endpoints as MCP tools so any Claude user (or any other
 * MCP-capable client: Cursor, Zed, Continue, etc.) can invoke them via slash
 * commands. This is the same surface as `/api/v1/*` — just wrapped in MCP.
 *
 * Design choices:
 *
 * - **Stateless mode**: one McpServer instance PER request. We pass
 *   `sessionIdGenerator: undefined` to the transport so there's no session
 *   bookkeeping; each POST to `/mcp` carries the bearer token, we authenticate
 *   it, run the tool, respond, and throw away the server. This scales
 *   horizontally without sticky sessions and matches how our REST endpoints
 *   already behave.
 *
 * - **Auth**: the bearer token from the `Authorization` header is attached
 *   to the `McpServer` instance via the `createMcpServerForUser()` factory.
 *   Tools read the authenticated user from closure — no additional auth
 *   inside each tool handler.
 *
 * - **Tool I/O**: inputs validated with Zod raw shapes (MCP SDK native).
 *   Outputs returned as `content: [{ type: "text", text: JSON.stringify(...) }]`
 *   so Claude can parse them back into structured data at will.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runLabAnalysisExtraction } from "./labAnalysisExtraction";

export interface McpUser {
  id: number;
  email: string;
  tier: string;
}

/**
 * Build a fresh McpServer instance for a single request.
 * The user's info is captured in closure so we don't mutate server state.
 */
export async function createMcpServerForUser(_user: McpUser): Promise<McpServer> {
  // Dynamic import of the client model — pure math, works in Node without DOM.
  const { compute_all, FEEDSTOCK_DB } = await import("../../client/src/lib/biocharModel");

  const server = new McpServer(
    {
      name: "biocharpro",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // ─── TOOL 1: simulate ────────────────────────────────────────────────────
  // Single-feedstock pyrolysis simulation. Mirror of POST /api/v1/simulate.

  server.tool(
    "simulate_biochar",
    "Simulate the biochar produced by pyrolysing a given feedstock at a specific temperature and residence time. Returns biochar composition (C, H, O), H:Corg stability ratio, yield, BET surface, pH, and gross CO₂e credits per tonne. Use for quick what-if analyses on feedstock + pyrolysis parameters.",
    {
      feedstockId: z
        .string()
        .optional()
        .describe("ID from the feedstock database (e.g. 'pine_sawdust', 'coffee_husk', 'rice_straw'). Mutually exclusive with `customFeedstock`. List IDs with the `list_feedstocks` tool."),
      customFeedstock: z
        .object({
          name: z.string(),
          C: z.number().describe("Carbon % dry basis"),
          H: z.number().describe("Hydrogen % dry basis"),
          O: z.number().describe("Oxygen % dry basis"),
          N: z.number().optional(),
          S: z.number().optional(),
          ash: z.number().optional(),
          moisture: z.number().optional(),
        })
        .optional()
        .describe("Custom feedstock elemental composition. Mutually exclusive with `feedstockId`."),
      temperature: z.number().min(300).max(900).describe("Pyrolysis temperature in °C"),
      residenceTime: z.number().min(5).max(180).describe("Residence time in minutes"),
    },
    async ({ feedstockId, customFeedstock, temperature, residenceTime }) => {
      let fs;
      if (customFeedstock) {
        fs = {
          name: customFeedstock.name,
          C: customFeedstock.C,
          H: customFeedstock.H,
          N: customFeedstock.N ?? 0,
          S: customFeedstock.S ?? 0,
          O: customFeedstock.O,
          ash: customFeedstock.ash ?? 0,
          moisture: customFeedstock.moisture ?? 0,
          source: "MCP",
        };
      } else if (feedstockId) {
        fs = FEEDSTOCK_DB[feedstockId];
        if (!fs) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Unknown feedstockId: ${feedstockId}`,
                  hint: "Call list_feedstocks to see available IDs.",
                }),
              },
            ],
            isError: true,
          };
        }
      } else {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "Provide either feedstockId or customFeedstock.",
              }),
            },
          ],
          isError: true,
        };
      }

      const result = compute_all(temperature, residenceTime, fs as any);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                input: {
                  temperature,
                  residenceTime,
                  feedstock: { id: feedstockId ?? null, name: fs.name },
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
                  grossCo2ePerTonne: result.credits.gross,
                  netCo2ePerTonne: result.credits.net,
                  energy: {
                    syngasYield: result.energy.syngas_yield,
                    syngasHhv: result.energy.syngas_hhv,
                    thermalPowerMw: result.energy.thermal_power_mw,
                  },
                },
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ─── TOOL 2: batch ──────────────────────────────────────────────────────
  // Compare up to 50 feedstocks at the same T/time. Mirror of /api/v1/batch.

  server.tool(
    "compare_feedstocks_batch",
    "Simulate up to 50 different feedstocks at the SAME pyrolysis temperature and residence time, so you can compare them side by side. Useful for selecting the best feedstock for a project. Returns a table with carbon content, yield, H:Corg ratio, net CO₂e credits and EBC class per feedstock.",
    {
      feedstockIds: z
        .array(z.string())
        .min(1)
        .max(50)
        .describe("Array of 1–50 feedstock IDs. Use list_feedstocks to discover IDs."),
      temperature: z.number().min(300).max(900).describe("Pyrolysis temperature in °C (same for all feedstocks)"),
      residenceTime: z.number().min(5).max(180).describe("Residence time in minutes (same for all feedstocks)"),
    },
    async ({ feedstockIds, temperature, residenceTime }) => {
      const results = feedstockIds.map((id: string) => {
        const fs = FEEDSTOCK_DB[id];
        if (!fs) return { feedstockId: id, error: "Unknown feedstock" };
        const r = compute_all(temperature, residenceTime, fs);
        return {
          feedstockId: id,
          name: fs.name,
          carbonContent: r.C,
          yield: r.yield_,
          hCorgRatio: r.H_Corg,
          netCo2ePerTonne: r.credits.net,
          ebcClass: r.credits.class,
          betSurface: r.BET,
          pH: r.pH,
        };
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                input: { temperature, residenceTime },
                results,
                count: results.length,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ─── TOOL 3: list feedstocks ─────────────────────────────────────────────

  server.tool(
    "list_feedstocks",
    "List all 48 feedstocks in biocharpro.io's database with their elemental composition (C, H, N, S, O, ash, moisture). Use this to discover feedstock IDs before calling simulate_biochar or compare_feedstocks_batch.",
    {},
    async () => {
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
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ feedstocks, count: feedstocks.length }, null, 2),
          },
        ],
      };
    },
  );

  // ─── TOOL 4: extract lab analysis PDF ───────────────────────────────────

  server.tool(
    "extract_lab_analysis",
    "Extract 20+ structured parameters from a biomass / biochar lab-analysis PDF using Gemini 2.5 Flash. Returns biomass composition (C, H, N, S, O, ash, moisture, volatiles, fixed carbon), biochar properties (H:Corg, BET, pH, pore volume), heavy metals (Pb, Cd, Cr, Cu, Ni, Zn, Hg, As in µg/g), and pyrolysis parameters. Input: base64-encoded PDF, max 10 MB.",
    {
      pdfBase64: z
        .string()
        .describe("Base64-encoded PDF content (no data URL prefix). Max 10 MB decoded."),
      pdfName: z
        .string()
        .optional()
        .describe("Original filename for traceability in logs."),
    },
    async ({ pdfBase64, pdfName }) => {
      try {
        const extracted = await runLabAnalysisExtraction(pdfBase64);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { input: { pdfName: pdfName ?? null }, extracted },
                null,
                2,
              ),
            },
          ],
        };
      } catch (err: any) {
        const msg = err?.message || String(err);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: msg.split(":")[0] || "EXTRACT_LAB_FAILED",
                message: msg,
              }),
            },
          ],
          isError: true,
        };
      }
    },
  );

  return server;
}
