import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
// Side-effect import — must run BEFORE <App/> mounts so the first render picks
// up the detected language from localStorage / navigator.
import "./i18n";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";
import { initAnalytics } from "./lib/analytics";
import { initSentry, captureSentryError } from "./lib/sentry";

// Initialize error monitoring as early as possible so the crashes of the
// boot sequence itself get reported. Safe no-op without VITE_SENTRY_DSN.
initSentry();

// Initialize PostHog analytics. Safe no-op if VITE_POSTHOG_KEY isn't set.
initAnalytics();

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

/**
 * Skip reporting auth errors — those are expected when a session expires
 * and the user gets redirected to /login. Also skip tier-gate rejections
 * (UPGRADE_REQUIRED) — they're a product behaviour, not a bug.
 */
function isExpectedBusinessError(error: unknown): boolean {
  if (!(error instanceof TRPCClientError)) return false;
  if (error.message === UNAUTHED_ERR_MSG) return true;
  if (typeof error.message === "string" && error.message.startsWith("UPGRADE_REQUIRED")) return true;
  return false;
}

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
    if (!isExpectedBusinessError(error)) {
      captureSentryError(error, { source: "tRPC query", queryKey: event.query.queryKey });
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
    if (!isExpectedBusinessError(error)) {
      captureSentryError(error, { source: "tRPC mutation" });
    }
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
