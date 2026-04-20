/**
 * Stripe product definitions for Biochar Optimizer Pro subscription tiers.
 *
 * Two billing cycles:
 *   - Monthly:   full price, billed every month, cancel anytime
 *   - Quarterly: 20% discount, billed every 3 months
 *
 * After creating these products in Stripe, store the price IDs here.
 * For now we use lookup_key to find prices dynamically.
 */

export type TierId = "analyst" | "developer" | "engineer" | "expert";
export type BillingCycle = "monthly" | "quarterly";

export interface TierProduct {
  id: TierId;
  name: string;
  monthlyPriceUsd: number;            // Price per month when billed monthly
  quarterlyPricePerMonthUsd: number;   // Equivalent per-month price when billed quarterly (20% off)
  quarterlyTotalUsd: number;           // Total charged every 3 months
  description: string;
  monthlyLookupKey: string;
  quarterlyLookupKey: string;
}

export const TIER_PRODUCTS: TierProduct[] = [
  {
    id: "analyst",
    name: "Analyst",
    monthlyPriceUsd: 299,
    quarterlyPricePerMonthUsd: 239,
    quarterlyTotalUsd: 717,
    description: "For consultants evaluating the technical feasibility of a biochar project.",
    monthlyLookupKey: "biochar_analyst_monthly",
    quarterlyLookupKey: "biochar_analyst_quarterly",
  },
  {
    id: "developer",
    name: "Developer",
    monthlyPriceUsd: 499,
    quarterlyPricePerMonthUsd: 399,
    quarterlyTotalUsd: 1197,
    description: "For teams with an active project in development.",
    monthlyLookupKey: "biochar_developer_monthly",
    quarterlyLookupKey: "biochar_developer_quarterly",
  },
  {
    id: "engineer",
    name: "Engineer",
    monthlyPriceUsd: 799,
    quarterlyPricePerMonthUsd: 639,
    quarterlyTotalUsd: 1917,
    description: "For projects in the engineering and regulatory permitting phase.",
    monthlyLookupKey: "biochar_engineer_monthly",
    quarterlyLookupKey: "biochar_engineer_quarterly",
  },
  {
    id: "expert",
    name: "Expert",
    monthlyPriceUsd: 999,
    quarterlyPricePerMonthUsd: 799,
    quarterlyTotalUsd: 2397,
    description: "For operating plants and investment funds.",
    monthlyLookupKey: "biochar_expert_monthly",
    quarterlyLookupKey: "biochar_expert_quarterly",
  },
];

export const TIER_ORDER: TierId[] = ["analyst", "developer", "engineer", "expert"];

export function getTierIndex(tier: string): number {
  return TIER_ORDER.indexOf(tier as TierId);
}

export function hasAccess(userTier: string, requiredTier: TierId, subscriptionStatus?: string): boolean {
  if (userTier === "free") return false;
  if (subscriptionStatus && subscriptionStatus !== "active") return false;
  const userIdx = getTierIndex(userTier);
  const reqIdx = getTierIndex(requiredTier);
  if (userIdx === -1 || reqIdx === -1) return false;
  return userIdx >= reqIdx;
}

// ─── One-time passes (not subscriptions) ────────────────────────────────────
// Passes grant time-limited access to a specific tier without auto-renewal.
// Used for event promos like the Carbon Forum Colombia 2026 launch.
//
// Carbon Forum Colombia 2026 has two variants:
//   - "_full":   $100 base price, no strings attached
//   - "_social": $50 unlocked by sharing a post about us on LinkedIn/X
//                (client submits the share URL, server validates the domain)

export type PassId = "carbon_forum_2026_full" | "carbon_forum_2026_social";

export interface PassProduct {
  id: PassId;
  name: string;
  priceUsd: number;          // one-time charge in USD
  durationDays: number;      // how many days of access this unlocks
  grantsTier: TierId;        // which tier the pass maps to
  description: string;
  lookupKey: string;         // Stripe price lookup_key — must be unique per price
  requiresSocialProof?: boolean;  // true for the "_social" variant
}

