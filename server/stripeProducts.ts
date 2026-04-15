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

export type PassId = "carbon_forum_2026";

export interface PassProduct {
  id: PassId;
  name: string;
  priceUsd: number;          // one-time charge in USD
  durationDays: number;      // how many days of access this unlocks
  grantsTier: TierId;        // which tier the pass maps to
  promoCode: string;         // client-side gate code shown in marketing
  description: string;
  lookupKey: string;         // Stripe price lookup_key
}

export const PASSES: PassProduct[] = [
  {
    id: "carbon_forum_2026",
    name: "Carbon Forum Pass",
    priceUsd: 50,
    durationDays: 30,
    grantsTier: "analyst",
    promoCode: "CARBONFORUM50",
    description: "30-day full Analyst access — Carbon Forum Colombia 2026 launch special.",
    lookupKey: "biochar_pass_carbon_forum_2026",
  },
];

export function getPassById(id: string): PassProduct | undefined {
  return PASSES.find((p) => p.id === id);
}

export function getPassByPromoCode(code: string): PassProduct | undefined {
  const normalized = code.trim().toUpperCase();
  return PASSES.find((p) => p.promoCode.toUpperCase() === normalized);
}
