# Tasks: API Controllers (Phase 8)

**Input**: Design documents from `/specs/021-api-controllers/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Jest unit and integration tests are required for all controllers.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Paths assume NestJS backend located in `apps/api/` and shared packages in `packages/shared-types/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Verify shared package packages `@logirest/shared-types` are built and linked in `apps/api/package.json`
- [x] T002 Verify `apps/api` dependencies are fully bootstrapped and local build is clean

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core guards, interceptors, and services that MUST be verified before user stories are implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Verify `JwtAuthGuard` is registered and functional in `apps/api/src/modules/auth/`
- [x] T004 Verify scope authorization `ScopeInterceptor` and decorator `ActiveScope` are working in `apps/api/src/interceptors/` and `apps/api/src/decorators/`
- [x] T005 Verify document validation services `ConcurrencyService` and `WorkflowStateGuard` are correctly wired in `apps/api/src/services/` and `apps/api/src/guards/`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Secure Authentication & Scope Authorization (Priority: P1) 🎯 MVP

**Goal**: Implement login, logout, refresh, and profile endpoints with multi-tenant scope interceptor integration.

**Independent Test**: Send login request to generate JWT, request profile using active branch/warehouse headers, and verify that accessing data outside the scope is blocked.

### Tests for User Story 1

- [x] T006 [P] [US1] Write authentication endpoints unit tests in `apps/api/src/modules/auth/auth.controller.spec.ts`
- [x] T007 [P] [US1] Write integration tests for JWT strategy cookie-extraction in `apps/api/src/modules/auth/jwt.strategy.spec.ts`

### Implementation for User Story 1

- [x] T008 [P] [US1] Implement Auth Controller endpoint handler (login, logout, refresh, profile me) in `apps/api/src/modules/auth/auth.controller.ts`
- [x] T009 [US1] Bind JWT validation strategy and token extractor in `apps/api/src/modules/auth/jwt.strategy.ts`
- [x] T010 [US1] Apply `JwtAuthGuard` globally in `apps/api/src/app.module.ts` except for public endpoints

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Procurement Document Lifecycles: PR, PO, & GRN (Priority: P1)

**Goal**: Implement CRUD and action endpoints for Purchase Requests, Purchase Orders, and Goods Received Notes with workflow state machine guards.

**Independent Test**: Draft, submit, and approve a PR, convert it to PO, approve PO, create a GRN and post it, verifying that warehouse stock increases.

### Tests for User Story 2

- [x] T011 [P] [US2] Write PR, PO, and GRN controller unit tests in `apps/api/src/modules/purchasing/purchasing.controller.spec.ts`

### Implementation for User Story 2

- [x] T012 [P] [US2] Implement Purchase Request CRUD and action controllers (submit, approve, reject, cancel, convert) in `apps/api/src/modules/purchasing/purchase-requests/pr.controller.ts`
- [x] T013 [P] [US2] Implement Purchase Order CRUD and action controllers (submit, approve, reject, cancel) in `apps/api/src/modules/purchasing/purchase-orders/po.controller.ts`
- [x] T014 [US2] Implement Goods Received Note CRUD and action controllers (create, update, post, cancel) in `apps/api/src/modules/purchasing/grn/grn.controller.ts`
- [x] T015 [US2] Apply `WorkflowStateGuard`, `IdempotencyGuard`, and `ConcurrencyService` to PR, PO, and GRN controllers

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Stocktake and Reconciliation (Priority: P2)

**Goal**: Implement Stocktake session endpoints (create, start/lock, count, review, post/unlock) and warehouse locks.

**Independent Test**: Start a stocktake session to verify it locks the warehouse from any other operations, post counts, review, and finalize the stocktake to reconcile inventory.

### Tests for User Story 3

- [x] T016 [P] [US3] Write Stocktake controller unit tests in `apps/api/src/modules/stocktake/stocktake.controller.spec.ts`

### Implementation for User Story 3

- [x] T017 [P] [US3] Implement Stocktake session CRUD and action endpoints (create, start, count, submit, review, approve, post, close) in `apps/api/src/modules/stocktake/stocktake.controller.ts`
- [x] T018 [US3] Apply `WarehouseLockGuard` to all inventory-altering controllers (GRN post, Issue post, Transfer ship/receive, Adjustments post) to block writes during active stocktakes

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Operations: Issues, Transfers, and Adjustments (Priority: P2)

**Goal**: Implement Stock Issues, Warehouse Transfers, Adjustments, and Kitchen Requests endpoints, and warehouse soft-deletion/archiving.

**Independent Test**: Fulfill a kitchen request, post a stock issue, perform a transfer between warehouses, and test archiving empty vs non-empty warehouses.

### Tests for User Story 4

- [x] T019 [P] [US4] Write Issues, Transfers, Adjustments, and Kitchen Requests controller unit tests in `apps/api/src/modules/operations/operations.controller.spec.ts`

### Implementation for User Story 4

- [x] T020 [P] [US4] Implement Stock Issues CRUD and action endpoints (submit, post, cancel) in `apps/api/src/modules/operations/issues/issues.controller.ts`
- [x] T021 [P] [US4] Implement Stock Transfers CRUD and action endpoints (ship, receive, cancel) in `apps/api/src/modules/operations/transfers/transfers.controller.ts`
- [x] T022 [US4] Implement Inventory Adjustments CRUD and action endpoints (submit, approve, reject, post, cancel) in `apps/api/src/modules/operations/adjustments/adjustments.controller.ts`
- [x] T023 [US4] Implement Kitchen Requests CRUD and action endpoints (submit, fulfill, cancel) in `apps/api/src/modules/kitchen-requests/kitchen-requests.controller.ts`
- [x] T024 [P] [US4] Implement warehouse archiving endpoint: check if `onHandQty > 0` before archiving, and exclude archived warehouses (`isActive = false`) from active queries in `apps/api/src/modules/master-data/warehouses/warehouses.controller.ts`

**Checkpoint**: All movement, correction, request, and archiving features are complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Reporting, cron cleanup, and final validation gates

- [x] T025 [P] Implement inventory balance, ledger movements, and KPI report endpoints in `apps/api/src/modules/inventory/` and `apps/api/src/modules/reports/`
- [x] T026 [P] Configure lock cleanup background cron job to release expired stocktake locks in `apps/api/src/jobs/lock-cleanup.job.ts`
- [x] T027 Run typecheck, lint, and test scripts (`npm run build --filter=api` and `npm run test --filter=api`) to confirm all validation gates pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - Sequential execution: US1 (P1) → US2 (P1) → US3 (P2) → US4 (P2)
- **Polish (Final Phase)**: Depends on all user stories completion

---

## Parallel Opportunities

- Unit tests for US1 (`T006` and `T007`) can run in parallel.
- PR, PO, and GRN controllers (`T012`, `T013`, `T014`) can be implemented in parallel once setup is done.
- Operations controllers (`T020`, `T021`, `T022`, `T023`) can be implemented in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Only)

1. Complete Setup and Foundational blocks.
2. Implement Auth and multi-tenant scoping (US1).
3. Implement PR/PO/GRN flow (US2).
4. Run integration tests on Auth and GRN posting.

### Incremental Delivery

1. Verify Auth & Scopes (MVP Core).
2. Verify PR/PO/GRN flow (Procurement).
3. Verify Stocktake & Lock checks (Safety).
4. Verify Issues/Transfers/Adjustments & Archiving (Ops).
5. Add Reports & Jobs (Polish).
