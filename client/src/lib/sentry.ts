/**
 * Sentry wrapper (browser).
 *
 * Mirrors the same opt-in pattern as `analytics.ts`:
 *   - No VITE_SENTRY_DSN set → everything is a no-op (dev, first-boot prod).
 *   - DSN set → initialize once, capture errors from: React ErrorBoundary,
 *     unhandled promise rejections, window.onerror, and any manual
 *     `captureException` calls we make from tRPC error handlers.
 *
 * The DSN is public by design (it's a write-only endpoint). Safe to ship
 * into the client bundle via VITE_ env var.
 */

import * as Sentry from "@sentry/react";

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const ENV = (import.meta.env.VITE_SENTRY_ENV as string | undefined) ?? (import.meta.env.DEV ? "development" : "production");
const RELEASE = import.meta.env.VITE_SENTRY_RELEASE as string | undefined;

let initialized = false;
let enabled = false;

/** Initialize Sentry. Idempotent. */
export function initSentry(): void {
  if (initialized) return;
  initialized = true;

  if (!DSN) {
    if (import.meta.env.DEV) {
      console.info("[sentry] VITE_SENTRY_DSN not set — no-op mode");
    }
    return;
  }

  try {
    Sentry.init({
      dsn: DSN,
      environment: ENV,
      release: RELEASE,
      // Performance: keep the sample rate low in prod to stay well under
      // the free-tier quota. We can crank this up later if we need more
      // granular traces.
      tracesSampleRate: ENV === "production" ? 0.05 : 1.0,
      // Session replays are useful for reproducing bugs but eat quota
      // fast and add bundle weight. Turn on the 'error' sample only —
      // we'll get replays for sessions that actually crashed.
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: ENV === "production" ? 0.2 : 0,
      // Don't send PII by default. We explicitly set user context from
      // the auth layer, which gives us userId/email in a controlled way.
      sendDefaultPii: false,
      // Ignore noise: browser extensions, ResizeObserver loop warnings,
      // 3rd-party script errors that we can't fix anyway.
      ignoreErrors: [
        "ResizeObserver loop limit exceeded",
        "ResizeObserver loop completed with undelivered notifications",
        "Non-Error promise rejection captured",
        // Stripe script sometimes throws in ad-block environments
        /Loading chunk .* failed/,
      ],
      // Don't instrument these hosts — they're analytics/tracking.
      denyUrls: [
        /eu\.i\.posthog\.com/,
        /app\.posthog\.com/,
      ],
    });
    enabled = true;
  } catch (err) {
    console.error("[sentry] init failed", err);
  }
}

/** Associate the current Sentry session with a logged-in user. */
export function setSentryUser(user: { id: number | string; email?: string | null; tier?: string | null }): void {
  if (!enabled) return;
  try {
    Sentry.setUser({
      id: String(user.id),
      email: user.email ?? undefined,
      // Custom attributes show up on the event detail — helps triage
      // paid vs. free user impact.
      segment: user.tier ?? undefined,
    });
  } catch {
    /* ignore */
  }
}

/** Clear the user context on logout. */
export function clearSentryUser(): void {
  if (!enabled) return;
  try {
    Sentry.setUser(null);
  } catch {
    /* ignore */
  }
}

/** Manually report an exception. Safe when Sentry is disabled. */
export function captureSentryError(err: unknown, context?: Record<string, unknown>): void {
  if (!enabled) {
    // In dev / no-op mode, still surface the error so we don't lose it.
    if (import.meta.env.DEV) console.error("[sentry:no-op]", err, context);
    return;
  }
  try {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    /* ignore */
  }
}

/** Re-export the native ErrorBoundary so consumers can wrap subtrees. */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/** Returns true if Sentry is actually wired up (DSN set + init ran). */
export function sentryEnabled(): boolean {
  return enabled;
}
