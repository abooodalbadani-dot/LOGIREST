# =============================================================================
# LogiRest API — NestJS 11 Production Dockerfile
# =============================================================================
# Requires BuildKit: DOCKER_BUILDKIT=1 (default in Docker 23+)
#
# Memory-efficient 2-stage design:
#   builder  — installs all deps, generates Prisma client, compiles TS
#   production — copies dist + pruned node_modules (devDeps stripped via npm prune)
#
# Build one service at a time on low-RAM VPS:
#   docker compose -f docker-compose.prod.yml build api
#   docker compose -f docker-compose.prod.yml build web
#   docker compose -f docker-compose.prod.yml up -d
# =============================================================================

# ─────────────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────────────
FROM node:24-slim AS builder

# Strip Yarn to enforce npm-only in this monorepo
RUN rm -f /usr/local/bin/yarn /usr/local/bin/yarnpkg

# openssl is required by Prisma to generate the native query engine binary
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Set Prisma binary mirror (npmmirror is a reliable global CDN for Prisma engines)
ENV PRISMA_ENGINES_MIRROR="https://registry.npmmirror.com/-/binary/prisma"

# ── Dependency manifests first — maximise layer cache reuse ──
COPY package*.json turbo.json tsconfig.base.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/api/package*.json              ./apps/api/

# Single npm ci: installs all deps (devDeps required for nest build)
# BuildKit cache mount avoids re-downloading on every build
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=apps/api --include-workspace-root \
        --no-audit --no-fund

# ── Copy source after install to keep install layer cached ──
COPY packages/ packages/
COPY apps/api/ apps/api/

# Generate Prisma Client (must run before nest build — outputs into node_modules)
RUN ./node_modules/.bin/prisma generate --schema=apps/api/prisma/schema.prisma

# Compile TypeScript → apps/api/dist/
# tsconfig outDir: ./dist + path aliases force rootDir to monorepo root,
# so entry compiles to: apps/api/dist/apps/api/src/main.js
RUN npm run build --workspace=apps/api

# Prune devDependencies IN PLACE after compilation.
# This avoids a second full npm ci in a separate stage, saving ~600MB peak RAM.
RUN npm prune --omit=dev --workspace=apps/api

# ─────────────────────────────────────────────────
# Stage 2: Production Runner (minimal footprint)
# ─────────────────────────────────────────────────
FROM node:24-slim AS production

# curl → healthcheck | openssl → Prisma runtime | chromium → PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl openssl chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV CHROMIUM_PATH=/usr/bin/chromium
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV PRISMA_ENGINES_MIRROR="https://registry.npmmirror.com/-/binary/prisma"

# Pruned node_modules (devDeps stripped by npm prune in builder)
COPY --from=builder /app/node_modules          ./node_modules
COPY --from=builder /app/packages              ./packages

# Compiled NestJS output
# COPY source: builder:/app/apps/api/dist  (contains apps/api/src/main.js)
# Container path after copy: /app/dist/apps/api/src/main.js
COPY --from=builder /app/apps/api/dist         ./dist

# Prisma schema + migrations for runtime migrate deploy
COPY --from=builder /app/apps/api/prisma       ./prisma

# package.json for Prisma CLI schema resolution
COPY --from=builder /app/apps/api/package.json ./package.json

EXPOSE 4000

# Boot sequence:
#   1. prisma migrate deploy — applies pending migrations (idempotent)
#   2. node dist/apps/api/src/main — starts the compiled NestJS server
#
# Entry path explanation:
#   tsconfig paths alias (@logirest/shared-types → ../../packages/...)
#   forces tsc rootDir to monorepo root, producing:
#   apps/api/dist/apps/api/src/main.js  (confirmed by nest-cli.json entryFile)
CMD ["sh", "-c", \
  "if [ -z \"$DIRECT_URL\" ]; then export DIRECT_URL=\"$DATABASE_URL\"; fi \
   && ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma \
   && node dist/apps/api/src/main"]
