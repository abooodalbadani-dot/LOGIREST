# =============================================================================
# LogiRest Web — Next.js 16 Standalone Production Dockerfile
# =============================================================================
# Build: docker build --build-arg NEXT_PUBLIC_API_URL=https://... -t logirest-web .
# Requires BuildKit: DOCKER_BUILDKIT=1 (default in Docker 23+)
# =============================================================================

# ─────────────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────────────
FROM node:24-slim AS builder

# Strip Yarn to enforce npm-only in this monorepo
RUN rm -f /usr/local/bin/yarn /usr/local/bin/yarnpkg

WORKDIR /app

# NEXT_PUBLIC_* vars must be baked at BUILD TIME — Next.js embeds them
# into the client bundle. Set via docker-compose build args.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Copy dependency manifests first to maximise layer cache reuse
COPY package*.json turbo.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/web/package*.json apps/web/

# Install with BuildKit npm cache mount — avoids re-downloading on every build
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci --workspace=apps/web --include-workspace-root

# Copy application source AFTER install to avoid invalidating the install layer
COPY apps/web/ apps/web/

RUN npm run build --workspace=apps/web

# ─────────────────────────────────────────────────
# Stage 2: Production Runner (minimal footprint)
# ─────────────────────────────────────────────────
FROM node:24-slim AS production

# curl for healthcheck only
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# The standalone output is a self-contained server with all required node_modules
# already inlined — no separate node_modules copy needed.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder /app/apps/web/public           ./apps/web/public

EXPOSE 3000

# next.config.ts output: 'standalone' generates apps/web/server.js
CMD ["node", "apps/web/server.js"]
