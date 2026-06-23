/**
 * CdrMarketStats — visual market section backed by CDR.fyi public data.
 *
 * Data policy (important):
 * - CDR.fyi's Terms of Service prohibit automated redistribution of their
 *   content without a commercial licence. Their public API is also gated
 *   behind paid plans.
 * - What they DO allow is editorial citation with clear attribution (same
 *   model Carbon Herald uses). So this component ships *curated* stats,
 *   each credited "Source: CDR.fyi" with a prominent link back.
 * - Values are snapshotted as of Q2 2026 and should be refreshed once per
 *   quarter. Update `AS_OF` + the numbers together in a single PR.
 *
 * If we ever licence the API officially, the hardcoded `STATS` array below
 * can be replaced by a server-side tRPC query with a 1-hour cache.
 */

import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  ExternalLink, TrendingUp, Building2, Factory, Landmark,
  Zap, Users, BarChart3, Globe, AlertTriangle, Sparkles, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const AS_OF = "Q2 2026";
const SOURCE_URL = "https://www.cdr.fyi/leaderboards";

interface BigStat {
  value: string;
  unit?: string;
  /** i18n key for the label. */
  labelKey: string;
  /** i18n key for the sub-text. */
  subKey: string;
  accent: "green" | "blue" | "amber" | "purple";
  icon: any;
}

/**
 * Headliner stats — the numbers that tell the biochar story in 5 seconds.
 * Source: CDR.fyi snapshots + blog posts. Numbers stay hardcoded (they are
 * quarterly curated) but copy is i18n-translated so ES/EN users see the
 * right language.
 */
const HEADLINE_STATS: BigStat[] = [
  { value: "89",   unit: "%",    labelKey: "cdr.headline1Label", subKey: "cdr.headline1Sub", accent: "green", icon: TrendingUp },
  { value: "658K", unit: "tCO₂e", labelKey: "cdr.headline2Label", subKey: "cdr.headline2Sub", accent: "blue",  icon: BarChart3 },
  { value: "$164", unit: "/t",   labelKey: "cdr.headline3Label", subKey: "cdr.headline3Sub", accent: "amber", icon: Zap },
];

interface Leader {
  rank: number;
  name: string;
  country: string;
  /** i18n key for the metric column (e.g. "46% histórico"). */
  metricKey?: string;
  /** If the metric is a raw number/string that doesn't need translation (e.g. "318,466 t"), use this. */
  metric?: string;
  /** i18n key for the optional note line. */
  noteKey?: string;
}

const TOP_BUYERS: Leader[] = [
  { rank: 1, name: "Microsoft", country: "USA", metricKey: "cdr.buyer1Metric", noteKey: "cdr.buyer1Note" },
  { rank: 2, name: "Google",    country: "USA", metricKey: "cdr.buyerTop4" },
  { rank: 3, name: "JPMorgan",  country: "USA", metricKey: "cdr.buyerTop4" },
  { rank: 4, name: "BCG",       country: "USA", metricKey: "cdr.buyerTop4" },
  { rank: 5, name: "Frontier",  country: "USA", metricKey: "cdr.buyerEarly" },
];

const TOP_SELLERS: Leader[] = [
  { rank: 1, name: "Exomad Green",      country: "Bolivia", metric: "318,466 t", noteKey: "cdr.seller1Note" },
  { rank: 2, name: "Varaha",            country: "India",   metric: "137,174 t", noteKey: "cdr.seller2Note" },
  { rank: 3, name: "Aperam BioEnergia", country: "Brasil",  metric: "89,298 t" },
  { rank: 4, name: "Standard Biocarbon", country: "USA",    metricKey: "cdr.sellerTop10" },
  { rank: 5, name: "CharmWorks",        country: "USA",     metricKey: "cdr.sellerTop10" },
];

interface Headline {
  /** i18n key for the text. */
  textKey: string;
  /** i18n key for the context. */
  contextKey: string;
  /** Source URL on CDR.fyi. Each headline must link to the post/page that
   *  documents the claim — without a link we can't show readers where the
   *  number comes from. */
  url: string;
  /** Short label for the source attribution pill (e.g. "CDR.fyi · Feb 2026"). */
  sourceKey: string;
}

const HEADLINES: Headline[] = [
  {
    textKey: "cdr.headline1.text",
    contextKey: "cdr.headline1.context",
    url: "https://www.cdr.fyi/blog/cdr-monthly-recap-february-2026",
    sourceKey: "cdr.headline1.source",
  },
  {
    textKey: "cdr.headline2.text",
    contextKey: "cdr.headline2.context",
    url: "https://www.cdr.fyi/blog/biochar-carbon-removal-market-snapshot-2025",
    sourceKey: "cdr.headline2.source",
  },
  {
    textKey: "cdr.headline3.text",
    contextKey: "cdr.headline3.context",
    url: "https://www.cdr.fyi/leaderboards",
    sourceKey: "cdr.headline3.source",
  },
  {
    textKey: "cdr.headline4.text",
    contextKey: "cdr.headline4.context",
    url: "https://www.cdr.fyi/blog/biochar-carbon-removal-market-snapshot-2025",
    sourceKey: "cdr.headline4.source",
  },
];

