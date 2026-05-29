# System & Data Schema: Phase 0 — Pre-Deploy Blockers

**Branch**: `038-phase0-pre-deploy-blockers` | **Date**: 2026-05-29

This document details the configuration models, Zod validation schemas, Docker configurations, and transactional states required to fulfill the Phase 0 hardening requirements.

---

## 1. Environment Variable Validation Schema (Zod)
Location: `apps/api/src/config/env.validation.ts`

```typescript
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.coerce.number().default(4000),
  
  // Database configuration
  DATABASE_URL: z.string().url().refine(
    (url) => {
      if (process.env.NODE_ENV === 'production') {
        const hasLockTimeout = url.includes('lock_timeout=') || url.includes('lock_timeout%3D');
        const hasConnectTimeout = url.includes('connect_timeout=') || url.includes('connect_timeout%3D');
        return hasLockTimeout && hasConnectTimeout;
      }
      return true;
    },
    { message: 'DATABASE_URL in production MUST include explicit lock_timeout and connect_timeout parameters.' }
  ),

  // Security Secrets
  JWT_ACCESS_SECRET: z.string().min(32).refine(
    (val) => {
      if (process.env.NODE_ENV === 'production') {
        const KNOWN_DEFAULTS = [
          'dev-jwt-access-secret-key-at-least-32-chars-long',
          'dev-jwt-refresh-secret-key-at-least-32-chars-long',
        ];
        return !KNOWN_DEFAULTS.includes(val);
      }
      return true;
    },
    { message: 'JWT_ACCESS_SECRET must not use the default development value in production.' }
  ),

  JWT_REFRESH_SECRET: z.string().min(32).refine(
    (val) => {
      if (process.env.NODE_ENV === 'production') {
        const KNOWN_DEFAULTS = [
          'dev-jwt-refresh-secret-key-at-least-32-chars-long',
          'dev-jwt-access-secret-key-at-least-32-chars-long',
        ];
        return !KNOWN_DEFAULTS.includes(val);
      }
      return true;
    },
    { message: 'JWT_REFRESH_SECRET must not use the default development value in production.' }
  ),
});

export type EnvironmentConfig = z.infer<typeof envSchema>;
```

---

## 2. Docker Compose System Layout
Location: `docker-compose.yml`

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: logirest-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-logirest}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
      POSTGRES_DB: ${DB_NAME:-logirest}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER:-logirest} -d $${POSTGRES_DB:-logirest}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: logirest-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: logirest-api
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      DATABASE_URL: postgresql://${DB_USER:-logirest}:${DB_PASSWORD:-password}@db:5432/${DB_NAME:-logirest}?lock_timeout=5000&connect_timeout=10
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:4000/api/v1/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    container_name: logirest-web
    restart: unless-stopped
    depends_on:
      api:
        condition: service_healthy
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      API_URL: http://api:4000/api/v1
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 20s

  caddy:
    image: caddy:2-alpine
    container_name: logirest-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      api:
        condition: service_healthy
      web:
        condition: service_healthy

volumes:
  pgdata:
  redisdata:
  caddy_data:
  caddy_config:
```

---

## 3. Transaction State Model (Atomic Token Rotation)

```
        +-----------------------------------------------------------+
        |                 Interactive Transaction                   |
        |              prisma.$transaction(async (tx) => {          |
        +-----------------------------------------------------------+
                                      |
                                      v
       [Step 1: Revoke Existing Token (Optimistic version lock check)]
               UPDATE RefreshToken
               SET isRevoked = true, version = version + 1
               WHERE id = existingToken.id AND version = existingToken.version
                                      |
                     +----------------+----------------+
                     |                                 |
                     v (Match found)                   v (Version mismatch)
               [Rows Affected = 1]               [Rows Affected = 0]
                     |                                 |
                     v                                 v
        [Step 2: Create New Token]           [Transaction Rollback]
               INSERT RefreshToken           Throw VersionConflictException
               tokenHash = newHash           Original token remains VALID
               expiresAt = NOW + 7 days
                     |
                     v
             [Commit Transaction]
```
