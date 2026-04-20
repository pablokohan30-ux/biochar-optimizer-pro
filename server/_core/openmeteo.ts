/**
 * Open-Meteo Historical Weather API client.
 * Free, no API key required. Returns monthly climate averages for a location.
 * https://open-meteo.com/en/docs/historical-weather-api
 */

export type MonthlyClimate = {
  month: number; // 1–12
  tempMean: number; // °C
  precipitation: number; // mm
};

export type ClimateData = {
  annualTempMean: number; // °C
  annualPrecipitation: number; // mm total
  monthly: MonthlyClimate[];
  year: number; // data year
};

export async function fetchClimateData(
  lat: number,
  lon: number,
): Promise<ClimateData | null> {
  try {
    // Use last complete calendar year for stable data
    const year = new Date().getFullYear() - 1;
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    // Open-Meteo Archive doesn't support `monthly=` aggregation — fetch daily
    // and aggregate to monthly on our side. ~366 values per variable = tiny payload.
    const url = new URL("https://archive-api.open-meteo.com/v1/archive");
    url.searchParams.set("latitude", lat.toFixed(4));
    url.searchParams.set("longitude", lon.toFixed(4));
    url.searchParams.set("start_date", startDate);
    url.searchParams.set("end_date", endDate);
    url.searchParams.set("daily", "temperature_2m_mean,precipitation_sum");
    url.searchParams.set("timezone", "auto");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "BiocharOptimizerPro/1.0" },
    });

    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);

    const data = (await res.json()) as {
      daily?: {
        time?: string[];
        temperature_2m_mean?: number[];
        precipitation_sum?: number[];
      };
    };

    const times = data.daily?.time ?? [];
    const temps = data.daily?.temperature_2m_mean ?? [];
    const precips = data.daily?.precipitation_sum ?? [];

    if (times.length === 0 || temps.length === 0) return null;

    // Aggregate daily → monthly (12 months)
    const monthlyTemps: number[][] = Array.from({ length: 12 }, () => []);
    const monthlyPrecips: number[] = Array.from({ length: 12 }, () => 0);

    for (let i = 0; i < times.length; i++) {
      const date = new Date(times[i]);
      const month = date.getUTCMonth(); // 0–11
      if (typeof temps[i] === "number" && !isNaN(temps[i])) {
        monthlyTemps[month].push(temps[i]);
      }
      if (typeof precips[i] === "number" && !isNaN(precips[i])) {
        monthlyPrecips[month] += precips[i];
      }
    }

    const monthly: MonthlyClimate[] = monthlyTemps.map((temps, idx) => ({
      month: idx + 1,
      tempMean: temps.length
        ? Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10
        : 0,
      precipitation: Math.round(monthlyPrecips[idx]),
    }));

    const allTemps = temps.filter((t) => typeof t === "number" && !isNaN(t));
    const annualTempMean =
      allTemps.length > 0
        ? Math.round((allTemps.reduce((a, b) => a + b, 0) / allTemps.length) * 10) / 10
        : 0;
    const annualPrecipitation = Math.round(
      monthlyPrecips.reduce((a, b) => a + b, 0),
    );

    return { annualTempMean, annualPrecipitation, monthly, year };
  } catch (err) {
    console.warn("[openmeteo] Failed:", err);
    return null;
  }
}
