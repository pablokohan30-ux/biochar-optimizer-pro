/**
 * Geocoding helper using OpenStreetMap Nominatim API.
 * Free, no API key required. Rate-limited to 1 req/sec (Nominatim policy).
 * https://operations.osmfoundation.org/policies/nominatim/
 */

export type GeocodeResult = {
  lat: number;
  lon: number;
  displayName: string;
  country: string | null;
};

let lastRequestAt = 0;

async function throttle() {
  const now = Date.now();
  const delta = now - lastRequestAt;
  if (delta < 1100) {
    await new Promise(r => setTimeout(r, 1100 - delta));
  }
  lastRequestAt = Date.now();
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const results = await searchAddresses(query, 1);
  return results[0] ?? null;
}

/**
 * Multi-result version for autocomplete: returns up to `limit` candidates
 * matching the query. Used by the client as-you-type for suggestions.
 */
export async function searchAddresses(query: string, limit = 5): Promise<GeocodeResult[]> {
  if (!query.trim() || query.trim().length < 3) return [];

  await throttle();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 10)));
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "BiocharOptimizerPro/1.0 (biochar optimization tool)",
      "Accept": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as Array<{
    lat: string;
    lon: string;
    display_name: string;
    address?: { country?: string };
  }>;

  return data.map((r) => ({
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    displayName: r.display_name,
    country: r.address?.country ?? null,
  }));
}
