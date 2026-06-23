/**
 * Portfolio Dashboard — Expert tier feature for multi-site operators.
 *
 * Route: /portfolio
 *
 * Unifies regular projects (manual) + AI-generated projects into a single
 * view so operators running multiple sites can see their full pipeline in
 * one place.
 *
 * Shows: aggregate KPIs, filters by country/methodology/status, sortable
 * table of sites, and a map with markers for sites that have lat/lon.
 */

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  Globe, FolderOpen, Sparkles, Factory, TrendingUp, Lock, MapPin,
  ExternalLink, Filter,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageLoader from "@/components/PageLoader";
import UpgradeModal from "@/components/UpgradeModal";
import { useAuth } from "@/_core/hooks/useAuth";
import { useTier } from "@/hooks/useTier";
import { trpc } from "@/lib/trpc";

export default function Portfolio() {
  const { t } = useTranslation("common");
  const tp = (k: string, fallback: string) => t(`portfolio.${k}`, { defaultValue: fallback });
  const [, navigate] = useLocation();
  const { loading: authLoading, isAuthenticated } = useAuth();
  const { hasAccess, isLoading: tierLoading } = useTier();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const hasExpert = hasAccess("expert");

  const query = trpc.portfolio.dashboard.useQuery(undefined, {
    enabled: isAuthenticated && !tierLoading && hasExpert,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/login");
  }, [authLoading, isAuthenticated, navigate]);

  if (authLoading || tierLoading) return <PageLoader />;
  if (!isAuthenticated) return null;

  // Tier gate — show marketing page for non-Expert users
  if (!hasExpert) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-4">
              <Globe className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">{tp("title", "Dashboard de portafolio")}</h1>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              {tp("marketingDesc", "Gestiona múltiples sitios o plantas de biochar en una sola vista. Capacidad agregada, impacto total de carbono y desglose por país y metodología, con todos tus proyectos de un vistazo.")}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-amber-900 mb-1">{tp("expertRequired", "Se requiere plan Expert")}</div>
              <p className="text-sm text-amber-800 mb-3">
                {tp("expertRequiredDesc", "El dashboard de portafolio es una función del plan Expert. Unifica tus proyectos creados a mano con los paquetes generados con IA en una sola vista.")}
              </p>
              <button
                onClick={() => navigate("/pricing")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-900 text-white text-sm font-medium rounded-lg hover:bg-amber-950"
              >
                {tp("seeExpertPlan", "Ver plan Expert")}
              </button>
            </div>
          </div>
        </div>
        {showUpgrade && <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} featureName="Dashboard de portafolio" requiredTier="expert" />}
      </AppLayout>
    );
  }

  if (!query.data) return <PageLoader />;

  const { totals, bySource, byCountry, byMethodology, byStatus, sites } = query.data;

  // Apply filters
  const filteredSites = sites.filter((s) => {
    if (filterCountry !== "all" && s.country !== filterCountry) return false;
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    return true;
  });

  const countryList = Object.keys(byCountry).sort();
  const statusList = Object.keys(byStatus).sort();
  const statusEntries = Object.entries(byStatus)
    .map(([status, count]) => [tp(`status_${status}`, status), count] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{tp("title", "Dashboard de portafolio")}</h1>
              <p className="text-sm text-muted-foreground">{tp("subtitle", "Tu cartera completa: proyectos manuales y generados con IA en una sola vista.")}</p>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            icon={<Factory className="w-4 h-4" />}
            label={tp("kpiSites", "Total sites")}
            value={totals.sites.toLocaleString()}
            hint={`${bySource.project} ${tp("kpiManual", "manual")} · ${bySource.ai} ${tp("kpiAi", "IA")}`}
          />
          <KpiCard
            icon={<TrendingUp className="w-4 h-4" />}
            label={tp("kpiCapacity", "Total capacity")}
            value={`${Math.round(totals.capacityTnYear / 1000).toLocaleString()}k`}
            hint={tp("kpiCapacityHint", "tn/año de biomasa")}
          />
          <KpiCard
            icon={<Sparkles className="w-4 h-4" />}
            label={tp("kpiBiochar", "Biochar output")}
            value={`${Math.round(totals.biocharTnYear / 1000).toLocaleString()}k`}
            hint={tp("kpiBiocharHint", "tn/año estimadas")}
          />
          <KpiCard
            icon={<Globe className="w-4 h-4" />}
            label={tp("kpiCdr", "CDR credits")}
            value={`${Math.round(totals.cdrTCo2ePerYear / 1000).toLocaleString()}k`}
            hint={tp("kpiCdrHint", "tCO₂e/año estimadas")}
          />
        </div>

        {/* Breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <BreakdownCard
            title={tp("byCountry", "By country")}
            entries={Object.entries(byCountry).sort((a, b) => b[1] - a[1])}
          />
          <BreakdownCard
            title={tp("byMethodology", "By methodology")}
            entries={Object.entries(byMethodology).sort((a, b) => b[1] - a[1])}
          />
          <BreakdownCard
            title={tp("byStatus", "By status")}
            entries={statusEntries}
          />
        </div>

        {/* Filters + site table */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">
              {tp("sitesTitle", "Sites")} <span className="text-sm text-muted-foreground font-normal">({filteredSites.length} / {sites.length})</span>
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-muted-foreground/70" />
              <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="border border-input rounded px-2 py-1"
              >
                <option value="all">{tp("filterAllCountries", "All countries")}</option>
                {countryList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-input rounded px-2 py-1"
              >
                <option value="all">{tp("filterAllStatuses", "All statuses")}</option>
                {statusList.map((s) => (
                  <option key={s} value={s}>{tp(`status_${s}`, s)}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredSites.length === 0 ? (
            <div className="bg-muted/40 border border-border rounded-lg p-8 text-center">
              {sites.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  <p className="mb-3">{tp("emptyTitle", "No sites yet.")}</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <button onClick={() => navigate("/projects")} className="px-3 py-1.5 bg-card border border-input rounded text-sm hover:bg-muted/40">
                      <FolderOpen className="w-3.5 h-3.5 inline mr-1.5" />
                      {tp("emptyCreateProject", "Create a project manually")}
                    </button>
                    <button onClick={() => navigate("/ai-builder")} className="px-3 py-1.5 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
                      <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
                      {tp("emptyOpenAiBuilder", "Generate a project with AI")}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{tp("filteredEmpty", "No sites match these filters.")}</p>
              )}
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-x-auto bg-card">
              <table className="min-w-[720px] w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">{tp("colSource", "Source")}</th>
                    <th className="text-left px-3 py-2 font-medium">{tp("colName", "Name")}</th>
                    <th className="text-left px-3 py-2 font-medium">{tp("colCountry", "Country")}</th>
                    <th className="text-right px-3 py-2 font-medium">{tp("colCapacity", "Capacity tn/yr")}</th>
                    <th className="text-right px-3 py-2 font-medium">{tp("colBiochar", "Biochar tn/yr")}</th>
                    <th className="text-right px-3 py-2 font-medium">{tp("colCdr", "CDR tCO₂e/yr")}</th>
                    <th className="text-left px-3 py-2 font-medium">{tp("colMethodology", "Methodology")}</th>
                    <th className="text-left px-3 py-2 font-medium">{tp("colStatus", "Status")}</th>
                    <th className="text-right px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredSites.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/40">
                      <td className="px-3 py-2">
                        {s.source === "ai" ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded border border-indigo-200">
                            <Sparkles className="w-3 h-3" /> {tp("sourceAi", "IA")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-muted text-foreground/90 text-xs rounded border border-border">
                            <FolderOpen className="w-3 h-3" /> {tp("sourceManual", "Manual")}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground">{s.name}</div>
                        {s.location && <div className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5"><MapPin className="w-2.5 h-2.5" /> {s.location}</div>}
                      </td>
                      <td className="px-3 py-2">{s.country ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{s.capacityTnYear ? s.capacityTnYear.toLocaleString() : "—"}</td>
                      <td className="px-3 py-2 text-right">{s.biocharTnYear.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-medium text-emerald-700">{s.cdrTCo2ePerYear.toLocaleString()}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.methodology ?? "—"}</td>
                      <td className="px-3 py-2"><StatusBadge status={s.status} label={tp(`status_${s.status}`, s.status)} /></td>
                      <td className="px-3 py-2 text-right">
                        <a
                          href={s.linkHref}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Disclaimer */}
        <div className="text-xs text-muted-foreground italic bg-muted/40 border border-border rounded p-3">
          {tp("disclaimer", "Biochar output and CDR credit estimates use typical yields (30% biochar from biomass, 3 tCO₂e/t biochar × 85% permanence factor). Actual values depend on project-specific LCA and methodology parameters.")}
        </div>
      </div>
    </AppLayout>
  );
}

function KpiCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function BreakdownCard({ title, entries }: { title: string; entries: Array<[string, number]> }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{title}</div>
      {entries.length === 0 ? (
        <div className="text-sm text-muted-foreground/70 italic">—</div>
      ) : (
        <div className="space-y-1.5">
          {entries.map(([key, count]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-foreground/90">{key}</span>
              <span className="font-semibold text-foreground">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const colorMap: Record<string, string> = {
    complete: "bg-emerald-50 text-emerald-700 border-emerald-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    generating: "bg-indigo-50 text-indigo-700 border-indigo-200",
    pending: "bg-indigo-50 text-indigo-700 border-indigo-200",
    submitted: "bg-amber-50 text-amber-700 border-amber-200",
    draft: "bg-muted/40 text-foreground/90 border-border",
    error: "bg-red-50 text-red-700 border-red-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
  };
  const cls = colorMap[status] ?? "bg-muted/40 text-foreground/90 border-border";
  return <span className={`inline-block px-2 py-0.5 text-xs rounded border ${cls}`}>{label}</span>;
}
