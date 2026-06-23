/**
 * Lab analysis PDF extraction — shared helper.
 *
 * Used by:
 *   - tRPC `biomass.extractLabAnalysis` mutation (authenticated web UI)
 *   - REST `POST /api/v1/extract-lab-analysis` endpoint (plugin / MCP / SaaS integrators)
 *
 * Both surfaces share the same Gemini system prompt + JSON schema + error
 * mapping so the UI and the API produce identical results from the same PDF.
 * The tRPC surface additionally persists the extraction to the
 * `lab_analyses` table when the user opts into public-use; the REST surface
 * is stateless by design (no platform-learning opt-in via API for now).
 *
 * Error codes thrown (matchable with `msg.startsWith(...)` by callers):
 *   - PDF_TOO_LARGE
 *   - AI_QUOTA_EXCEEDED
 *   - AI_UNAVAILABLE
 *   - AI_TIMEOUT
 *   - EXTRACTION_FAILED
 */

import { extractFromPdf } from "./llm";

const MAX_BASE64_BYTES = 15_000_000; // ~11 MB PDF after decoding

export const LAB_SYSTEM_INSTRUCTION = `You are an expert biomass and biochar characterization analyst.

The user has uploaded a peer-reviewed lab analysis PDF of a biomass and/or biochar sample.

Your task: extract structured data from the document. Return null for any field not present.

Units expected (use these if the document uses compatible units):
- Proximate analysis: % dry basis (moisture: % as-received)
- Elemental (CHONS): % by mass, dry basis
- H:Corg ratio: molar (dimensionless, typical biochar range 0.1–0.5)
- BET surface area: m²/g
- Pore volume: cm³/g
- Pore diameter: nm
- Pyrolysis temperature: °C
- Residence time: minutes
- Heavy metals: µg/g (or ppm, same thing)
- pH: dimensionless (1–14 scale)

If the document reports values in different units (e.g., MJ/kg, Btu/lb), convert them.

If C% of biochar is provided but H:Corg molar ratio is not, compute it from:
  H:Corg = (H_mass / 1.008) / (C_mass / 12.011)

Be precise: only extract values that are explicitly stated or clearly calculable. Do not invent data.`;

export const LAB_JSON_SCHEMA = {
  type: "object",
  properties: {
    biomassName: { type: ["string", "null"], description: "Common or scientific name of the biomass" },
    biomass: {
      type: "object",
      properties: {
        C: { type: ["number", "null"] },
        H: { type: ["number", "null"] },
        N: { type: ["number", "null"] },
        S: { type: ["number", "null"] },
        O: { type: ["number", "null"] },
        ash: { type: ["number", "null"] },
        moisture: { type: ["number", "null"] },
        volatileMatter: { type: ["number", "null"] },
        fixedCarbon: { type: ["number", "null"] },
      },
    },
    pyrolysis: {
      type: "object",
      properties: {
        temperature: { type: ["number", "null"] },
        residenceTime: { type: ["number", "null"] },
        atmosphere: { type: ["string", "null"] },
        heatingRate: { type: ["number", "null"] },
      },
    },
    biochar: {
      type: "object",
      properties: {
        C: { type: ["number", "null"] },
        H: { type: ["number", "null"] },
        N: { type: ["number", "null"] },
        S: { type: ["number", "null"] },
        O: { type: ["number", "null"] },
        HCorgMolar: { type: ["number", "null"] },
        BET: { type: ["number", "null"] },
        poreVolume: { type: ["number", "null"] },
        poreDiameter: { type: ["number", "null"] },
        pH: { type: ["number", "null"] },
        thermalStability: { type: ["number", "null"] },
      },
    },
    heavyMetals: {
      type: "object",
      description: "µg/g (ppm). Include only metals explicitly reported.",
      properties: {
        Pb: { type: ["number", "null"] },
        Cd: { type: ["number", "null"] },
        Cr: { type: ["number", "null"] },
        Cu: { type: ["number", "null"] },
        Ni: { type: ["number", "null"] },
        Zn: { type: ["number", "null"] },
        Hg: { type: ["number", "null"] },
        As: { type: ["number", "null"] },
      },
    },
    source: { type: ["string", "null"], description: "Document source (e.g. CONICET ST7446, citation if present)" },
    notes: { type: ["string", "null"], description: "Brief notes on variability, method, or caveats" },
  },
};

/**
 * Runs the Gemini extraction, parses the JSON, and normalises error codes.
 * Throws with a prefixed code on failure (see file docstring).
 */
export async function runLabAnalysisExtraction(pdfBase64: string): Promise<any> {
  if (pdfBase64.length > MAX_BASE64_BYTES) {
    throw new Error("PDF_TOO_LARGE: Please upload a PDF under 10 MB.");
  }

  let responseText: string;
  try {
    responseText = await extractFromPdf({
      pdfBase64,
      systemInstruction: LAB_SYSTEM_INSTRUCTION,
      userPrompt: "Extract the biomass and biochar characterization data from this lab analysis document.",
      jsonSchema: LAB_JSON_SCHEMA,
    });
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error("[labAnalysisExtraction] LLM call failed:", msg);
    if (/429|quota|rate limit|rate_limit|Too Many Requests/i.test(msg)) {
      throw new Error("AI_QUOTA_EXCEEDED: Our AI extraction service is temporarily over capacity. Please try again in a few minutes, or fill in the form manually.");
    }
    if (/invalid api key|api key not valid|unauthor/i.test(msg)) {
      throw new Error("AI_UNAVAILABLE: AI extraction is not configured. Please fill in the form manually for now.");
    }
    if (/timeout|ETIMEDOUT|ECONNRESET/i.test(msg)) {
      throw new Error("AI_TIMEOUT: The extraction took too long. Try a smaller PDF or fill in the form manually.");
    }
    throw new Error(`AI_UNAVAILABLE: Extraction service error. ${msg.slice(0, 200)}`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    console.error("[labAnalysisExtraction] JSON parse failed:", responseText.slice(0, 500));
    throw new Error("EXTRACTION_FAILED: Could not parse the document. Please try a clearer PDF or fill the form manually.");
  }
}
