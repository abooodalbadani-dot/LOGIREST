# Stage 1: Builder
FROM node:24-slim AS builder
RUN rm -f /usr/local/bin/yarn /usr/local/bin/yarnpkg
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy workspace dependencies
COPY package*.json turbo.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/

# Install dependencies and build Next.js Standalone
#RUN npm ci --workspace=apps/web
RUN --mount=type=cache,target=/root/.npm \
    npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci --workspace=apps/web
ENV EXPERIMENTAL_CPUS=1
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build --workspace=apps/web

# Stage 2: Production Runner
FROM node:24-slim AS production
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

ENV NODE_ENV=production

# Copy next standalone build and static assets
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "apps/web/server.js"]