// ─── Accent helpers ─────────────────────────────────────────────────────────

const ACCENT_CLASSES = {
  green:  { bg: "bg-green-500/10",  text: "text-green-500",  border: "border-green-500/30",  grad: "from-green-500/10" },
  blue:   { bg: "bg-blue-500/10",   text: "text-blue-500",   border: "border-blue-500/30",   grad: "from-blue-500/10" },
  amber:  { bg: "bg-amber-500/10",  text: "text-amber-500",  border: "border-amber-500/30",  grad: "from-amber-500/10" },
  purple: { bg: "bg-purple-500/10", text: "text-purple-500", border: "border-purple-500/30", grad: "from-purple-500/10" },
} as const;

// ─── Component ──────────────────────────────────────────────────────────────

interface CdrMarketStatsProps {
  /** When true, renders a lighter variant suitable for embedding in sidebars. */
  compact?: boolean;
}

/**
 * Secondary market-context stats sourced from IPCC / BloombergNEF / public
 * offtake disclosures. Complement the CDR.fyi headline numbers by zooming
 * out from "what is being delivered today" to "what the opportunity size is".
 */
const CONTEXT_STATS: Array<{ value: string; labelKey: string; sourceKey: string; color: string }> = [
  { value: "$50B+", labelKey: "cdr.context1Label", sourceKey: "cdr.context1Source", color: "text-green-500" },
  { value: "2.5 Gt", labelKey: "cdr.context2Label", sourceKey: "cdr.context2Source", color: "text-primary" },
  { value: "<100",  labelKey: "cdr.context3Label", sourceKey: "cdr.context3Source", color: "text-amber-500" },
];

