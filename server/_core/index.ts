import "dotenv/config";
// Sentry MUST be imported and initialised before any other module that may
// throw — its global handlers need to be the first to register on the Node
// process. Safe no-op without SENTRY_DSN.
import { initServerSentry, sentryExpressErrorHandler } from "./sentry";
initServerSentry();

import express from "express";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { applyMetaOverride, matchOverride } from "./seoMeta";

// Inlined: production static-serving (matches the old serveStatic in vite.ts).
// We keep it inlined so that the production bundle does NOT statically
// reference ./vite.ts, which itself imports the `vite` package — a dev
// dependency that's pruned out of the runtime image. setupVite is loaded
// dynamically below, only when NODE_ENV === "development".
function serveStatic(app: express.Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  // `index: false` so express.static does NOT auto-serve /index.html for `/`.
  // We want `/` to fall through to the SPA fallback below, which applies
  // per-route SEO meta overrides + injects site-wide JSON-LD. Without this,
  // the landing page would skip JSON-LD injection entirely.
  app.use(express.static(distPath, { index: false }));

  // Load index.html once at startup. When an SPA route has a SEO override
  // configured (see seoMeta.ts) we substitute title + description + OG tags
  // on the fly so social-media previews render per-route content.
  const indexPath = path.resolve(distPath, "index.html");
  let indexHtmlCache: string | null = null;
  try {
    indexHtmlCache = fs.readFileSync(indexPath, "utf8");
  } catch (err) {
    console.warn("[serveStatic] Could not pre-load index.html:", err);
  }

  // SPA fallback — any unmatched path returns index.html (optionally with
  // per-route meta tag overrides for social previews).
  //
  // API paths are excluded from the SPA fallback and return a structured 404
  // instead. Otherwise a misspelled endpoint (e.g. GET /api/v1/simulate, which
  // is POST-only) would return the SPA HTML with status 200 and confuse
  // downstream integrators. Shape matches the rest of the REST API errors.
  app.use("*", (req, res) => {
    // Strip query string; seoMeta matches on the pathname only.
    const pathname = (req.originalUrl || "/").split("?")[0];

    if (pathname.startsWith("/api/") || pathname === "/mcp" || pathname.startsWith("/mcp/")) {
      res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: `No handler for ${req.method} ${pathname}. See /api/openapi.json for the list of available endpoints.`,
        },
      });
      return;
    }

    // Always pass through applyMetaOverride — it handles the null-override
    // case by injecting the site-wide Organization + SoftwareApplication
    // JSON-LD blocks, which Google uses for rich-results surfacing even on
    // pages without per-route meta customisation (e.g. "/", "/app", "/batch").
    const override = matchOverride(pathname);
    if (indexHtmlCache) {
      const html = applyMetaOverride(indexHtmlCache, override, pathname);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
      return;
    }
    res.sendFile(indexPath);
  });
}

const sensitiveFileRequestPattern =
  /^\/(?!\.well-known(?:\/|$))(?:(?:.*\/)?\.[^/]+(?:\/.*)?|(?:.*\/)?(?:env|config|secrets?)(?:\.[^/]*)?)$/i;

function blockSensitiveFileRequests(app: express.Express) {
  app.use((req, res, next) => {
    const pathname = (req.originalUrl || "/").split("?")[0];
    // Vite serves optimized dev dependencies from /@fs/.../node_modules/.vite
    // and pnpm stores packages under node_modules/.pnpm. Those dot directories
    // are local dev implementation details, not public dotfile probes.
    if (process.env.NODE_ENV === "development" && pathname.startsWith("/@fs/")) {
      next();
      return;
    }

    if (!sensitiveFileRequestPattern.test(pathname)) {
      next();
      return;
    }

    res.status(404).type("text/plain").send("Not found");
  });
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  blockSensitiveFileRequests(app);

  // Stripe webhook MUST use raw body BEFORE express.json()
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
    const { stripeWebhookRouter } = await import("../stripeWebhook");
    app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
    app.use(stripeWebhookRouter);
  }

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Public REST API (Developer+ tier, API key auth)
  const { apiRouter } = await import("../apiRouter");
  app.use(apiRouter);

  // Plain liveness probe for Fly.io / load balancers.
  // Intentionally outside tRPC so it's a no-arg GET that just confirms the
  // process is up. Does NOT touch the database — separate `/ready` could check
  // that later if we need a real readiness probe.
  app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true, ts: Date.now() });
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files.
  //
  // The vite module is loaded via a dynamic import whose target path is hidden
  // behind a variable so esbuild can't statically resolve it. That way the
  // production bundle (`dist/index.js`) does NOT pull `./vite.ts` into its
  // require graph, and the `vite` npm package (a devDependency, pruned out of
  // the Docker image) is never required at runtime.
  if (process.env.NODE_ENV === "development") {
    const viteModulePath = "./vite";
    const { setupVite } = await import(viteModulePath);
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Sentry error middleware — mount AFTER routes so it sees the errors those
  // routes throw, but BEFORE any final response-renderer. For 5xx, it calls
  // Sentry.captureException; for 4xx it's a pass-through. No-op without DSN.
  app.use(sentryExpressErrorHandler);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
