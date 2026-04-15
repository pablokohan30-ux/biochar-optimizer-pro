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
  if (!query.trim()) return null;

  await throttle();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
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

  if (data.length === 0) return null;

  const result = data[0];
  return {
    lat: parseFloat(result.lat),
    lon: parseFloat(result.lon),
    displayName: result.display_name,
    country: result.address?.country ?? null,
  };
}
