/**
 * Translation helper for feedstock display names.
 *
 * The feedstock data in biocharModel.ts uses English strings as the internal
 * `name` property. This helper looks up a translated display name by feedstock ID
 * from the `feedstocks` i18n namespace, falling back to the original English
 * name if no translation is found (e.g., for custom or AI-generated feedstocks).
 */

import type { TFunction } from "i18next";
import type { Feedstock } from "./biocharModel";

/**
 * Get the display name for a feedstock, translated if available.
 *
 * @param id - The feedstock ID (key in FEEDSTOCK_DB). Pass `null` or empty
 *             string for custom/AI feedstocks that don't exist in the DB.
 * @param fallbackName - The original `feedstock.name` string, used if no
 *                       translation exists for this ID.
 * @param t - The i18n translation function (must have "feedstocks" namespace loaded)
 * @returns Translated name, or the fallback name if no translation.
 */
export function getFeedstockName(
  id: string | null | undefined,
  fallbackName: string,
  t: TFunction,
): string {
  if (!id) return fallbackName;
  const key = `feedstocks:names.${id}`;
  const translated = t(key, { defaultValue: "" });
  return translated || fallbackName;
}

/**
 * Shortcut for the common case of having a Feedstock object and its ID.
 */
export function getFeedstockDisplayName(
  id: string | null | undefined,
  feedstock: Feedstock | null | undefined,
  t: TFunction,
): string {
  if (!feedstock) return "";
  return getFeedstockName(id, feedstock.name, t);
}
