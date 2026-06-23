import { FEEDSTOCK_DB, type Feedstock } from "./biocharModel";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function deriveAnchorCarbon(base: Feedstock | null, carbon: number): number {
  if (base?.anchor_C !== undefined) return base.anchor_C;
  return Math.max(carbon + 12, Math.min(90, carbon + 35));
}

function deriveAnchorHydrogen(base: Feedstock | null, hydrogen: number): number {
  if (base?.anchor_H !== undefined) return base.anchor_H;
  return Math.max(0.8, Math.min(2.4, hydrogen * 0.28));
}

/**
 * Project rows may store either:
 * - a full `Feedstock` object from the simulator, or
 * - the lighter AI Builder biomass snapshot `{ name, composition, source }`.
 *
 * This helper normalizes both shapes into the full simulator feedstock format
 * so project pages, summaries and exports can use the same model safely.
 */
export function resolveProjectFeedstock(
  feedstockId: string | null | undefined,
  rawFeedstockData: string | unknown | null | undefined,
  feedstockDb: Record<string, Feedstock> = FEEDSTOCK_DB,
): Feedstock | null {
  const baseFeedstock = feedstockId && feedstockDb[feedstockId] ? feedstockDb[feedstockId] : null;

  let parsed = rawFeedstockData;
  if (typeof rawFeedstockData === "string") {
    try {
      parsed = JSON.parse(rawFeedstockData);
    } catch {
      parsed = null;
    }
  }

  if (isRecord(parsed)) {
    const composition = isRecord(parsed.composition) ? parsed.composition : parsed;
    const hasElementalData =
      ["C", "H", "O", "N", "S", "ash", "moisture"].some((key) => typeof composition[key] === "number");

    if (hasElementalData || baseFeedstock) {
      const carbon = readNumber(composition.C, baseFeedstock?.C ?? 50);
      const hydrogen = readNumber(composition.H, baseFeedstock?.H ?? 6);

      return {
        name:
          typeof parsed.name === "string"
            ? parsed.name
            : typeof composition.name === "string"
              ? composition.name
              : baseFeedstock?.name ?? "Custom biomass",
        C: carbon,
        H: hydrogen,
        O: readNumber(composition.O, baseFeedstock?.O ?? 40),
        N: readNumber(composition.N, baseFeedstock?.N ?? 0.5),
        S: readNumber(composition.S, baseFeedstock?.S ?? 0),
        ash: readNumber(composition.ash, baseFeedstock?.ash ?? 5),
        moisture: readNumber(composition.moisture, baseFeedstock?.moisture ?? 10),
        source:
          typeof parsed.source === "string"
            ? parsed.source
            : typeof composition.source === "string"
              ? composition.source
              : baseFeedstock?.source ?? "User-provided data",
        anchor_T: readNumber(parsed.anchor_T, baseFeedstock?.anchor_T ?? 650),
        anchor_t: readNumber(parsed.anchor_t, baseFeedstock?.anchor_t ?? 30),
        anchor_C: readNumber(parsed.anchor_C, deriveAnchorCarbon(baseFeedstock, carbon)),
        anchor_H: readNumber(parsed.anchor_H, deriveAnchorHydrogen(baseFeedstock, hydrogen)),
      };
    }
  }

  return baseFeedstock ?? null;
}
