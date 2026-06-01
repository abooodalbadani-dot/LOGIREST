# Quickstart & Verification Guide

This document describes how to execute local build, typecheck, lint, and testing commands to verify the correctness of the Sprint 1 stabilization changes.

---

## 🚀 Environment Setup & Setup

Before running tests, ensure dependencies are fully installed and the database schema is up-to-date:

```bash
# Clean install monorepo dependencies
npm install

# Force-reset database and run migrations
npx prisma migrate reset --force --schema=apps/api/prisma/schema.prisma
```

---

## 🛠️ Verification & Compilation Gates

LogiRest enforces strict compilation-safe checks. Every change must pass the following commands before staging:

### 1. Build Verification
Verify that both backend and frontend applications compile cleanly:
```bash
# Build the entire monorepo
npm run build

# Build NestJS API only
npx turbo run build --filter=api
```

### 2. Typecheck Verification
Verify that TypeScript type contracts remain unbroken:
```bash
# Run typechecking across the monorepo
npm run typecheck
```

### 3. Lint Verification
Verify code style adherence:
```bash
# Run code linters
npm run lint
```

---

## 🧪 Running Target Tests

We verify Sprint 1 fixes using Jest test suites:

### 1. Workflow state guard tests
```bash
npx turbo run test --filter=api -- apps/api/src/guards/workflow-state.guard.spec.ts
```

### 2. Kitchen Request void stock leak tests
```bash
npx turbo run test --filter=api -- apps/api/src/modules/operations/kitchen-request-void.service.spec.ts
```

### 3. Workflow action state lock tests
```bash
npx turbo run test --filter=api -- packages/shared-types/src/workflow/document-engine.spec.ts
```

### 4. Controller PUT/DELETE scope verification tests
```bash
npx turbo run test --filter=api -- apps/api/src/modules/purchasing/purchase-orders/po.controller.spec.ts
```
