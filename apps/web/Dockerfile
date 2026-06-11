# Stage 1: Builder
FROM node:20-slim AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy workspace dependencies
COPY package*.json turbo.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/

# Install dependencies and build Next.js Standalone
RUN npm ci --workspace=apps/web
ENV EXPERIMENTAL_CPUS=1
RUN npm run build --workspace=apps/web

# Stage 2: Production Runner
FROM node:20-slim AS production
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