export default function CdrMarketStats({ compact = false }: CdrMarketStatsProps) {
  const { t } = useTranslation("market");

  return (
    <div className="space-y-10 relative">
      {/* Ambient editorial blobs (same vibe as the old magazine-cover section) */}
      <div className="absolute top-1/3 -left-40 w-80 h-80 bg-green-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Header with badge + editorial date */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <div className="inline-flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          <TrendingUp className="w-3 h-3" />
          {t("cdr.badge", { defaultValue: "Biochar en el mercado CDR" })}
        </div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-mono">
          {t("cdr.editorialDate", { defaultValue: "Issue 02 · 2026 · Data: CDR.fyi" })}
        </div>
      </div>

      {/* Unified magazine headline */}
      <div>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-[-0.01em] leading-[1.05] mb-4 max-w-4xl">
          {t("cdr.title", { defaultValue: "El biochar ya es el motor del CDR global. Y recién empezamos." })}
        </h2>
        <p className="text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
          {t("cdr.subtitle", {
            defaultValue:
              "Demanda corporativa superando oferta certificada por un orden de magnitud. Lo que los buyers están realmente comprando, los sellers que se lo están entregando, y los números que pone CDR.fyi — la referencia del sector.",
          })}
        </p>
        <a
          href={SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline mt-3"
        >
          {t("cdr.viewLive", { defaultValue: "Ver dashboard en vivo" })}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Headline stats — 3 giant numbers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {HEADLINE_STATS.map((stat, i) => {
          const A = ACCENT_CLASSES[stat.accent];
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className={`relative overflow-hidden border ${A.border} rounded-2xl p-5 md:p-6 bg-gradient-to-br ${A.grad} via-card to-card`}
            >
              {/* Decorative blob */}
              <div className={`absolute -top-8 -right-8 w-32 h-32 ${A.bg} rounded-full blur-3xl pointer-events-none`} />
              <Icon className={`w-5 h-5 ${A.text} mb-3 relative`} />
              <div className="relative">
                <div className={`text-5xl md:text-6xl font-bold font-mono leading-none tracking-tight ${A.text}`}>
                  {stat.value}
                  {stat.unit && <span className="text-2xl md:text-3xl opacity-70 ml-1">{stat.unit}</span>}
                </div>
                <div className="text-sm font-semibold mt-2">{t(stat.labelKey)}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{t(stat.subKey)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Leaderboards side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top buyers */}
        <div className="border border-border rounded-2xl overflow-hidden bg-card">
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">{t("cdr.topBuyersTitle")}</div>
                <div className="text-[10px] text-muted-foreground">{t("cdr.topBuyersSub")}</div>
              </div>
            </div>
          </div>
          <div className="divide-y divide-border">
            {TOP_BUYERS.map((b) => (
              <div key={b.rank} className="px-5 py-3 flex items-center gap-3">
                <div className="text-2xl font-bold font-mono text-primary/50 w-8 flex-shrink-0">
                  {String(b.rank).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{b.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {b.country}{b.noteKey ? ` · ${t(b.noteKey)}` : ""}
                  </div>
                </div>
                <div className="text-xs font-mono text-muted-foreground flex-shrink-0">
                  {b.metricKey ? t(b.metricKey) : b.metric}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top sellers */}
        <div className="border border-border rounded-2xl overflow-hidden bg-card">
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <Factory className="w-4 h-4 text-green-500" />
              <div>
                <div className="text-xs font-bold uppercase tracking-wider">{t("cdr.topSellersTitle")}</div>
                <div className="text-[10px] text-muted-foreground">{t("cdr.topSellersSub")}</div>
              </div>
            </div>
          </div>
          <div className="divide-y divide-border">
            {TOP_SELLERS.map((s) => (
              <div key={s.rank} className="px-5 py-3 flex items-center gap-3">
                <div className="text-2xl font-bold font-mono text-green-500/50 w-8 flex-shrink-0">
                  {String(s.rank).padStart(2, "0")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{s.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {s.country}{s.noteKey ? ` · ${t(s.noteKey)}` : ""}
                  </div>
                </div>
                <div className="text-xs font-mono text-muted-foreground flex-shrink-0 text-right">
                  {s.metricKey ? t(s.metricKey) : s.metric}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Editorial headlines — each one links to its source on CDR.fyi */}
      {!compact && (
        <div className="border border-border rounded-2xl p-5 md:p-6 bg-card">
          <div className="flex items-center gap-2 mb-4">
            <Landmark className="w-4 h-4 text-primary" />
            <div className="text-xs font-bold uppercase tracking-wider">{t("cdr.whatHappening")}</div>
          </div>
          <div className="space-y-4">
            {HEADLINES.map((h, i) => (
              <a
                key={i}
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-3 pb-4 last:pb-0 border-b last:border-b-0 border-border/60 hover:bg-muted/20 -mx-2 px-2 py-1 rounded-lg transition-colors"
              >
                <div className="flex-shrink-0 w-1 bg-primary rounded-full group-hover:bg-primary group-hover:shadow-[0_0_12px_var(--primary)] transition-shadow" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold leading-snug mb-1 group-hover:text-primary transition-colors flex items-start gap-1.5">
                    <span className="flex-1">{t(h.textKey)}</span>
                    <ExternalLink className="w-3 h-3 mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed mb-1">
                    {t(h.contextKey)}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 font-mono">
                    {t(h.sourceKey)}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Context stats — IPCC / BloombergNEF / public disclosures.
          Zooms out from "what's being delivered" to "market size opportunity". */}
      {!compact && (
        <div className="border border-border rounded-2xl p-5 md:p-6 bg-card">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-muted-foreground" />
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t("cdr.opportunityTitle")}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CONTEXT_STATS.map((stat, i) => (
              <div key={i} className="border-l-2 border-border pl-4">
                <div className={`text-3xl md:text-4xl font-bold font-mono leading-none ${stat.color} mb-2`}>
                  {stat.value}
                </div>
                <div className="text-xs font-semibold leading-snug mb-1">{t(stat.labelKey)}</div>
                <div className="text-[10px] text-muted-foreground leading-snug">{t(stat.sourceKey)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closing provocation + CTAs (what used to be the Market Opportunity conclusion) */}
      {!compact && (
        <div className="bg-gradient-to-br from-green-500/10 via-card to-card border border-green-500/30 rounded-2xl p-5 md:p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm md:text-base text-foreground/90 italic leading-relaxed">
              {t("cdr.conclusion", {
                defaultValue:
                  "La demanda esta comprando supply antes de que se produzca. El cuello de botella no es la biomasa — es la documentación que convierte un proyecto de biochar en créditos certificados.",
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/app">
              <Button size="sm" className="gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                {t("cdr.ctaPrimary", { defaultValue: "Probar la plataforma gratis" })}
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="sm" variant="outline" className="gap-1.5">
                {t("cdr.ctaSecondary", { defaultValue: "Ver planes y precios" })}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Attribution + timestamp */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-border text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <Users className="w-3 h-3" />
          <span>
            {t("cdr.source", {
              defaultValue: "Fuente principal: CDR.fyi — actualizado",
            })}{" "}
            <span className="font-mono text-foreground">{AS_OF}</span>
            {" · "}
            {t("cdr.sourceSecondary", {
              defaultValue: "Context stats: IPCC AR6 + BloombergNEF",
            })}
          </span>
        </div>
        <a
          href={SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline text-primary inline-flex items-center gap-1"
        >
          cdr.fyi/leaderboards <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
