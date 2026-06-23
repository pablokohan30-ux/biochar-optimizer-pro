/**
 * PostHog analytics wrapper.
 *
 * Usage:
 *   import { initAnalytics, trackEvent, identifyUser, resetAnalytics } from "@/lib/analytics";
 *
 *   // At app boot:
 *   initAnalytics();
 *
 *   // When user logs in:
 *   identifyUser(user.id, { email, tier });
 *
 *   // On logout:
 *   resetAnalytics();
 *
 *   // Track a specific action:
 *   trackEvent("simulation_run", { feedstock, temperature });
 *
 * Design decisions:
 * - If VITE_POSTHOG_KEY is missing (e.g. local dev without env), all
 *   functions become no-ops. Never throws, never breaks the build.
 * - Respects Do Not Track browser preference.
 * - Uses EU host by default — faster for LatAm users, and PostHog EU
 *   is GDPR-friendly which we may need if we expand into Europe.
 * - Autocapture is ON for pageviews + clicks, but we also emit named
 *   events for the conversions that matter to us so we can build proper
 *   funnels without relying on URL heuristics.
 */

import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://eu.i.posthog.com";

let initialized = false;
let enabled = false;

/** Initialize PostHog. Safe to call multiple times — only runs once. */
export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;

  // No API key? Run in no-op mode. Useful for dev + for first-time deploy.
  if (!POSTHOG_KEY) {
    if (import.meta.env.DEV) {
      // Just a hint during development — prod should set the env var.
      console.info("[analytics] VITE_POSTHOG_KEY not set — running in no-op mode");
    }
    return;
  }

  // Respect Do Not Track.
  if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") {
    console.info("[analytics] Do Not Track enabled — skipping PostHog init");
    return;
  }

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // We handle pageview tracking manually from the router since we're a
      // wouter-based SPA (PostHog's autocapture pageview fires only on initial
      // hard loads, not client-side navigation).
      capture_pageview: false,
      // Autocapture clicks, form submits, etc. — gives us behavioural data
      // without instrumenting every single button.
      autocapture: true,
      // Session recording OFF by default — we can turn this on later from the
      // PostHog dashboard if we need to debug specific user sessions.
      disable_session_recording: true,
      // Don't persist across subdomains we don't own.
      cross_subdomain_cookie: false,
      // Keep payload sizes sane.
      property_blacklist: ["$ip"],
      loaded: (ph) => {
        // In dev, log what PostHog is doing so we can debug.
        if (import.meta.env.DEV) {
          ph.debug();
        }
      },
    });
    enabled = true;
  } catch (err) {
    console.error("[analytics] PostHog init failed", err);
  }
}

/** Manually emit a pageview. Called from the router on every route change. */
export function trackPageView(path: string, extra?: Record<string, unknown>): void {
  if (!enabled) return;
  try {
    posthog.capture("$pageview", {
      $current_url: typeof window !== "undefined" ? window.location.href : path,
      path,
      ...(extra ?? {}),
    });
  } catch {
    /* ignore — analytics must never break the app */
  }
}

/** Track a named event. */
export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (!enabled) return;
  try {
    posthog.capture(name, props);
  } catch {
    /* ignore */
  }
}

/** Associate the current anonymous session with a user. Call on login. */
export function identifyUser(userId: string | number, props?: Record<string, unknown>): void {
  if (!enabled) return;
  try {
    posthog.identify(String(userId), props);
  } catch {
    /* ignore */
  }
}

/** Clear the user's identity. Call on logout. */
export function resetAnalytics(): void {
  if (!enabled) return;
  try {
    posthog.reset();
  } catch {
    /* ignore */
  }
}

/** Returns true if PostHog is actually wired up (env var set + init ran). */
export function analyticsEnabled(): boolean {
  return enabled;
}
