/**
 * Market news feed — fetches biochartoday.com posts via WordPress REST API.
 *
 * Why WP REST instead of RSS: their RSS feed doesn't include featured images
 * (no <media:thumbnail>, no <enclosure>, no <content:encoded>). The WP API
 * with `_embed` returns the featured image URL natively, which lets the
 * client render rich preview cards instead of text-only links.
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
  category?: string;
  imageUrl?: string;
}

interface CachedFeed {
  fetchedAt: number;
  items: NewsItem[];
}

let _cache: CachedFeed | null = null;
const TTL_MS = 60 * 60 * 1000; // 1 hour

const WP_API_URL = "https://biochartoday.com/wp-json/wp/v2/posts";

interface WpPost {
  link: string;
  date_gmt?: string;
  date?: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  categories?: number[];
  _embedded?: {
    "wp:featuredmedia"?: Array<{ source_url?: string; media_details?: { sizes?: Record<string, { source_url?: string; width?: number }> } }>;
    "wp:term"?: Array<Array<{ name?: string; taxonomy?: string }>>;
  };
}

/** Strip HTML, decode entities, trim to N chars. */
function cleanText(html: string, maxLen = 280): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&hellip;/g, "…")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLen);
}

/** Pick the most reasonable image size — prefer `medium_large` (~768px wide). */
function pickImageUrl(post: WpPost): string | undefined {
  const media = post._embedded?.["wp:featuredmedia"]?.[0];
  if (!media) return undefined;
  const sizes = media.media_details?.sizes ?? {};
  // Prefer mid-size to keep payloads light + render fast.
  return (
    sizes.medium_large?.source_url ??
    sizes.medium?.source_url ??
    sizes.large?.source_url ??
    sizes.full?.source_url ??
    media.source_url
  );
}

/** Pick the first non-generic category (skip "News", "Biochar"). */
function pickCategory(post: WpPost): string | undefined {
  const terms = post._embedded?.["wp:term"]?.[0];
  if (!terms) return undefined;
  const skip = new Set(["news", "biochar"]);
  for (const term of terms) {
    if (term.name && !skip.has(term.name.toLowerCase())) return term.name;
  }
  return terms[0]?.name;
}

function mapPostToItem(post: WpPost): NewsItem | null {
  const title = post.title?.rendered ? cleanText(post.title.rendered, 200) : "";
  const link = post.link;
  if (!title || !link) return null;

  const pubDateRaw = post.date_gmt ?? post.date;
  let pubDate = pubDateRaw ?? "";
  try { if (pubDateRaw) pubDate = new Date(pubDateRaw).toISOString(); } catch {}

  return {
    title,
    link,
    pubDate,
    summary: post.excerpt?.rendered ? cleanText(post.excerpt.rendered, 240) : "",
    category: pickCategory(post),
    imageUrl: pickImageUrl(post),
  };
}

/**
 * Fetch the latest items from biochartoday.com via WP REST. Cached 1h.
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
    // Ask for embedded media + terms so we get featured images and category names.
    const url = `${WP_API_URL}?_embed&per_page=${Math.max(limit, 10)}&orderby=date&order=desc`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "BiocharOptimizerPro/1.0 (market pulse aggregator)",
        Accept: "application/json",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`WP API returned ${res.status}`);
    const posts = (await res.json()) as WpPost[];
    const items = posts
      .map(mapPostToItem)
      .filter((i): i is NewsItem => i !== null)
      .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

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
