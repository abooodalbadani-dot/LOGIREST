# Developer Quickstart: LogiRest Phase 1 — Master Issue Registry

This document outlines the validation scripts, testing workflows, and local verification commands for this phase.

---

## 1. Local Development Setup

To boot the local development environment:

```bash
# Install dependencies (monorepo root)
npm install

# Start local database and Redis services
docker compose up -d db redis

# Run Prisma migrations
npx prisma migrate dev --schema=apps/api/prisma/schema.prisma

# Seed initial database
npx prisma db seed --schema=apps/api/prisma/schema.prisma

# Boot frontend and backend api in dev mode
npm run dev
```

---

## 2. Validation & Quality Checks

Run these validations during development and prior to merge requests:

### Build validation
```bash
# Verify NestJS backend API builds successfully
npx turbo run build --filter=api

# Verify Next.js frontend builds successfully
npx turbo run build --filter=web
```

### Type checking
```bash
# Run TypeScript compilation checks across the monorepo
npm run typecheck
```

### Code linting
```bash
# Run linting across the monorepo
npm run lint
```

### Execution of Tests
```bash
# Run backend test suite
npx turbo run test --filter=api

# Run frontend unit/integration test suite
npx turbo run test --filter=web
```
