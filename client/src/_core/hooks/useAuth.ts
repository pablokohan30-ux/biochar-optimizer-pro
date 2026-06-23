import { trpc } from "@/lib/trpc";
import { useCallback, useMemo } from "react";
import { useLocation } from "wouter";

export function useAuth() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
      utils.subscription.getMyTier.setData(undefined, {
        tier: "free",
        status: "inactive",
        accessExpiresAt: null,
      });
      setLocation("/login");
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Already logged out
    } finally {
      utils.auth.me.setData(undefined, null);
      utils.subscription.getMyTier.setData(undefined, {
        tier: "free",
        status: "inactive",
        accessExpiresAt: null,
      });
      await utils.auth.me.invalidate();
      await utils.subscription.getMyTier.invalidate();
    }
  }, [logoutMutation, utils]);

  const state = useMemo(() => ({
    user: meQuery.data ?? null,
    loading: meQuery.isLoading || logoutMutation.isPending,
    error: meQuery.error ?? logoutMutation.error ?? null,
    isAuthenticated: Boolean(meQuery.data),
  }), [meQuery.data, meQuery.error, meQuery.isLoading, logoutMutation.error, logoutMutation.isPending]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
    getLoginUrl: () => "/login",
  };
}
