/**
 * Stripe product definitions for Biochar Optimizer Pro subscription tiers.
 * All paid plans are billed quarterly (every 3 months) — minimum 3-month commitment.
 * Prices shown are per-month equivalents; actual charge is the quarterly total.
 *
 * After creating these products in Stripe, store the price IDs here.
 * For now we use lookup_key to find prices dynamically.
 */

export type TierId = "analyst" | "developer" | "engineer" | "expert";

export interface TierProduct {
  id: TierId;
  name: string;
  pricePerMonthUsd: number;
  quarterlyTotalUsd: number;
  description: string;
  lookupKey: string;
}

export const TIER_PRODUCTS: TierProduct[] = [
  {
    id: "analyst",
    name: "Analyst",
    pricePerMonthUsd: 299,
    quarterlyTotalUsd: 897,
    description: "For consultants evaluating the technical feasibility of a biochar project.",
    lookupKey: "biochar_analyst_quarterly",
  },
  {
    id: "developer",
    name: "Developer",
    pricePerMonthUsd: 499,
    quarterlyTotalUsd: 1497,
    description: "For teams with an active project in development.",
    lookupKey: "biochar_developer_quarterly",
  },
  {
    id: "engineer",
    name: "Engineer",
    pricePerMonthUsd: 799,
    quarterlyTotalUsd: 2397,
    description: "For projects in the engineering and regulatory permitting phase.",
    lookupKey: "biochar_engineer_quarterly",
  },
  {
    id: "expert",
    name: "Expert",
    pricePerMonthUsd: 999,
    quarterlyTotalUsd: 2997,
    description: "For operating plants and investment funds.",
    lookupKey: "biochar_expert_quarterly",
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

/**
 * Server-side validator for the social share proof URL. Only accepts links
 * from LinkedIn, X or Twitter — the hosts we actually expect users to post
 * from. Anything else is rejected even if the URL is syntactically valid.
 */
export function isValidSocialShareUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.host.toLowerCase().replace(/^www\./, "");
    return host === "linkedin.com" || host === "x.com" || host === "twitter.com";
  } catch {
    return false;
  }
}
