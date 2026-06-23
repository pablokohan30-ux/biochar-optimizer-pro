/**
 * MarketPulse — compact news feed widget.
 *
 * Pulls latest biochar industry news from biochartoday.com (via our server)
 * and displays them in a lightweight card format. Includes a "This Week in
 * CDR" curated link as a featured item.
 *
 * Placement:
 * - Landing page (bottom, before footer)
 * - Authenticated home sidebar (compact variant)
 * - Standalone `/market` page (full list)
 */

import { useTranslation } from "react-i18next";
import { ExternalLink, Newspaper, Clock, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface MarketPulseProps {
  /** How many news items to show. Default 5. */
  limit?: number;
  /** Compact variant for sidebars (smaller padding, 3 items). */
  compact?: boolean;
}

export default function MarketPulse({ limit = 5, compact = false }: MarketPulseProps) {
  const { t, i18n } = useTranslation("market");
  const displayLimit = compact ? 3 : limit;
  const query = trpc.market.latestNews.useQuery(
    { limit: displayLimit },
    { staleTime: 30 * 60 * 1000 /* 30 min */, refetchOnWindowFocus: false },
  );

  const items = query.data?.items ?? [];

  // Format relative date
  const fmt = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = Date.now();
      const diffHours = (now - d.getTime()) / (1000 * 60 * 60);
      if (diffHours < 1) return t("justNow", { defaultValue: "just now" });
      if (diffHours < 24) return t("hoursAgo", { count: Math.floor(diffHours), defaultValue: `${Math.floor(diffHours)}h ago` });
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return t("daysAgo", { count: diffDays, defaultValue: `${diffDays}d ago` });
      return d.toLocaleDateString(i18n.language === "es" ? "es-AR" : "en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className={compact ? "w-4 h-4 text-primary" : "w-5 h-5 text-primary"} />
          <h3 className={compact ? "text-xs font-bold uppercase tracking-wider text-primary" : "text-sm font-bold uppercase tracking-wider text-primary"}>
            {t("title", { defaultValue: "Market Pulse" })}
          </h3>
        </div>
        <a
          href="https://biochartoday.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          {t("viaBiocharToday", { defaultValue: "via biochartoday.com" })}
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      {/* Language note for Spanish locale — content is in English */}
      {!compact && i18n.language === "es" && (
        <div className="text-[10px] text-muted-foreground italic flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          {t("englishNote", { defaultValue: "Noticias en idioma original (inglés) — fuente internacional." })}
        </div>
      )}

      {/* Loading state */}
      {query.isLoading && (
        <div className="space-y-2">
          {[...Array(displayLimit)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-3 animate-pulse">
              <div className="h-3 bg-secondary rounded w-3/4 mb-2" />
              <div className="h-2 bg-secondary rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!query.isLoading && items.length === 0 && (
        <div className="bg-card border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-muted-foreground">
            {t("empty", { defaultValue: "No news available right now. Check back soon." })}
          </p>
        </div>
      )}

      {/* News items.
          - Compact variant: small horizontal cards (sidebar use), thumbnail left
          - Full variant: 2-column grid on md+ with prominent thumbnail on top */}
      {compact ? (
        <div className="space-y-1.5">
          {items.map((item) => (
            <a
              key={item.link}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2.5 bg-card border border-border rounded-lg p-2 hover:border-primary/40 hover:shadow-sm transition-all group"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt=""
                  loading="lazy"
                  className="w-12 h-12 rounded object-cover flex-shrink-0 bg-muted"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {item.title}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{fmt(item.pubDate)}</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <a
              key={item.link}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-md transition-all group flex flex-col"
            >
              {/* Thumbnail */}
              <div className="aspect-[16/9] bg-muted relative overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      img.style.display = "none";
                      img.parentElement?.classList.add("bg-gradient-to-br", "from-primary/20", "to-primary/5");
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Newspaper className="w-8 h-8 text-primary/30" />
                  </div>
                )}
                {item.category && (
                  <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider bg-background/90 backdrop-blur text-foreground px-1.5 py-0.5 rounded border border-border">
                    {item.category}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="p-4 flex flex-col flex-1">
                <h4 className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-3 mb-2">
                  {item.title}
                </h4>
                {item.summary && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3 mb-3">
                    {item.summary}
                  </p>
                )}
                <div className="mt-auto pt-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {fmt(item.pubDate)}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    {t("readMore", { defaultValue: "Read" })}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
