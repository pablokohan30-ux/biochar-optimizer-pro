# syntax=docker/dockerfile:1.7
#
# Biochar Optimizer Pro — production image for Fly.io
#
# Two-stage build:
#   1) builder: installs all deps, builds frontend (vite) + bundles server (esbuild)
#   2) runtime: copies only what's needed, runs `node dist/index.js`
#
# Native deps (bcrypt, better-sqlite3) are compiled in the builder for the
# linux/amd64 target and copied into runtime — both stages use the same Node
# image so the bindings are guaranteed to match.
#
# SQLite database lives at /app/data/biochar.db. The runtime stage creates the
# directory; in production it is mounted from a Fly persistent volume so the
# database survives deploys.

# ---------- builder ----------
FROM node:22-bookworm-slim AS builder

ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=development

# Vite bakes VITE_* env vars into the client bundle at build time. PostHog's
# project key is PUBLIC (it's literally designed to be shipped to browsers),
# so it's safe to pass via --build-arg. If missing at build time the analytics
# module silently no-ops (see client/src/lib/analytics.ts).
ARG VITE_POSTHOG_KEY
ARG VITE_POSTHOG_HOST
ENV VITE_POSTHOG_KEY=${VITE_POSTHOG_KEY}
ENV VITE_POSTHOG_HOST=${VITE_POSTHOG_HOST}

# Same deal for Sentry's browser DSN: a public write-only endpoint. Safe to
# bake into the bundle. Server DSN (SENTRY_DSN) is a runtime env var set
# separately via `flyctl secrets set`.
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENV
ARG VITE_SENTRY_RELEASE
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
ENV VITE_SENTRY_ENV=${VITE_SENTRY_ENV}
ENV VITE_SENTRY_RELEASE=${VITE_SENTRY_RELEASE}

# Native deps need a C++ toolchain to build (better-sqlite3, bcrypt)
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 \
      build-essential \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# Copy lockfile + manifest first so layer caches when only source changes
COPY package.json pnpm-lock.yaml* ./
COPY patches ./patches

# Install ALL deps (dev included — vite/esbuild/tsx live in devDependencies)
RUN pnpm install --frozen-lockfile

# Now the rest of the source
COPY . .

# Build frontend (vite → server/_core/public) + bundle server (esbuild → dist/)
RUN pnpm build

# Strip dev deps so we can copy a leaner node_modules into runtime
RUN pnpm prune --prod

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runtime

# better-sqlite3 needs libstdc++ at runtime (already in slim, but make it explicit)
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
      tini \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Copy production deps + built artifacts from builder.
# `dist/` contains both the bundled server (dist/index.js) and the built
# frontend (dist/public/), which is what serveStatic() reads in production.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle

# Data directory for SQLite — Fly mounts the persistent volume here
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node
EXPOSE 3000

# tini as PID 1 → clean signal handling + zombie reaping
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "dist/index.js"]
