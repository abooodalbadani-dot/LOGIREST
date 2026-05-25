# Sprint 1 Quickstart Guide

This document provides step-by-step instructions to get started with executing the Sprint 1 Production Readiness implementations.

---

## 1. Prerequisites & Dev Setup

### 1.1 Terminal Layout & Environment
Ensure you have the following terminal windows actively running in your workspace:
* **API Server (NestJS)**:
  ```bash
  npm run start:dev --workspace=apps/api
  ```
* **Web Client (Next.js)**:
  ```bash
  npm run dev --workspace=apps/web
  ```

### 1.2 Database Migrations & Seeds
Apply local migrations to ensure all database-level `CHECK` constraints and `DocumentSequence` unique composite keys are synchronized:

```bash
# Apply Prisma schema and check migrations
npx prisma migrate dev --name init_sprint1_readiness

# Force local seed sync
npx prisma db seed
```

---

## 2. Sprint 1 Verification Plan

To verify that your Sprint 1 implementations are correct and do not introduce regressions, run the following commands sequentially:

### 2.1 Automated Tests

* **Security, Linting & Type Safety Verification**:
  ```bash
  # Check backend TypeScript compilation and lint
  npm run lint --workspace=apps/api
  npm run build --workspace=apps/api

  # Verify shared-types compile successfully
  npm run build --workspace=packages/shared-types

  # Run type checking on Next.js frontend
  npx tsc --noEmit --project apps/web/tsconfig.json
  ```

* **Core Unit Tests**:
  Run specific unit tests targeting the new modules:
  ```bash
  # Run reconciliation job lot-level tests
  npm run test --workspace=apps/api -- ledger/reconciliation.job.spec.ts

  # Run WAC and Void transaction service tests
  npm run test --workspace=apps/api -- operations/grn-void.service.spec.ts
  npm run test --workspace=apps/api -- operations/issue-void.service.spec.ts
  npm run test --workspace=apps/api -- operations/adjustment-void.service.spec.ts

  # Run reports service extraction tests
  npm run test --workspace=apps/api -- reports/reports.service.spec.ts
  ```

* **Integration & E2E Verification**:
  Execute custom test suites to simulate concurrent conditions and database integrity errors:
  ```bash
  # Verify composite sequences concurrent assignments
  npm run test:e2e --workspace=apps/api -- test/document-sequence.e2e-spec.ts

  # Verify negative inventory DDL constraints block direct adjustments
  npm run test:e2e --workspace=apps/api -- test/db-integrity.e2e-spec.ts

  # Verify GRN void negative stock block & WAC recalculation
  npm run test:e2e --workspace=apps/api -- test/void-workflow.e2e-spec.ts
  ```

---

## 3. Manual QA Walkthrough (Step-by-Step)

1. **Verify Proactive Export Block**:
   - Navigate to the Reports Hub in the browser (`http://localhost:3000/reports`).
   - Choose the Movements report with extremely broad date ranges (yielding > 50,000 matches).
   - Confirm that the "Export to Excel" button is disabled and shows the proactive warning panel.
   - Narrow down the date range filter to yield < 50,000 records. Confirm that the export button becomes active and successful chunked download completes.
2. **Verify Void posted GRN (Option A Check)**:
   - Create a GRN for 10 eggs and post it.
   - Go to a Stock Issue form, issue 4 eggs from that batch.
   - Attempt to Void the GRN from the Admin detail view. Verify that the UI displays the message `"Cannot void GRN: 4 units have already been consumed. Please reverse downstream issues first."`
   - Go and void/cancel the Stock Issue.
   - Re-attempt to Void the GRN. Verify that the void completes successfully, WAC returns to its original baseline, and both Stock and Cost ledgers reflect net zero balances.
3. **Verify Scanner Rate Limits**:
   - Perform a rapid mock barcode wedge scan sweep of 30 items. Confirm that the operations are not rate-limited.
   - Attempt to brute-force a login endpoint 12 times inside 60 seconds and verify that the auth-specific throttler blocks the request.
