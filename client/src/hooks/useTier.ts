import { trpc } from "@/lib/trpc";

export type TierId = "free" | "analyst" | "developer" | "engineer" | "expert";

const TIER_ORDER: TierId[] = ["free", "analyst", "developer", "engineer", "expert"];

export function useTier() {
  const { data, isLoading } = trpc.subscription.getMyTier.useQuery(undefined, {
    staleTime: 60_000, // Cache for 1 minute
  });

  const tier = (data?.tier ?? "free") as TierId;
  const status = data?.status ?? "inactive";

  function hasAccess(requiredTier: TierId): boolean {
    if (requiredTier === "free") return true;
    const userIdx = TIER_ORDER.indexOf(tier);
    const reqIdx = TIER_ORDER.indexOf(requiredTier);
    if (userIdx === -1 || reqIdx === -1) return false;
    return userIdx >= reqIdx && status === "active";
  }

  return { tier, status, isLoading, hasAccess };
}
