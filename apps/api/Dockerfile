# Stage 1: Builder
FROM node:24-slim AS builder
RUN rm -f /usr/local/bin/yarn /usr/local/bin/yarnpkg
RUN apt-get update && apt-get install -y --no-install-recommends openssl chromium
WORKDIR /app

# Copy root configurations and workspaces bootstrap
COPY package*.json turbo.json tsconfig.base.json ./
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

# Set NPM registry mirror
RUN npm config set registry https://registry.npmmirror.com/

# Set Prisma mirror to bypass connection drops
ENV PRISMA_ENGINES_MIRROR="https://registry.npmmirror.com/-/binary/prisma"

# Install dependencies (hoisted to root node_modules)
RUN --mount=type=cache,target=/root/.npm \
    npm install --workspace=apps/api --no-audit --no-fund --legacy-peer-deps

# Explicit Playwright Chromium Installation
RUN npx playwright install --with-deps chromium

# Copy the rest of the source code
COPY packages/ packages/
COPY apps/api/ apps/api/

# Generate Prisma Client using the local binary
RUN ./node_modules/.bin/prisma generate --schema=apps/api/prisma/schema.prisma
RUN DATABASE_URL=postgresql://localhost:5432 DIRECT_URL=postgresql://localhost:5432 ./node_modules/.bin/prisma migrate status --schema=apps/api/prisma/schema.prisma || true

# Build the api
RUN npm run build --workspace=apps/api


# Stage 2: Production Runner
FROM node:24-slim AS production
RUN apt-get update && apt-get install -y --no-install-recommends curl chromium && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production
ENV CHROMIUM_PATH=/usr/bin/chromium

# Copy compiled source files (NestJS is compiled to dist/apps/api/src/main.js)
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
# Copy root node_modules for hoisted dependencies
COPY --from=builder /app/node_modules ./node_modules
# Copy package.json to run prisma scripts
COPY --from=builder /app/apps/api/package.json ./package.json

EXPOSE 4000

CMD ["sh", "-c", "if [ -z \"$DIRECT_URL\" ]; then export DIRECT_URL=\"$DATABASE_URL\"; echo \"DIRECT_URL not set, falling back to DATABASE_URL\"; fi && ./node_modules/.bin/prisma migrate deploy && node dist/apps/api/src/main"]