export const PASSES: PassProduct[] = [
  {
    id: "carbon_forum_2026_full",
    name: "Carbon Forum Pass",
    priceUsd: 100,
    durationDays: 30,
    grantsTier: "analyst",
    description: "30-day full Analyst access — Carbon Forum Colombia 2026 launch special.",
    lookupKey: "biochar_pass_carbon_forum_2026_full",
  },
  {
    id: "carbon_forum_2026_social",
    name: "Carbon Forum Pass (Social Share)",
    priceUsd: 50,
    durationDays: 30,
    grantsTier: "analyst",
    description: "30-day full Analyst access — unlocked by sharing about us on LinkedIn or X.",
    lookupKey: "biochar_pass_carbon_forum_2026_social",
    requiresSocialProof: true,
  },
];

export function getPassById(id: string): PassProduct | undefined {
  return PASSES.find((p) => p.id === id);
}

/**
 * Any pass whose id starts with `carbon_forum_2026` is part of the Colombia
 * 2026 launch family — used for banners / analytics that don't care about
 * the specific variant.
 */
export function isCarbonForumPass(id: string): boolean {
  return id.startsWith("carbon_forum_2026");
}

// ─── Social share URL validation ────────────────────────────────────────────

/** Patterns for real post URLs (not homepages, search, settings, etc.) */
const POST_URL_PATTERNS: { host: RegExp; path: RegExp }[] = [
  // X / Twitter: x.com/<user>/status/<id> or twitter.com/<user>/status/<id>
  { host: /^(x\.com|twitter\.com)$/, path: /^\/[a-zA-Z0-9_]{1,15}\/status\/\d+/ },
  // LinkedIn post: linkedin.com/posts/<slug> or linkedin.com/feed/update/<urn>
  { host: /^linkedin\.com$/, path: /^\/(posts\/|feed\/update\/)/ },
];

/** Keywords we look for in the fetched page to confirm it mentions us */
const MENTION_KEYWORDS = [
  "biochar", "biocharpro", "biochar optimizer", "biochar-optimizer",
  "pyrolysis", "carbon credit", "puro.earth", "biochar pro",
  "biocharpro.io", "biochar-optimizer-pro",
];

/**
 * Step 1: Validate the URL format — must be a real post URL from LinkedIn or X.
 * Rejects homepages, profiles without a post, settings pages, etc.
 */
export function isValidSocialShareUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.host.toLowerCase().replace(/^www\./, "");
    return POST_URL_PATTERNS.some((p) => p.host.test(host) && p.path.test(url.pathname));
  } catch {
    return false;
  }
}

/**
 * Step 2: Fetch the post page and verify it exists (HTTP 200) and mentions
 * something related to biochar / our platform. Returns an object with the
 * verification result and a human-readable reason on failure.
 *
 * This is a best-effort check — social platforms may block server fetches
 * or require JS rendering. If the fetch fails with a network error we give
 * the benefit of the doubt (pass). If the page loads but contains zero
 * relevant keywords we reject it.
 */
export async function verifySocialSharePost(
  postUrl: string,
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(postUrl.trim(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "BiocharOptimizerPro/1.0 (post-verification)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    // If the page returns 404 or similar → the post doesn't exist
    if (res.status === 404 || res.status === 410) {
      return { valid: false, reason: "POST_NOT_FOUND" };
    }

    // Some platforms return 401/403 for non-logged-in scrapers.
    // In that case, we can't verify content → give benefit of the doubt.
    if (res.status === 401 || res.status === 403) {
      return { valid: true };
    }

    // Read body (limit to first 100KB to avoid memory issues)
    const text = await res.text();
    const snippet = text.slice(0, 100_000).toLowerCase();

    // Check for at least one relevant keyword
    const found = MENTION_KEYWORDS.some((kw) => snippet.includes(kw));
    if (!found) {
      return { valid: false, reason: "NO_MENTION" };
    }

    return { valid: true };
  } catch (err: any) {
    // Network error, timeout, DNS failure, etc. — benefit of the doubt
    // (social platforms often block server-side fetches)
    return { valid: true };
  }
}
