/**
 * Sentry (Node) — server-side error monitoring.
 *
 * Opt-in via SENTRY_DSN env var (runtime, not build-time: server code runs
 * in Node so we don't need VITE_-prefixed build inlining).
 *
 * Instruments:
 *   - Unhandled exceptions + rejections (via @sentry/node global handlers)
 *   - Express error middleware (see `sentryExpressErrorHandler` below)
 *   - Manual `captureServerError(err, ctx)` calls from tRPC error mapper, etc.
 *
 * Filters out noise we'll never fix:
 *   - 4xx business errors (auth, tier-gate)
 *   - Dev-time connection resets
 */

import * as Sentry from "@sentry/node";
import type { Request, Response, NextFunction } from "express";

const DSN = process.env.SENTRY_DSN;
const ENV = process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? "production";
const RELEASE = process.env.SENTRY_RELEASE;

let initialized = false;
let enabled = false;

/** Initialize Sentry. Must run before `express()` so global handlers attach. */
export function initServerSentry(): void {
  if (initialized) return;
  initialized = true;

  if (!DSN) {
    console.info("[sentry/server] SENTRY_DSN not set — no-op mode");
    return;
  }

  try {
    Sentry.init({
      dsn: DSN,
      environment: ENV,
      release: RELEASE,
      // Keep traces low in prod; we're focused on error capture first.
      tracesSampleRate: ENV === "production" ? 0.05 : 0,
      sendDefaultPii: false,
      // Business errors we throw on purpose — not real bugs.
      ignoreErrors: [
        /UPGRADE_REQUIRED/i,
        /UNAUTHORIZED/i,
        /Project not found/i,
      ],
      beforeSend(event, hint) {
        // Scrub any accidental large payloads. Don't ship biomass PDFs to Sentry.
        if (event.request?.data) {
          try {
            const sz = JSON.stringify(event.request.data).length;
            if (sz > 10 * 1024) {
              event.request.data = `[redacted: ${sz} bytes]`;
            }
          } catch {
            /* ignore */
          }
        }
        return event;
      },
    });
    enabled = true;
    console.info(`[sentry/server] initialized · env=${ENV}`);
  } catch (err) {
    console.error("[sentry/server] init failed", err);
  }
}

/** Manually capture a server error. Safe no-op when disabled. */
export function captureServerError(err: unknown, context?: Record<string, unknown>): void {
  if (!enabled) return;
  try {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    /* ignore */
  }
}

/**
 * Capture a business-level event (not an error — a named signal worth tracking).
 * Examples: `expert_signup`, `rate_limit_hit`, `trial_started`.
 *
 * Shows up in Sentry as a captured message with level=info. If Sentry isn't
 * configured this is a no-op — the caller still gets console.log output
 * separately.
 */
export function captureSentryEvent(name: string, extra?: Record<string, unknown>): void {
  if (!enabled) return;
  try {
    Sentry.captureMessage(name, {
      level: "info",
      extra,
    });
  } catch {
    /* ignore */
  }
}

/**
 * Express error middleware that forwards unhandled 5xx errors to Sentry
 * before falling through to the default error handler.
 *
 * Mount with: `app.use(sentryExpressErrorHandler);` AFTER all route handlers
 * but BEFORE any custom error-response middleware. If Sentry is disabled,
 * this is a plain pass-through.
 */
export function sentryExpressErrorHandler(err: any, req: Request, _res: Response, next: NextFunction) {
  if (enabled) {
    // Don't log 4xx errors (client-side mistakes / expected 404/401).
    const status = typeof err?.statusCode === "number" ? err.statusCode : 500;
    if (status >= 500) {
      try {
        Sentry.captureException(err, {
          extra: {
            method: req.method,
            url: req.originalUrl,
            // Keep headers slim — don't leak cookies or auth.
            userAgent: req.get("user-agent"),
          },
        });
      } catch {
        /* ignore */
      }
    }
  }
  next(err);
}

export function serverSentryEnabled(): boolean {
  return enabled;
}
