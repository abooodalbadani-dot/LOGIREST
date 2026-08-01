# =============================================================================
# OTANTIK KITCHEN / LogiRest — NestJS 11 Production Dockerfile
# =============================================================================
# Requires BuildKit:  DOCKER_BUILDKIT=1  (default in Docker 23+, Buildx)
#
# Build (via compose):
#   DOCKER_BUILDKIT=1 docker compose -f docker-compose.prod.yml build api
#
# 3-stage design:
#   base       — pinned node:20-alpine, npm@11.6.2, yarn purged, system libs
#   builder    — installs all deps (incl. devDeps), generates Prisma, compiles TS
#   production — copies pruned node_modules + compiled dist only
#
# Entry point (from nest-cli.json entryFile: "apps/api/src/main"):
#   tsc rootDir is monorepo root → output: dist/apps/api/src/main.js
# =============================================================================

# ─────────────────────────────────────────────────────────────────────────────
# BASE — shared toolchain pin
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

# Strictly enforce npm version across every stage
RUN npm install -g npm@11.6.2 --no-fund --no-audit

# Purge yarn entirely — this monorepo uses npm workspaces + package-lock.json
RUN rm -f /usr/local/bin/yarn /usr/local/bin/yarnpkg

# System libraries required at build time and runtime:
#   openssl  — Prisma native query-engine binary
#   chromium — Playwright PDF generation (prod dependency)
RUN apk add --no-cache openssl chromium

# ─────────────────────────────────────────────────────────────────────────────
# DEPS — install ALL dependencies (devDeps required for nest build + Prisma CLI)
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS deps

WORKDIR /app

# Copy monorepo manifests first to maximise layer-cache reuse.
# Only these files affect the npm install layer; source changes don't bust it.
COPY package*.json turbo.json tsconfig.base.json     ./
COPY packages/shared-types/package*.json              ./packages/shared-types/
COPY apps/api/package*.json                           ./apps/api/

# BuildKit cache mount: npm's global cache persists across builds on the same
# host → `npm ci` only re-downloads changed or missing packages.
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci \
        --workspace=apps/api \
        --include-workspace-root \
        --no-audit \
        --no-fund

# ─────────────────────────────────────────────────────────────────────────────
# BUILDER — Prisma generate → NestJS compile
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS builder

# Cap memory to avoid OOM-kill on low-RAM VPS during TS compilation
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Copy source AFTER install so that source changes don't bust the deps layer
COPY packages/ packages/
COPY apps/api/  apps/api/

# Step 1: Generate Prisma Client (MUST run before nest build).
# Schema is at apps/api/prisma/schema.prisma (local to the API workspace).
# Outputs the generated client into node_modules/@prisma/client.
RUN for i in 1 2 3 4 5; do ./node_modules/.bin/prisma generate --schema=apps/api/prisma/schema.prisma && break || sleep 2; done

# Step 2: Compile TypeScript → dist/
# nest-cli.json: entryFile = "apps/api/src/main"
# tsc rootDir is monorepo root, so output lands at:
#   apps/api/dist/apps/api/src/main.js
RUN npm run build --workspace=apps/api

# Step 3: Prune devDependencies in-place (reuses the same layer)
RUN npm prune --omit=dev --workspace=apps/api --no-audit

# ─────────────────────────────────────────────────────────────────────────────
# PRODUCTION — minimal runtime image
# Contains: pruned node_modules + Prisma client + compiled dist + schema
# Does NOT contain: source TypeScript, devDeps, test files, build cache
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# curl for healthcheck | openssl for Prisma runtime | chromium for PDF generation
RUN apk add --no-cache curl openssl chromium

WORKDIR /app

ENV NODE_ENV=production
# Path to the Chromium binary installed by apk (used by Playwright)
ENV CHROMIUM_PATH=/usr/bin/chromium
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Pruned node_modules (devDeps stripped by `npm prune --omit=dev` in builder)
COPY --from=builder /app/node_modules          ./node_modules

# Shared package source (required for @logirest/shared-types path resolution)
COPY --from=builder /app/packages              ./packages

# Compiled NestJS output
# builder: apps/api/dist/apps/api/src/main.js  →  container: dist/apps/api/src/main.js
COPY --from=builder /app/apps/api/dist         ./dist

# Prisma schema + migrations — required by `prisma migrate deploy` at startup
COPY --from=builder /app/apps/api/prisma       ./prisma

# package.json — Prisma CLI uses it to resolve the schema path at runtime
COPY --from=builder /app/apps/api/package.json ./package.json

EXPOSE 4000

# Boot sequence:
#   1. prisma migrate deploy  — applies pending migrations idempotently (safe to
#      run on every restart; skips already-applied migrations)
#   2. node dist/apps/api/src/main  — starts the compiled NestJS server
#
# DIRECT_URL fallback: if the operator sets only DATABASE_URL (not DIRECT_URL),
# Prisma migrate requires DIRECT_URL; we default it to DATABASE_URL here.
CMD ["sh", "-c", \
  "if [ -z \"$DIRECT_URL\" ]; then export DIRECT_URL=\"$DATABASE_URL\"; fi \
   && ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma \
   && node dist/apps/api/src/main"]
