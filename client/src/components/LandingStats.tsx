/**
 * LandingStats — hero trust-indicator grid, data-driven.
 *
 * Shows 3-4 tiles with animated count-up numbers:
 *   1. Active methodologies (credit-issuing count highlighted)
 *   2. Biomasses in catalog
 *   3. Model accuracy (static but real)
 *   4. (conditional) Projects with BOP ID — only if above threshold
 *
 * Replaces the old hardcoded "50+ / BC-1 / 100%" grid. Driven by the public
 * `stats.getLandingStats` tRPC endpoint so the numbers stay truthful and grow
 * automatically as adoption scales.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";

/** Count-up animation — runs once on mount. */
function useCountUp(target: number, durationMs = 800): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

function StatTile({
  value,
  label,
  sub,
  animated = true,
}: {
  value: number | string;
  label: string;
  sub?: string;
  animated?: boolean;
}) {
  const numericTarget = typeof value === "number" ? value : 0;
  const animatedValue = useCountUp(animated ? numericTarget : 0);
  const displayValue = typeof value === "string" ? value : animated ? animatedValue : value;

  return (
    <div>
      <div className="text-2xl font-bold text-primary leading-tight">{displayValue}</div>
      <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground/80 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function LandingStats() {
  const { t, i18n } = useTranslation("landing");
  const query = trpc.stats.getLandingStats.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 min — landing doesn't need real-time freshness
    refetchOnWindowFocus: false,
  });

  // While loading, render the old static numbers so the hero doesn't layout-shift.
  const data = query.data;
  const loading = query.isLoading;

  const activeMeth = data?.coverage.activeMethodologies ?? 5;
  const comingSoonCount = (data?.coverage.totalMethodologies ?? 6) - activeMeth;
  const feedstocks = data?.coverage.feedstocks ?? 53;
  const showUsage = Boolean(data?.usage.visible && data.usage.projectsWithBopId);
  const projectsWithBopId = data?.usage.projectsWithBopId ?? 0;

  // Grid: 3 tiles by default, 4 when usage is shown.
  const columns = showUsage ? "grid-cols-2 md:grid-cols-4" : "grid-cols-3";

  return (
    <div className={`mt-10 pt-8 border-t border-border/50 grid ${columns} gap-6 max-w-lg`}>
      {/* 1. Active methodologies */}
      <StatTile
        value={activeMeth}
        label={t("hero.statMethodologies", { defaultValue: "Metodologías activas" })}
        sub={comingSoonCount > 0
          ? t("hero.statMethodologiesSub", {
              count: comingSoonCount,
              defaultValue: i18n.language.startsWith("es")
                ? `+${comingSoonCount} en preparación`
                : `+${comingSoonCount} in preparation`,
            })
          : undefined}
        animated={!loading}
      />

      {/* 2. Feedstock catalog */}
      <StatTile
        value={feedstocks}
        label={t("hero.statFeedstocks", { defaultValue: "Biomasas modeladas" })}
        sub={t("hero.statFeedstocksSub", { defaultValue: "Calibradas vs papers" })}
        animated={!loading}
      />

      {/* 3. Model accuracy */}
      <StatTile
        value={data?.coverage.modelAccuracy ?? "±5-8%"}
        label={t("hero.statAccuracy", { defaultValue: "Precisión del modelo" })}
        sub={t("hero.statAccuracySub", { defaultValue: "vs literatura peer-reviewed" })}
        animated={false}
      />

      {/* 4. (Optional) Usage — only when >= threshold */}
      {showUsage && (
        <StatTile
          value={projectsWithBopId}
          label={t("hero.statProjects", { defaultValue: "Proyectos con BOP ID" })}
          sub={t("hero.statProjectsSub", { defaultValue: "Preparados para certificación" })}
          animated={!loading}
        />
      )}
    </div>
  );
}
