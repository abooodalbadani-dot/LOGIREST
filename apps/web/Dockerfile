# =============================================================================
# OTANTIK KITCHEN / LogiRest — Next.js 16 Standalone Production Dockerfile
# =============================================================================
# Requires BuildKit:  DOCKER_BUILDKIT=1  (default in Docker 23+, Buildx)
#
# Build (via compose):
#   DOCKER_BUILDKIT=1 docker compose -f docker-compose.prod.yml build web
#
# NEXT_PUBLIC_* variables are baked into the client bundle at BUILD TIME.
# Pass them as build args; they cannot be changed at container runtime.
# =============================================================================

# ─────────────────────────────────────────────────────────────────────────────
# BASE — shared toolchain pin (alpine for minimal image size)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base

# Strictly enforce npm version across every stage
RUN npm install -g npm@11.6.2 --no-fund --no-audit

# Purge yarn entirely — this monorepo uses npm workspaces + package-lock.json
RUN rm -f /usr/local/bin/yarn /usr/local/bin/yarnpkg

# ─────────────────────────────────────────────────────────────────────────────
# DEPS — install dependencies with BuildKit cache mount
# Copying manifests only first maximises layer-cache reuse between builds.
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS deps

WORKDIR /app

# Monorepo manifests (root + shared packages + this workspace)
COPY package*.json turbo.json tsconfig.base.json ./
COPY packages/                                   ./packages/
COPY apps/web/package*.json                      ./apps/web/

# BuildKit cache mount: npm's global cache is reused across builds on the same
# host, so `npm ci` only downloads changed or missing packages.
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci \
        --workspace=apps/web \
        --include-workspace-root \
        --no-audit \
        --no-fund

# ─────────────────────────────────────────────────────────────────────────────
# BUILDER — compile Next.js with standalone output
# ─────────────────────────────────────────────────────────────────────────────
FROM deps AS builder

# NEXT_PUBLIC_* must be present at build time — Next.js embeds them into the
# client-side bundle.  Injected via docker-compose.prod.yml → web.build.args.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ENV NEXT_TELEMETRY_DISABLED=1
# Cap memory to avoid OOM-kill on a VPS with limited RAM
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Copy source AFTER install so that changing source doesn't bust the deps layer
COPY apps/web/ apps/web/

RUN npm run build --workspace=apps/web

# ─────────────────────────────────────────────────────────────────────────────
# PRODUCTION — minimal runtime image (no node_modules, no source)
#
# next.config.ts  output: 'standalone'  produces a self-contained bundle at:
#   apps/web/.next/standalone/
#     ├── apps/web/server.js        ← entry point
#     └── node_modules/             ← only runtime deps, already inlined
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production

# curl is needed only for the Docker healthcheck (tiny addition to alpine)
RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy ONLY the three directories Next.js standalone mode requires:
#   1. .next/standalone  — server.js + inlined runtime node_modules
#   2. .next/static      — compiled CSS, JS chunks, images (served by Next.js)
#   3. public            — raw static assets (fonts, icons, etc.)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder /app/apps/web/public           ./apps/web/public

EXPOSE 3000

# next.config.ts output:'standalone' generates apps/web/server.js relative to
# the monorepo root.  The standalone dir IS the WORKDIR, so the path is:
CMD ["node", "apps/web/server.js"]
