import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Thermometer,
  Clock,
  Download,
  Trash2,
  ArrowUpDown,
  Layers,
  Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { compute_all, FEEDSTOCK_DB, type Feedstock, type BiocharResult } from "@/lib/biocharModel";
import { getFeedstockName } from "@/lib/feedstockI18n";
import UpgradeModal from "@/components/UpgradeModal";
import PageLoader from "@/components/PageLoader";
import AppLayout from "@/components/AppLayout";

type SortKey = "name" | "C" | "H_Corg" | "yield" | "credits" | "BET" | "pH";
type SortDir = "asc" | "desc";

interface Row {
  id: string;
  feedstock: Feedstock;
  result: BiocharResult;
}

const feedstockEntries = Object.entries(FEEDSTOCK_DB);

export default function BatchComparison() {
  const { t } = useTranslation("batch");
  const { t: tFs } = useTranslation("feedstocks");
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();
  const [, setLocation] = useLocation();

  const [T, setT] = useState(600);
  const [resTime, setResTime] = useState(30);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    feedstockEntries.slice(0, 6).map(([id]) => id),
  );
  const [sortKey, setSortKey] = useState<SortKey>("credits");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Compute results for all selected feedstocks
  const rows: Row[] = useMemo(() => {
    return selectedIds.map((id) => {
      const feedstock = FEEDSTOCK_DB[id];
      if (!feedstock) return null;
      const result = compute_all(T, resTime, feedstock);
      return { id, feedstock, result };
    }).filter(Boolean) as Row[];
  }, [selectedIds, T, resTime]);

  // Sort
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let va: number | string, vb: number | string;
      switch (sortKey) {
        case "name":
          va = getFeedstockName(a.id, a.feedstock.name, tFs);
          vb = getFeedstockName(b.id, b.feedstock.name, tFs);
          break;
        case "C": va = a.result.C; vb = b.result.C; break;
        case "H_Corg": va = a.result.H_Corg; vb = b.result.H_Corg; break;
        case "yield": va = a.result.yield_; vb = b.result.yield_; break;
        case "credits": va = a.result.credits.net; vb = b.result.credits.net; break;
        case "BET": va = a.result.BET; vb = b.result.BET; break;
        case "pH": va = a.result.pH; vb = b.result.pH; break;
        default: va = 0; vb = 0;
      }
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const addFeedstock = (id: string) => {
    if (!selectedIds.includes(id)) {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const removeFeedstock = (id: string) => {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  };

  const selectAll = () => setSelectedIds(feedstockEntries.map(([id]) => id));
  const clearAll = () => setSelectedIds([]);

  // CSV export
  const exportCsv = () => {
    const headers = [
      "Feedstock", "Temperature (°C)", "Residence Time (min)",
      "Carbon (%)", "H:Corg", "EBC Class", "Yield (%)",
      "Net CO₂e (t/t)", "BET (m²/g)", "pH",
      "Syngas Yield (%)", "Syngas HHV (MJ/kg)",
    ];
    const csvRows = sorted.map((r) => [
      `"${getFeedstockName(r.id, r.feedstock.name, tFs)}"`,
      T,
      resTime,
      r.result.C.toFixed(2),
      r.result.H_Corg.toFixed(4),
      r.result.credits.class,
      r.result.yield_.toFixed(2),
      r.result.credits.net.toFixed(3),
      r.result.BET.toFixed(1),
      r.result.pH.toFixed(2),
      r.result.energy.syngas_yield.toFixed(2),
      r.result.energy.syngas_hhv.toFixed(2),
    ]);
    const csv = [headers.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `biochar_batch_${T}C_${resTime}min.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!authLoading && !user) setLocation("/login");
  }, [authLoading, user, setLocation]);

  if (authLoading || tierLoading) return <PageLoader />;

  if (!user) {
    return null;
  }

  if (!hasAccess("developer")) {
    return (
      <UpgradeModal
        isOpen={true}
        onClose={() => setLocation("/app")}
        featureName={t("title")}
        requiredTier="developer"
      />
    );
  }

  // Best row for each KPI
  const bestCredits = Math.max(...rows.map((r) => r.result.credits.net));
  const bestYield = Math.max(...rows.map((r) => r.result.yield_));
  const bestCarbon = Math.max(...rows.map((r) => r.result.C));

  const pageActions = (
    <Button size="sm" variant="outline" onClick={exportCsv} disabled={rows.length === 0} className="gap-1 h-8 text-xs">
      <Download className="w-3.5 h-3.5" /> CSV
    </Button>
  );

  return (
    <AppLayout
      pageTitle={<span className="flex items-center gap-2"><Layers className="w-4 h-4 text-blue-500" /> {t("title")}</span>}
      pageActions={pageActions}
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Thermometer className="w-3 h-3" /> {t("temperature")}
                </label>
                <span className="text-primary font-mono font-bold">{T} °C</span>
              </div>
              <input type="range" min="350" max="850" step="10" value={T} onChange={(e) => setT(Number(e.target.value))} className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>350</span><span>850</span></div>
            </div>
            {/* Residence time */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {t("residenceTime")}
                </label>
                <span className="text-primary font-mono font-bold">{resTime} min</span>
              </div>
              <input type="range" min="10" max="120" step="5" value={resTime} onChange={(e) => setResTime(Number(e.target.value))} className="w-full accent-primary" />
              <div className="flex justify-between text-[10px] text-muted-foreground"><span>10</span><span>120</span></div>
            </div>
            {/* Feedstock selector */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                {t("feedstocks")} ({selectedIds.length}/{feedstockEntries.length})
              </label>
              <div className="flex gap-2 mb-2">
                <button onClick={selectAll} className="text-[10px] text-primary hover:underline">{t("selectAll")}</button>
                <button onClick={clearAll} className="text-[10px] text-muted-foreground hover:underline">{t("clearAll")}</button>
              </div>
              <select
                onChange={(e) => { addFeedstock(e.target.value); e.target.value = ""; }}
                value=""
                className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-xs"
              >
                <option value="" disabled>{t("addFeedstock")}</option>
                {feedstockEntries
                  .filter(([id]) => !selectedIds.includes(id))
                  .map(([id, fs]) => ({ id, fs, name: getFeedstockName(id, fs.name, tFs) }))
                  .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
                  .map(({ id, name }) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary KPIs */}
        {rows.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-border border-l-2 border-l-green-500 rounded-lg p-4 text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t("bestCredits")}</div>
              <div className="text-2xl font-mono font-bold text-green-500">{bestCredits.toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground">t CO₂e/t</div>
            </div>
            <div className="bg-card border border-border border-l-2 border-l-cyan-500 rounded-lg p-4 text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t("bestYield")}</div>
              <div className="text-2xl font-mono font-bold text-cyan-500">{bestYield.toFixed(1)}%</div>
              <div className="text-[10px] text-muted-foreground">{t("dryMass")}</div>
            </div>
            <div className="bg-card border border-border border-l-2 border-l-primary rounded-lg p-4 text-center">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{t("bestCarbon")}</div>
              <div className="text-2xl font-mono font-bold text-primary">{bestCarbon.toFixed(1)}%</div>
              <div className="text-[10px] text-muted-foreground">{t("dryMass")}</div>
            </div>
          </div>
        )}

        {/* Results table */}
        {rows.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Leaf className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="text-left px-3 py-3 w-8"></th>
                    {([
                      { key: "name" as SortKey, label: t("col.feedstock") },
                      { key: "credits" as SortKey, label: t("col.netCo2e") },
                      { key: "C" as SortKey, label: t("col.carbon") },
                      { key: "H_Corg" as SortKey, label: t("col.hcorg") },
                      { key: "yield" as SortKey, label: t("col.yield") },
                      { key: "BET" as SortKey, label: t("col.bet") },
                      { key: "pH" as SortKey, label: "pH" },
                    ]).map((col) => (
                      <th
                        key={col.key}
                        className="px-3 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground select-none"
                        onClick={() => toggleSort(col.key)}
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key && (
                            <ArrowUpDown className="w-3 h-3 text-primary" />
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("col.class")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map((row, i) => {
                    const isBestCredits = row.result.credits.net === bestCredits && bestCredits > 0;
                    const isBestYield = row.result.yield_ === bestYield;
                    const isBestCarbon = row.result.C === bestCarbon;
                    return (
                      <tr key={row.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-3 py-2.5">
                          <button onClick={() => removeFeedstock(row.id)} className="text-muted-foreground hover:text-red-500" title={t("remove")}>
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-xs font-medium max-w-[200px] truncate">{getFeedstockName(row.id, row.feedstock.name, tFs)}</td>
                        <td className={`px-3 py-2.5 font-mono text-xs ${isBestCredits ? "text-green-500 font-bold" : ""}`}>
                          {row.result.credits.net.toFixed(2)}
                        </td>
                        <td className={`px-3 py-2.5 font-mono text-xs ${isBestCarbon ? "text-primary font-bold" : ""}`}>
                          {row.result.C.toFixed(1)}%
                        </td>
                        <td className={`px-3 py-2.5 font-mono text-xs ${row.result.H_Corg >= 0.7 ? "text-red-500" : ""}`}>
                          {row.result.H_Corg.toFixed(3)}
                        </td>
                        <td className={`px-3 py-2.5 font-mono text-xs ${isBestYield ? "text-cyan-500 font-bold" : ""}`}>
                          {row.result.yield_.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs">{Math.round(row.result.BET)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">{row.result.pH.toFixed(1)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            row.result.credits.class === "BC-1"
                              ? "bg-green-500/10 text-green-600"
                              : row.result.credits.class === "BC-2"
                                ? "bg-yellow-500/10 text-yellow-600"
                                : "bg-red-500/10 text-red-500"
                          }`}>
                            {row.result.credits.class}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} featureName={t("title")} requiredTier="developer" />
    </AppLayout>
  );
}
