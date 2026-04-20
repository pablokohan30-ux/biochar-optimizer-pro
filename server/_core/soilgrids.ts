/**
 * ISRIC SoilGrids v2.0 REST API client.
 * Free, no API key required. Returns soil properties at a point (0–30 cm depth).
 * https://rest.isric.org/soilgrids/v2.0/docs
 *
 * Unit conversions (SoilGrids mapped units → human units):
 *   phh2o   → pH×10      → ÷10  → pH
 *   soc     → dg/kg      → ÷10  → g/kg
 *   clay    → g/kg       → ÷10  → %
 *   sand    → g/kg       → ÷10  → %
 *   silt    → g/kg       → ÷10  → %
 *   cec     → mmol(c)/kg → ÷10  → cmol(c)/kg
 *   nitrogen→ cg/kg      → ÷100 → g/kg
 */

export type SoilData = {
  phH2O: number | null;
  soc: number | null; // g/kg
  clay: number | null; // %
  sand: number | null; // %
  silt: number | null; // %
  cec: number | null; // cmol(c)/kg
  nitrogen: number | null; // g/kg
  textureClass: string;
};

const PROPERTIES = [
  "phh2o",
  "soc",
  "clay",
  "sand",
  "silt",
  "cec",
  "nitrogen",
] as const;

/** Divisors to convert SoilGrids mapped units to human-readable values. */
const DIVISORS: Record<string, number> = {
  phh2o: 10,
  soc: 10,
  clay: 10,
  sand: 10,
  silt: 10,
  cec: 10,
  nitrogen: 100,
};

function classifySoilTexture(
  clay: number | null,
  sand: number | null,
  silt: number | null,
): string {
  if (clay === null || sand === null || silt === null) return "Unknown";
  // Simplified USDA texture triangle
  if (clay >= 40) return "Clay";
  if (sand >= 85) return "Sand";
  if (silt >= 80) return "Silt";
  if (clay >= 27 && sand >= 20 && sand <= 45) return "Clay Loam";
  if (clay >= 20 && silt < 28 && sand > 45) return "Sandy Clay Loam";
  if (clay >= 27 && sand < 20) return "Silty Clay Loam";
  if (clay < 27 && silt >= 50) return "Silt Loam";
  if (sand >= 52 && clay < 20) return "Sandy Loam";
  return "Loam";
}

/**
 * Depth-thickness weights for aggregating the top 30cm of soil.
 * SoilGrids v2.0 doesn't support `depth=0-30cm` directly, so we fetch the
 * 3 discrete layers and weight-average by their thickness.
 */
const DEPTH_WEIGHTS: Array<{ depth: string; thickness: number }> = [
  { depth: "0-5cm", thickness: 5 },
  { depth: "5-15cm", thickness: 10 },
  { depth: "15-30cm", thickness: 15 },
];
const TOTAL_DEPTH = DEPTH_WEIGHTS.reduce((s, d) => s + d.thickness, 0); // 30

export async function fetchSoilData(
  lat: number,
  lon: number,
): Promise<SoilData | null> {
  try {
    // Fetch the 3 top-depths in parallel and weight-average → 0-30cm proxy
    const results = await Promise.all(
      DEPTH_WEIGHTS.map(async ({ depth }) => {
        const url = new URL(
          "https://rest.isric.org/soilgrids/v2.0/properties/query",
        );
        url.searchParams.set("lon", lon.toFixed(4));
        url.searchParams.set("lat", lat.toFixed(4));
        for (const p of PROPERTIES) url.searchParams.append("property", p);
        url.searchParams.set("depth", depth);
        url.searchParams.set("value", "mean");

        const res = await fetch(url.toString(), {
          headers: {
            "User-Agent": "BiocharOptimizerPro/1.0",
            Accept: "application/json",
          },
        });
        if (!res.ok) return null;
        return (await res.json()) as {
          properties?: {
            layers?: Array<{
              name: string;
              depths?: Array<{
                values?: { mean?: number | null };
              }>;
            }>;
          };
        };
      }),
    );

    // For each property: weight-average across the depth layers
    const vals: Record<string, number | null> = {};
    for (const prop of PROPERTIES) {
      let weightedSum = 0;
      let totalWeight = 0;
      for (let i = 0; i < results.length; i++) {
        const data = results[i];
        if (!data) continue;
        const layer = data.properties?.layers?.find((l) => l.name === prop);
        const raw = layer?.depths?.[0]?.values?.mean;
        if (typeof raw === "number") {
          weightedSum += raw * DEPTH_WEIGHTS[i].thickness;
          totalWeight += DEPTH_WEIGHTS[i].thickness;
        }
      }
      if (totalWeight === 0) {
        vals[prop] = null;
      } else {
        const avg = weightedSum / totalWeight;
        const divisor = DIVISORS[prop] ?? 1;
        vals[prop] = Math.round((avg / divisor) * 10) / 10;
      }
    }

    // If every property is null we're likely over ocean or a no-data zone
    if (Object.values(vals).every((v) => v === null)) return null;

    const clay = vals["clay"] ?? null;
    const sand = vals["sand"] ?? null;
    const silt = vals["silt"] ?? null;

    return {
      phH2O: vals["phh2o"] ?? null,
      soc: vals["soc"] ?? null,
      clay,
      sand,
      silt,
      cec: vals["cec"] ?? null,
      nitrogen: vals["nitrogen"] ?? null,
      textureClass: classifySoilTexture(clay, sand, silt),
    };
  } catch (err) {
    console.warn("[soilgrids] Failed:", err);
    return null;
  }
}
