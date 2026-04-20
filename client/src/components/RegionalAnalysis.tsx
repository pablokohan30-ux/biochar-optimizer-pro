import { useTranslation } from "react-i18next";
import {
  Thermometer,
  Droplets,
  Layers,
  Leaf,
  FlaskConical,
  Loader2,
  AlertTriangle,
  CloudRain,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const MONTH_KEYS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
] as const;

interface RegionalAnalysisProps {
  latitude: number | null;
  longitude: number | null;
  /** When true, uses the public (no-auth) regional data endpoint. For the /demo page. */
  publicEndpoint?: boolean;
}

export default function RegionalAnalysis({ latitude, longitude, publicEndpoint = false }: RegionalAnalysisProps) {
  const { t } = useTranslation("projectDetail");

  const enabled = latitude !== null && longitude !== null;
  const protectedQuery = trpc.projects.getRegionalData.useQuery(
    { lat: latitude!, lon: longitude! },
    { enabled: enabled && !publicEndpoint, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );
  const publicQuery = trpc.projects.getRegionalDataPublic.useQuery(
    { lat: latitude!, lon: longitude! },
    { enabled: enabled && publicEndpoint, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );
  const query = publicEndpoint ? publicQuery : protectedQuery;

  if (!enabled) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <AlertTriangle className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{t("regional.noCoords")}</p>
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">{t("regional.loading")}</span>
      </div>
    );
  }

  if (query.error || (!query.data?.climate && !query.data?.soil)) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <AlertTriangle className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{t("regional.noData")}</p>
      </div>
    );
  }

  const { climate, soil } = query.data;

  // Find max precipitation for bar chart scaling
  const maxPrecip = climate
    ? Math.max(...climate.monthly.map((m) => m.precipitation), 1)
    : 1;

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
        {t("regional.title")}
      </h3>

      <div className="space-y-4">
        {/* ── Climate (full width, horizontal layout) ── */}
        {climate && (
          <div className="bg-card border border-border rounded-xl p-5">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <CloudRain className="w-4 h-4 text-cyan-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("regional.climate")}
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {t("regional.dataYear", { year: climate.year })}
              </span>
            </div>

            {/* Horizontal layout: stats on the left, charts on the right */}
            <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-5 items-start">
              {/* Stats column — compact vertical stack */}
              <div className="flex lg:flex-col gap-3 lg:w-36">
                <div className="flex-1 bg-background border border-border rounded-lg p-3 flex lg:flex-col items-center gap-2 lg:gap-1">
                  <Thermometer className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <div className="flex flex-col lg:items-center">
                    <div className="text-xl font-mono font-bold leading-none">{climate.annualTempMean}°C</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{t("regional.avgTemp")}</div>
                  </div>
                </div>
                <div className="flex-1 bg-background border border-border rounded-lg p-3 flex lg:flex-col items-center gap-2 lg:gap-1">
                  <Droplets className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <div className="flex flex-col lg:items-center">
                    <div className="text-xl font-mono font-bold leading-none">{climate.annualPrecipitation}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{t("regional.annualPrecip")}</div>
                  </div>
                </div>
              </div>

              {/* Charts column — monthly precip + monthly temp, stacked */}
              <div className="space-y-4 min-w-0">
                {/* Monthly precipitation bars */}
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                      {t("regional.monthlyChart")}
                    </div>
                    <div className="text-[9px] text-muted-foreground font-mono">
                      max {maxPrecip} mm
                    </div>
                  </div>
                  <div className="flex items-end gap-[3px] h-20">
                    {climate.monthly.map((m) => {
                      const height = Math.max((m.precipitation / maxPrecip) * 100, 3);
                      return (
                        <div
                          key={m.month}
                          className="flex-1 rounded-t bg-cyan-500/70 hover:bg-cyan-400 transition-colors relative group"
                          style={{ height: `${height}%` }}
                          title={`${t(`regional.months.${MONTH_KEYS[m.month - 1]}`)}: ${m.precipitation} mm / ${m.tempMean}°C`}
                        >
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5 left-1/2 -translate-x-1/2 bg-background border border-border rounded px-1.5 py-0.5 text-[9px] whitespace-nowrap z-10">
                            {m.precipitation} mm
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-[3px] mt-1">
                    {climate.monthly.map((m) => (
                      <div
                        key={m.month}
                        className="flex-1 text-center text-[9px] text-muted-foreground leading-none"
                      >
                        {t(`regional.months.${MONTH_KEYS[m.month - 1]}`)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monthly temperature heatmap */}
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                    {t("regional.monthlyTemp")}
                  </div>
                  <div className="flex gap-[3px]">
                    {climate.monthly.map((m) => {
                      const ratio = Math.min(Math.max(m.tempMean / 35, 0), 1);
                      const hue = Math.round((1 - ratio) * 240);
                      return (
                        <div
                          key={m.month}
                          className="flex-1 h-6 rounded text-[9px] font-mono flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: `hsl(${hue}, 70%, 45%)` }}
                          title={`${t(`regional.months.${MONTH_KEYS[m.month - 1]}`)}: ${m.tempMean}°C`}
                        >
                          {m.tempMean > 0 ? Math.round(m.tempMean) : m.tempMean.toFixed(0)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Soil (full width, horizontal layout) ── */}
        {soil && (
          <div className="bg-card border border-border rounded-xl p-5">
            {/* Header + texture class pill */}
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("regional.soil")}
              </span>
              <span className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-bold ml-2">
                {soil.textureClass}
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">0–30 cm</span>
            </div>

            {/* Horizontal layout: properties (left) + texture composition (right) */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 items-start">
              {/* Properties — 4 columns on desktop */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {soil.phH2O !== null && (
                  <div className="bg-background border border-border rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <FlaskConical className="w-3 h-3 text-purple-400" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">pH</span>
                    </div>
                    <div className="text-lg font-mono font-bold leading-none">{soil.phH2O}</div>
                    <div className="text-[9px] text-muted-foreground mt-1">
                      {soil.phH2O < 5.5 ? t("regional.acidic") : soil.phH2O > 7.5 ? t("regional.alkaline") : t("regional.neutral")}
                    </div>
                  </div>
                )}
                {soil.soc !== null && (
                  <div className="bg-background border border-border rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Leaf className="w-3 h-3 text-green-500" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">SOC</span>
                    </div>
                    <div className="text-lg font-mono font-bold leading-none">{soil.soc}</div>
                    <div className="text-[9px] text-muted-foreground mt-1">g/kg</div>
                  </div>
                )}
                {soil.cec !== null && (
                  <div className="bg-background border border-border rounded-lg p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">CEC</div>
                    <div className="text-lg font-mono font-bold leading-none">{soil.cec}</div>
                    <div className="text-[9px] text-muted-foreground mt-1">cmol(c)/kg</div>
                  </div>
                )}
                {soil.nitrogen !== null && (
                  <div className="bg-background border border-border rounded-lg p-3">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">N</div>
                    <div className="text-lg font-mono font-bold leading-none">{soil.nitrogen}</div>
                    <div className="text-[9px] text-muted-foreground mt-1">g/kg</div>
                  </div>
                )}
              </div>

              {/* Texture composition — on the right */}
              {(soil.clay !== null || soil.sand !== null || soil.silt !== null) && (
                <div className="lg:w-60">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">
                    {t("regional.textureComposition")}
                  </div>
                  <div className="flex h-5 rounded-full overflow-hidden">
                    {soil.clay !== null && (
                      <div
                        className="bg-red-400 flex items-center justify-center text-[8px] font-bold text-white"
                        style={{ width: `${soil.clay}%` }}
                        title={`Clay: ${soil.clay}%`}
                      >
                        {soil.clay > 8 && `${soil.clay}%`}
                      </div>
                    )}
                    {soil.silt !== null && (
                      <div
                        className="bg-yellow-400 flex items-center justify-center text-[8px] font-bold text-gray-800"
                        style={{ width: `${soil.silt}%` }}
                        title={`Silt: ${soil.silt}%`}
                      >
                        {soil.silt > 8 && `${soil.silt}%`}
                      </div>
                    )}
                    {soil.sand !== null && (
                      <div
                        className="bg-amber-200 flex items-center justify-center text-[8px] font-bold text-gray-700"
                        style={{ width: `${soil.sand}%` }}
                        title={`Sand: ${soil.sand}%`}
                      >
                        {soil.sand > 8 && `${soil.sand}%`}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1.5 text-[9px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />{t("regional.clay")}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />{t("regional.silt")}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-200" />{t("regional.sand")}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Biochar insight — full width below */}
            {soil.phH2O !== null && (
              <div className="mt-4 bg-green-500/5 border border-green-500/20 rounded-lg p-3 flex items-start gap-2">
                <Leaf className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-0.5">
                    {t("regional.biocharInsight")}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {soil.phH2O < 5.5
                      ? t("regional.insightAcid")
                      : soil.phH2O > 7.5
                        ? t("regional.insightAlkaline")
                        : t("regional.insightNeutral")}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
