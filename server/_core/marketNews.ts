/**
 * Market news feed — fetches biochartoday.com RSS and parses into structured items.
 *
 * Cached in-memory for 1 hour to avoid hammering their server + keep our
 * response times fast.
 *
 * Used by: tRPC `market.latestNews` endpoint → MarketPulse component on the
 * landing + authenticated home sidebar.
 */

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string; // ISO string
  summary: string; // short, HTML-stripped
  category?: string; // e.g. "Industry", "Science"
}

interface CachedFeed {
  fetchedAt: number;
  items: NewsItem[];
}

let _cache: CachedFeed | null = null;
const TTL_MS = 60 * 60 * 1000; // 1 hour

const FEED_URL = "https://biochartoday.com/feed";

/**
 * Minimal RSS 2.0 parser — we don't need a full XML parser for this,
 * regex is fine for a simple known-format feed.
 */
function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  // Capture each <item>…</item> block
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDateRaw = extractTag(block, "pubDate");
    const descriptionRaw = extractTag(block, "description");
    const categoryRaw = extractTag(block, "category");

    if (!title || !link) continue;

    // Parse pubDate to ISO
    let pubDate = pubDateRaw;
    try {
      pubDate = new Date(pubDateRaw).toISOString();
    } catch {}

    // Strip HTML from description
    const summary = descriptionRaw
      .replace(/<[^>]+>/g, "")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 280);

    items.push({
      title: decodeEntities(title),
      link: decodeEntities(link),
      pubDate,
      summary: decodeEntities(summary),
      category: categoryRaw ? decodeEntities(categoryRaw) : undefined,
    });
  }
  return items;
}

function extractTag(block: string, tag: string): string {
  // Match <tag>…</tag> or <tag><![CDATA[…]]></tag>
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i");
  const cdataMatch = block.match(cdata);
  if (cdataMatch) return cdataMatch[1].trim();
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const plainMatch = block.match(plain);
  return plainMatch ? plainMatch[1].trim() : "";
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Fetch the latest items from biochartoday.com. Cached 1h.
 * Returns up to `limit` items, sorted by pubDate desc.
 */
export async function fetchBiocharToday(limit = 10): Promise<NewsItem[]> {
  // Cache hit
  if (_cache && Date.now() - _cache.fetchedAt < TTL_MS) {
    return _cache.items.slice(0, limit);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(FEED_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent": "BiocharOptimizerPro/1.0 (market pulse aggregator)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Feed returned ${res.status}`);
    const xml = await res.text();
    const items = parseRss(xml);

    // Sort by pubDate desc
    items.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    _cache = { fetchedAt: Date.now(), items };
    return items.slice(0, limit);
  } catch (err) {
    console.warn("[marketNews] Fetch failed:", err);
    // Return stale cache if we have it, otherwise empty
    return _cache?.items.slice(0, limit) ?? [];
  }
}

/**
 * Returns a curated "weekly digest" link for LinkedIn This Week in CDR.
 * Static for now — could be auto-updated via scraping later.
 */
export function getWeeklyDigestLink() {
  return {
    title: "This Week in CDR",
    link: "https://www.linkedin.com/newsletters/7063056842879627264/",
    source: "LinkedIn · Weekly",
    description: "Weekly roundup of carbon removal industry news.",
  };
}
