# Tasks: Sprint 1 Production Readiness Remediation

**Input**: Design documents from `/specs/031-sprint-1-remediation/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/endpoints.md

**Tests**: Unit tests, E2E integrations, and database integrity validation suites are requested as part of the strict Quality Gates.

**Organization**: Tasks are grouped strictly by setup, foundations, and individual user story phases to support modular, incremental verification.

---

## Format: `[ID] [P?] [Story] Description`

* **`[P]`**: Task is parallelizable (different files, no blocking dependencies).
* **`[Story]`**: Indicates which user story the task serves (e.g. `[US1]`, `[US2]`, etc.).
* File paths are explicitly mentioned for every target action.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: monorepo alignment, environment variable setups, and boundary validations.

- [ ] T001 Configure local Redis connectivity keys inside `apps/api/.env` and `apps/api/.env.example`
- [ ] T002 Verify that `@logirest/shared-types` compiles cleanly inside the `packages/shared-types` workspace

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema modifications, database integrity validations, and state machine transition mapping.

**⚠️ CRITICAL**: All foundational tasks MUST be completed before starting any user story implementations.

- [ ] T003 [P] Create PostgreSQL database-level `CHECK` DDL migration in a new file under `apps/api/prisma/migrations/` for non-negative quantities and valid outbox status enums
- [ ] T004 Apply DDL check constraints to the local PostgreSQL database using `npx prisma migrate dev`
- [ ] T005 Update `DocumentSequence` schema model in `apps/api/prisma/schema.prisma` with `@@unique([documentType, year, branchId])`
- [ ] T006 Add `lotDiscrepanciesFound` integer count to `ReconciliationRun` model in `apps/api/prisma/schema.prisma`
- [ ] T007 Expose `CANCELLED` and `VOIDED` state machine transition types and mappings in `packages/shared-types/src/index.ts`
- [ ] T008 [P] Compile the monorepo using `npm run build` to verify Prisma types generation and packages compilation

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Transactional Voiding State Machine (Priority: P1) 🎯 MVP

**Goal**: Implement safe, rule-governed rollback/void capabilities for posted GRNs, Issues, and Adjustments, protecting the database from negative inventory imbalances (Option A).

**Independent Test**: Execute `npx jest test/void-workflow.e2e-spec.ts` verifying that GRN void attempts are successfully blocked if downstream consumption has occurred, and that correct ledger offsets are committed when safe.

### Tests for User Story 1 (TDD)
- [ ] T009 [P] [US1] Create unit tests for Option A negative stock checking inside `apps/api/src/modules/operations/__tests__/grn-void.service.spec.ts`
- [ ] T010 [P] [US1] Create unit tests for Issue reversals inside `apps/api/src/modules/operations/__tests__/issue-void.service.spec.ts`
- [ ] T011 [P] [US1] Create unit tests for Adjustment reversals inside `apps/api/src/modules/operations/__tests__/adjustment-void.service.spec.ts`

### Implementation for User Story 1
- [ ] T012 [US1] Implement `GrnVoidService` in `apps/api/src/modules/operations/grn-void.service.ts` checking for available stock and throwing a validation error on negative inventory (Option A)
- [ ] T013 [US1] Implement chronological WAC recalculation logic inside `GrnVoidService` subtracting the original cost layer
- [ ] T014 [US1] Implement `IssueVoidService` in `apps/api/src/modules/operations/issue-void.service.ts` restoring stock quantities and WAC layers
- [ ] T015 [US1] Implement `AdjustmentVoidService` in `apps/api/src/modules/operations/adjustment-void.service.ts` to reverse stock additions/reductions and update costs
- [ ] T016 [US1] Wire void services to new Admin-only endpoints `POST /operations/:documentType/:id/void` in `apps/api/src/modules/operations/operations.controller.ts`
- [ ] T017 [US1] Enforce cost required validation `@IsPositive()` on positive Adjustment IN lines in DTO and `AdjustmentPostService`
- [ ] T018 [US1] Create transaction-level E2E integration tests in `apps/api/test/void-workflow.e2e-spec.ts`

**Checkpoint**: At this point, posted transaction reversals are fully functional, safe, and testable independently.

---

## Phase 4: User Story 2 - Interactive Reports Hub & Drill-downs (Priority: P1)

**Goal**: Build RTL-compliant, high-density WAC History and Lot Trace reports grids in the web dashboard supporting clickable hyperlinked trace lines.

**Independent Test**: Navigate to reports, load WAC or Lot trace grid, click document references, confirm immediate navigation to transaction pages.

### Implementation for User Story 2
- [ ] T019 [P] [US2] Create Wac History interactive report table in `apps/web/src/features/reports/components/WacHistoryReport.tsx` with hyperlinked document references
- [ ] T020 [P] [US2] Create Lot Trace interactive report table in `apps/web/src/features/reports/components/LotTraceReport.tsx` with hyperlinked allocation document details
- [ ] T021 [US2] Style and translate report components utilizing the dark Nocturne aesthetic with RTL support inside `apps/web/src/app/[locale]/(app)/reports/`

**Checkpoint**: Both reports are fully navigable and integrated in the dashboard client.

---

## Phase 5: User Story 3 - Proactive Export Guard & Reports Refactor (Priority: P2)

**Goal**: Extract database query queries into a clean ReportsService, paginate results safely, and block exports exceeding 50,000 records dynamically in the UI.

**Independent Test**: Verify that broad queries yielding >50k rows disable the export button and show warning panels proactively.

### Tests for User Story 3
- [ ] T022 [P] [US3] Write report service query and pagination unit tests in `apps/api/src/modules/reports/__tests__/reports.service.spec.ts`

### Implementation for User Story 3
- [ ] T023 [P] [US3] Create `reports.service.ts` in `apps/api/src/modules/reports/reports.service.ts` and extract SQL/Prisma query logic from controller
- [ ] T024 [US3] Implement fast metadata count endpoint `GET /reports/count` and cursor-based pagination (chunks of 1,000) for `GET /reports/export` in `ReportsController`
- [ ] T025 [US3] Enforce `MAX_EXPORT_ROWS = 50000` limit check in `reports.service.ts` throwing `413 Payload Too Large` error
- [ ] T026 [US3] Update frontend client export trigger in `apps/web/src/features/reports/api/reportsApi.ts` to check total counts first
- [ ] T027 [US3] Proactively disable the Export Button in the Reports Hub UI and render the warnings panel when total counts exceed 50,000 rows

**Checkpoint**: Reports extraction is memory-safe on the server and proactively guarded in the UI.

---

## Phase 6: User Story 4 - Resilient Debouncing & System Notifications (Priority: P2)

**Goal**: Implement Redis-based debounce key persistence and `TRANSFER_RECEIVED` notification logging.

**Independent Test**: Restart the API server and verify that low-stock alert debounces remain maintained in Redis cache, and receive transfers verifying `NotificationLog` entries.

### Implementation for User Story 4
- [ ] T028 [P] [US4] Inject Redis ioredis client into `LowStockAlertJob` in `apps/api/src/jobs/low-stock-alert.job.ts`
- [ ] T029 [US4] Replace in-memory Alert Debounce registry map with Redis String caching using `low_stock_debounce:{warehouseId}:{itemId}` with 24-hour TTL
- [ ] T030 [US4] Implement `TRANSFER_RECEIVED` NotificationLog entry inside backend `executeTransition()` method targeting Admin and Warehouse Manager roles in `apps/api/src/modules/workflow/workflow.service.ts`
- [ ] T031 [US4] Integrate daily Lot-Level drift checks comparing lot ledger totals against `warehouse_item_lots` within `apps/api/src/modules/ledger/reconciliation.job.ts` with ADMIN notifications

**Checkpoint**: System alerts and notification logs survive restarts and maintain state integrity.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Rate-limiting alignments, system pings, and final monorepo validations.

- [ ] T032 Adjust rate limiting in `apps/api/src/app.module.ts` setting general API limit to 100 req/60s and auth login routes to strict 10 req/60s
- [ ] T033 Add Redis/BullMQ connection check to health diagnostics controller in `apps/api/src/health/health.controller.ts`
- [ ] T034 [P] Run comprehensive monorepo verification check scripts and audit compilation tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - starts immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User Story 1 (P1) and User Story 2 (P1) can proceed in parallel once foundational constraints are applied.
  - User Story 3 (P2) can proceed once User Story 2 is functional.
- **Polish (Phase 7)**: Depends on all user stories being complete.

### Parallel Opportunities

- Foundational tasks `T003` and `T007` can run in parallel.
- Unit tests `T009`, `T010`, `T011` can be written in parallel by different team members.
- Reports creation `T019` and `T020` can run in parallel.
- Redis alert integration `T028` and count API extraction `T023` can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Launch writing of all TDD unit tests for Void operations in parallel:
Task: "T009 [P] [US1] Create unit tests for Option A negative stock checking..."
Task: "T010 [P] [US1] Create unit tests for Issue reversals..."
Task: "T011 [P] [US1] Create unit tests for Adjustment reversals..."
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL - blocks all ledger actions).
3. Complete Phase 3: User Story 1 (VOID State Machine).
4. **STOP and VALIDATE**: Execute the local e2e void integration tests.
5. Deploy and demo reversing transactions.

### Incremental Delivery

1. Setup + Foundational Schema updates applied -> Core readiness accomplished.
2. Implement User Story 1 & 2 -> Clickable reversals and interactive trace reports delivered (MVP!).
3. Implement User Story 3 -> Memory-safe report paginations and proactive UI guards operational.
4. Implement User Story 4 -> Caching robustness and notification logging complete.
5. Finalize Phase 7 -> Rate limits and health pings polished.
