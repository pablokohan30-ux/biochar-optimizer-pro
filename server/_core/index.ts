import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";

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

  app.use(express.static(distPath));

  // SPA fallback — any unmatched path returns index.html
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
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

  // Stripe webhook MUST use raw body BEFORE express.json()
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET) {
    const { stripeWebhookRouter } = await import("../stripeWebhook");
    app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
    app.use(stripeWebhookRouter);
  }

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

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
