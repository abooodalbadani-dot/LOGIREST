# Tasks: Sprint 3 Remediation and System Hardening

**Input**: Design documents from `/specs/036-sprint-3-remediation/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project dependency verification and base configuration updates.

- [x] T001 Verify `exceljs` and NestJS `throttler` package dependencies exist in `apps/api/package.json`
- [x] T002 Verify `react-query` package dependencies exist in `apps/web/package.json`
- [x] T003 [P] Verify monorepo building and typescript compiling via `npm run build` at repository root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema migrations and performance optimizations that MUST be completed before story implementations.

- [x] T004 Add a composite unique index `@@unique([documentType, year, branchId])` to the `DocumentSequence` model in `apps/api/prisma/schema.prisma`
- [x] T005 Run schema migration command `npx prisma migrate dev --name add_document_sequence_unique_constraint` to update the database schema
- [x] T006 [P] Optimize WAC consistency N+1 checks in `apps/api/src/jobs/wac-consistency.job.ts` by replacing `costLedger.findFirst()` query loop with a single raw query using `SELECT DISTINCT ON` SQL statement
- [x] T007 Ensure `MetricsService` and `PrismaService` are injected and operational in `apps/api/src/modules/ledger/reconciliation.job.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Visual Cost Timeline & Lot Traceability (Priority: P1) 🎯 MVP

**Goal**: Enable managers and auditors to visually trace chronological cost changes and lot movements via the Reports Hub.

**Independent Test**: Navigate to the Reports Hub screen in the frontend, check new visual links are present, select parameters (item, warehouse, lot), and verify the timeline list matches backend ledger aggregates.

### Tests for User Story 1
- [x] T008 [P] [US1] Create unit tests in `apps/api/src/modules/reports/reports.controller.spec.ts` for cost history and lot trace routes
- [x] T009 [P] [US1] Create unit tests in `apps/api/src/jobs/wac-consistency.job.spec.ts` to verify optimized WAC consistency cron runs successfully

### Implementation for User Story 1
- [x] T010 [P] [US1] Add REST API endpoints `/reports/wac-history` and `/reports/lot-trace` inside `apps/api/src/modules/reports/reports.controller.ts`
- [x] T011 [P] [US1] Create react-query hook `useWacHistory` in `apps/web/src/features/reports/hooks/useWacHistory.ts`
- [x] T012 [P] [US1] Create react-query hook `useLotTrace` in `apps/web/src/features/reports/hooks/useLotTrace.ts`
- [x] T013 [P] [US1] Create visual timeline view page in `apps/web/src/app/[locale]/(app)/reports/wac-history/page.tsx`
- [x] T014 [P] [US1] Create visual lot traceability movement log page in `apps/web/src/app/[locale]/(app)/reports/lot-trace/page.tsx`
- [x] T015 [US1] Wire WAC Cost History and Lot Trace cards into Reports Hub layout inside `apps/web/src/app/[locale]/(app)/reports/ReportsHubClient.tsx`

**Checkpoint**: User Story 1 (Reports hub views) is fully functional and independently testable.

---

## Phase 4: User Story 2 - Progressive Branded report exports (Priority: P1)

**Goal**: Support massive sheet exports (100k+ rows) using memory-safe progressive streaming and Settings-based branding headers.

**Independent Test**: Trigger a stock movements export of 100,000+ records, verify progressive download, and inspect that the spreadsheet contains dynamic system and branch branding headers.

### Implementation for User Story 2
- [x] T016 [US2] Modify export controller route `GET /reports/stock-movements/export` in `apps/api/src/modules/reports/reports.controller.ts` to progressively stream data via `ExcelJS.stream.xlsx.WorkbookWriter` using cursor pagination (500 records/chunk)
- [x] T017 [US2] Integrate dynamic setting lookup inside the progressive Excel generator in `apps/api/src/modules/reports/reports.controller.ts` to insert the system name and branch branding rows at the top of the spreadsheet

**Checkpoint**: User Story 2 is fully functional and independently testable.

---

## Phase 5: User Story 3 - Cost Accuracy & Void security safeguards (Priority: P2)

**Goal**: Secure system operations by restricting voids to Admin/Manager roles at the core service level, enforcing WAC fallbacks on manual stock entries, and preventing duplicate sequence numbers.

**Independent Test**: Try voiding a document using a non-manager role (must fail at the service level), verify Adjustment IN automatically sets WAC costs when missing, and run concurrency tests to verify sequence uniqueness.

### Tests for User Story 3
- [x] T018 [P] [US3] Create E2E tests in `apps/api/test/void-workflow.e2e-spec.ts` checking role authorization and status guards for GRN, Transfer, Adjustment, and Kitchen Request voids
- [x] T019 [P] [US3] Create E2E test in `apps/api/test/wac-accuracy.e2e-spec.ts` checking accurate WAC calculation and void recalculation across document workflows
- [x] T020 [P] [US3] Create concurrency E2E test in `apps/api/test/document-numbering.e2e-spec.ts` creating 20 concurrent documents to verify unique numbering safety
- [x] T021 [P] [US3] Create unit tests in `apps/api/src/modules/operations/grn-void.service.spec.ts` (and other 4 void service spec files) to verify service-level authorization blocks

