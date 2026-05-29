# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy workspace dependencies
COPY package*.json turbo.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/

# Install dependencies and build Next.js Standalone
RUN npm ci --workspace=apps/web
RUN npm run build --workspace=apps/web

# Stage 2: Production Runner
FROM node:20-alpine AS production
RUN apk add --no-cache curl
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
