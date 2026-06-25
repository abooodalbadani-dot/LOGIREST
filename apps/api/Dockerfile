# =============================================================================
# LogiRest API — NestJS 11 Production Dockerfile
# =============================================================================
# Build: docker build -t logirest-api .
# Requires BuildKit: DOCKER_BUILDKIT=1 (default in Docker 23+)
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

# Set Prisma binary mirror (npmmirror is a reliable global CDN)
ENV PRISMA_ENGINES_MIRROR="https://registry.npmmirror.com/-/binary/prisma"

# Copy dependency manifests first to maximise layer cache reuse
COPY package*.json turbo.json tsconfig.base.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/api/package*.json                ./apps/api/

# Install ALL dependencies (devDeps needed for nest build / prisma generate)
# BuildKit npm cache mount avoids re-downloading on every build
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=apps/api --include-workspace-root \
        --no-audit --no-fund

# Copy source after install to avoid invalidating the install cache layer
COPY packages/ packages/
COPY apps/api/ apps/api/

# Generate the Prisma Client (requires openssl, must run before nest build)
# outDir is apps/api/dist per tsconfig.json outDir: ./dist
RUN ./node_modules/.bin/prisma generate --schema=apps/api/prisma/schema.prisma

# Compile TypeScript → dist/
# nest-cli.json: sourceRoot=src, outDir=./dist (apps/api/dist/src/...)
RUN npm run build --workspace=apps/api

# ─────────────────────────────────────────────────
# Stage 2: Production deps (no devDependencies)
# ─────────────────────────────────────────────────
FROM node:24-slim AS prod-deps

RUN rm -f /usr/local/bin/yarn /usr/local/bin/yarnpkg

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PRISMA_ENGINES_MIRROR="https://registry.npmmirror.com/-/binary/prisma"

COPY package*.json turbo.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/api/package*.json               ./apps/api/

RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=apps/api --include-workspace-root \
        --omit=dev --no-audit --no-fund

COPY packages/ packages/
COPY apps/api/prisma/ apps/api/prisma/

# Re-generate Prisma Client against the production (prod-only) node_modules
RUN ./node_modules/.bin/prisma generate --schema=apps/api/prisma/schema.prisma

# ─────────────────────────────────────────────────
# Stage 3: Production Runner (minimal image)
# ─────────────────────────────────────────────────
FROM node:24-slim AS production

# curl for Docker healthcheck; openssl for Prisma runtime; chromium for PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl openssl chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV CHROMIUM_PATH=/usr/bin/chromium
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Production node_modules (devDeps stripped) from prod-deps stage
COPY --from=prod-deps /app/node_modules          ./node_modules
COPY --from=prod-deps /app/packages              ./packages

# Compiled application output
# tsconfig outDir: ./dist (relative to apps/api) → builder produces apps/api/dist/
# Copied to ./dist in the container; entrypoint: dist/src/main.js
COPY --from=builder /app/apps/api/dist           ./dist

# Prisma schema + migrations needed by `prisma migrate deploy` at container start
COPY --from=prod-deps /app/apps/api/prisma       ./prisma

# package.json needed so Prisma CLI can resolve the schema path via npm scripts
COPY --from=builder /app/apps/api/package.json   ./package.json

EXPOSE 4000

# Boot sequence:
#   1. prisma migrate deploy — applies any pending migrations (idempotent, safe)
#   2. node dist/src/main   — starts the compiled NestJS server
#
# DIRECT_URL fallback: some cloud DBs require a direct (non-pooled) connection
# for migrations. If not set, fall back to DATABASE_URL.
CMD ["sh", "-c", \
  "if [ -z \"$DIRECT_URL\" ]; then export DIRECT_URL=\"$DATABASE_URL\"; fi \
   && ./node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma \
   && node dist/apps/api/src/main"]