### Implementation for User Story 3
- [x] T022 [P] [US3] Implement service-layer role authorization checks directly inside void method execution in `apps/api/src/modules/operations/grn-void.service.ts`
- [x] T023 [P] [US3] Implement service-layer role authorization checks directly inside void method execution in `apps/api/src/modules/operations/transfer-void.service.ts`
- [x] T024 [P] [US3] Implement service-layer role authorization checks directly inside void method execution in `apps/api/src/modules/operations/issue-void.service.ts`
- [x] T025 [P] [US3] Implement service-layer role authorization checks directly inside void method execution in `apps/api/src/modules/operations/adjustment-void.service.ts`
- [x] T026 [P] [US3] Implement service-layer role authorization checks directly inside void method execution in `apps/api/src/modules/operations/kitchen-request-void.service.ts`
- [x] T027 [US3] Implement WAC fallback and validation check for manual `ADJUSTMENT_IN` with missing unit cost inside `apps/api/src/modules/operations/adjustment-post.service.ts`

**Checkpoint**: User Story 3 is fully functional and independently testable.

---

## Phase 6: User Story 4 - Automated Lot Drift check (Priority: P2)

**Goal**: Continuously monitor lot balances against stock ledger aggregates and raise discrepancy metrics to the Prometheus reporting server.

**Independent Test**: Artificially create a lot balance mismatch in the database, execute the reconciliation job, verify lot is frozen/logged, and verify `/metrics` count increments.

### Tests for User Story 4
- [x] T028 [P] [US4] Create E2E test in `apps/api/test/reconciliation.e2e-spec.ts` asserting drift detection and discrepancy counter incrementing
- [x] T029 [P] [US4] Create unit test in `apps/api/src/jobs/expiry-alert.job.spec.ts` verifying expiry alerts outbox events dispatching

### Implementation for User Story 4
- [x] T030 [US4] Implement a lot-level drift aggregation loop in `apps/api/src/modules/ledger/reconciliation.job.ts` comparing `WarehouseItemLot` with aggregated `StockLedger` balances
- [x] T031 [US4] Wire `metricsService.reconciliationDiscrepanciesCounter.inc()` inside both item and lot discrepancy blocks in `apps/api/src/modules/ledger/reconciliation.job.ts`
- [x] T032 [US4] Ensure the discrepancy counter is registered and accessible via backend metrics in `apps/api/src/modules/admin/admin.service.ts`

**Checkpoint**: User Story 4 is fully functional and independently testable.

---

## Phase 7: User Story 5 - Handheld Scanner Throttler overrides (Priority: P3)

**Goal**: Exempt barcode-heavy item scanning and bulk document posting routes from global rate limiters.

**Independent Test**: Send 60 requests within one minute on line-scanning endpoints and verify they succeed smoothly while standard browsing remains restricted.

### Implementation for User Story 5
- [x] T033 [US5] Add `@Throttle()` rate limit decorators to scanning endpoints inside `apps/api/src/modules/purchasing/grn.controller.ts`
- [x] T034 [US5] Add `@Throttle()` rate limit decorators to multi-line posting endpoints in transfer and issue controllers inside `apps/api/src/modules/operations/` controllers

**Checkpoint**: User Story 5 is fully functional and independently testable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final formatting, system compilation, and build verification checks.

- [x] T035 [P] Run project lint audit globally to verify style compliance using `npm run lint`
- [x] T036 [P] Verify monorepo builds cleanly using `npm run build --filter=api` and Next.js compiler tests
- [x] T037 [P] Run the verification quickstart guide `quickstart.md` locally to close Sprint 3

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1. Database schema migration (T004, T005) must complete before any other database work. WAC query optimizations (T006) blocks visual cost reports (Phase 3).
- **User Story 1 (P1)**: Depends on Phase 2. Blocks report views.
- **User Story 2 (P1)**: Depends on Phase 2. Independent of other stories.
- **User Story 3 (P2)**: Depends on Phase 2 migration completion.
- **User Story 4 (P2)**: Depends on Phase 2 metrics injection verification.
- **User Story 5 (P3)**: Depends on Phase 2.
- **Polish (Phase 8)**: Depends on all user story task completions.

---

## Parallel Opportunities

* Setup tasks `T001`, `T002`, `T003` can run in parallel.
* Schema adjustments (`T004`, `T005`) and WAC query optimizations (`T006`) can run in parallel.
* Test suites `T018`, `T019`, `T020`, `T021` can be authored concurrently by different sub-agents.
* Backend service adjustments (`T022`, `T023`, `T024`, `T025`, `T026`) are independent and can be implemented in parallel.
* React-query hooks (`T011`, `T012`) and layout pages (`T013`, `T014`) can be authored concurrently.

---

## Parallel Example: User Story 3 Voids Security
```bash
# Author backend service voids role checks in parallel:
Task: "Implement service-layer role authorization checks directly inside void method execution in apps/api/src/modules/operations/grn-void.service.ts"
Task: "Implement service-layer role authorization checks directly inside void method execution in apps/api/src/modules/operations/transfer-void.service.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)
1. Complete Setup and Foundational constraints.
2. Complete User Story 1 (Visual timeline & trace pages).
3. Complete User Story 2 (Streaming XLSX downloads).
4. Run compilation audits and manually verify visual timelines.

### Incremental Delivery
1. Foundation complete (Migration + WAC O(2) query batching).
2. Visual cost reporting hub operational (MVP).
3. Progressive spreadsheet streaming operational.
4. Security & WAC Adjustment safeguards active.
5. Reconciliation drift tracking & Prometheus metrics configured.
6. Scanner throttler exclusions operational.
7. System-wide code lint and typechecks verified.
