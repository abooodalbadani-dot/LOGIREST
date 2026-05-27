# Phase 1 Quickstart: Sprint 3 Verification & Commands

This guide provides the standard shell commands and procedures to run, build, and verify the Sprint 3 changes locally.

---

## 1. Local Development Setup

Ensure you have your environment variables set correctly inside `apps/api/.env` and `apps/web/.env`.

### Start the NestJS Backend:
```bash
npm run dev --filter=api
```

### Start the Next.js Frontend:
```bash
npm run dev --filter=web
```

---

## 2. Database Migrations

Sprint 3 introduces a composite unique constraint on `document_sequences`. Apply schema migrations using Prisma:

```bash
# Generate and apply migration locally
npx prisma migrate dev --name add_document_sequence_unique_constraint
```

---

## 3. Linting & Compilation Verification

After completing changes, verify the codebase compiles and passes strict typing and formatting gates:

### Backend Build and Type Check:
```bash
npm run build --filter=api
```

### Frontend Type Check:
```bash
npm run typecheck --filter=web
```

### Monorepo-wide Linting:
```bash
npm run lint
```

---

## 4. Test Suite Execution

Run Jest unit and E2E tests to verify code compliance:

### Run Void service test suites:
```bash
npm run test --filter grn-void
```

### Run all backend API unit/integration tests:
```bash
npm run test --workspace=apps/api
```

### Run backend E2E tests:
```bash
npm run test:e2e --workspace=apps/api
```
