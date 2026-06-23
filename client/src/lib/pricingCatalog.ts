export type PublicTierId = "free" | "analyst" | "developer" | "engineer" | "expert";
export type PublicTierStatus = "available" | "rollout" | "waitlist";

export interface PublicTierPlan {
  id: PublicTierId;
  monthlyPriceUsd: number;
  quarterlyPerMonthUsd: number;
  quarterlyTotalUsd: number;
  savingsUsd: number;
  status: PublicTierStatus;
}

export const PUBLIC_TIER_PLANS: PublicTierPlan[] = [
  {
    id: "free",
    monthlyPriceUsd: 0,
    quarterlyPerMonthUsd: 0,
    quarterlyTotalUsd: 0,
    savingsUsd: 0,
    status: "available",
  },
  {
    id: "analyst",
    monthlyPriceUsd: 299,
    quarterlyPerMonthUsd: 239,
    quarterlyTotalUsd: 717,
    savingsUsd: (299 - 239) * 3,
    status: "available",
  },
  {
    id: "developer",
    monthlyPriceUsd: 499,
    quarterlyPerMonthUsd: 399,
    quarterlyTotalUsd: 1197,
    savingsUsd: (499 - 399) * 3,
    status: "available",
  },
  {
    id: "engineer",
    monthlyPriceUsd: 799,
    quarterlyPerMonthUsd: 639,
    quarterlyTotalUsd: 1917,
    savingsUsd: (799 - 639) * 3,
    status: "waitlist",
  },
  {
    id: "expert",
    monthlyPriceUsd: 999,
    quarterlyPerMonthUsd: 799,
    quarterlyTotalUsd: 2397,
    savingsUsd: (999 - 799) * 3,
    status: "rollout",
  },
];

export const PUBLIC_TIER_BY_ID: Record<PublicTierId, PublicTierPlan> = Object.fromEntries(
  PUBLIC_TIER_PLANS.map((plan) => [plan.id, plan]),
) as Record<PublicTierId, PublicTierPlan>;

export const ANALYST_MONTHLY_USD = PUBLIC_TIER_BY_ID.analyst.monthlyPriceUsd;
export const DEVELOPER_MONTHLY_USD = PUBLIC_TIER_BY_ID.developer.monthlyPriceUsd;
export const ENGINEER_MONTHLY_USD = PUBLIC_TIER_BY_ID.engineer.monthlyPriceUsd;
export const EXPERT_MONTHLY_USD = PUBLIC_TIER_BY_ID.expert.monthlyPriceUsd;
