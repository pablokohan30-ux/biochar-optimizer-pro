import { ENV } from "./env";
import { hasAccess as tierHasAccess, type TierId } from "../stripeProducts";

type GuardedUser = {
  role: string | null | undefined;
  subscriptionTier: string | null | undefined;
  subscriptionStatus: string | null | undefined;
};

export function isLocalAdminBypass(user: Pick<GuardedUser, "role"> | null | undefined): boolean {
  return !ENV.isProduction && user?.role === "admin";
}

export function hasTierAccessForUser(
  user: GuardedUser | null | undefined,
  requiredTier: TierId,
): boolean {
  if (!user) return false;
  if (isLocalAdminBypass(user)) return true;
  return tierHasAccess(
    user.subscriptionTier ?? "free",
    requiredTier,
    user.subscriptionStatus ?? "inactive",
  );
}

export function requireTierAccess(
  user: GuardedUser,
  requiredTier: TierId,
  errorMessage: string,
): void {
  if (!hasTierAccessForUser(user, requiredTier)) {
    throw new Error(errorMessage);
  }
}
