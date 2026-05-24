# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root configurations and workspaces
COPY package*.json turbo.json tsconfig.base.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/

# Install dependencies and build NestJS API
RUN npm ci --workspace=apps/api
RUN npm run build --workspace=apps/api

# Stage 2: Production Runner
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Copy compiled source files (NestJS is compiled to dist/apps/api/src/main.js)
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
# Copy root node_modules for hoisted dependencies
COPY --from=builder /app/node_modules ./node_modules
# Copy package.json to run prisma scripts
COPY --from=builder /app/apps/api/package.json ./package.json

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/apps/api/src/main"]
