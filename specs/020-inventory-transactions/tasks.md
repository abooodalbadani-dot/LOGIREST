# Tasks: Inventory Transactions (Phase 7)

**Input**: Design documents from `/specs/020-inventory-transactions/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included. (TDD approach with failing tests written first for each user story).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Paths point to target backend files under `apps/api/` or shared library under `packages/shared-types/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure verification.

- [x] T001 Verify project workspace dependencies and structure per implementation plan
- [x] T002 Verify backend apps/api configuration andPackages configuration
- [x] T003 [P] Configure and run linting/formatting tools in apps/api/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core ledger, locking, and guard modules that MUST be complete before ANY user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Implement pessimistic locking in LedgerLockService inside apps/api/src/modules/ledger/ledger-lock.service.ts
- [x] T005 [P] Implement progressive lot allocation (FEFO/FIFO) inside apps/api/src/modules/ledger/allocation.service.ts
- [x] T006 [P] Implement WAC calculations in WacService inside apps/api/src/modules/ledger/wac.service.ts
- [x] T007 [P] Create and configure WorkflowStateGuard inside apps/api/src/guards/workflow-state.guard.ts
- [x] T008 [P] Configure active scope checks in ScopeInterceptor inside apps/api/src/interceptors/scope.interceptor.ts
- [x] T009 Create and configure AuditLog helper service inside apps/api/src/services/audit.service.ts
- [x] T010 Create and configure WarehouseLock check in WarehouseLockGuard inside apps/api/src/guards/warehouse-lock.guard.ts

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Posting a Goods Received Note (GRN) (Priority: P1) 🎯 MVP

**Goal**: Atomic posting of received goods to the ledger with WAC recalculations.

**Independent Test**: Post a RECEIVED GRN. Check that quantities are incremented in WarehouseItemLot, WAC recalculates in WarehouseItem, and StockLedger logs a GRN_IN entry.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T011 [P] [US1] Create unit tests for GRN posting inside apps/api/test/purchasing/grn-post.spec.ts

### Implementation for User Story 1

- [x] T012 [US1] Implement GRN posting transaction service inside apps/api/src/modules/purchasing/grn-post.service.ts
- [x] T013 [US1] Create and expose GRN post controller endpoint inside apps/api/src/modules/purchasing/grn/grn.controller.ts

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Posting an Inventory Issue (Priority: P1)

**Goal**: Progressive lot deduction using FEFO/FIFO allocation.

**Independent Test**: Post a SUBMITTED stock issue. Verify lots are decremented in FEFO/FIFO order and allocations are logged in LotAllocation.

### Tests for User Story 2

- [x] T014 [P] [US2] Create unit tests for Issue posting inside apps/api/test/operations/issue-post.spec.ts

### Implementation for User Story 2

- [x] T015 [US2] Implement Issue posting transaction service inside apps/api/src/modules/operations/issue-post.service.ts
- [x] T016 [US2] Create and expose Issue post controller endpoint inside apps/api/src/modules/operations/issues/issues.controller.ts

**Checkpoint**: User Stories 1 AND 2 are both functional independently.

---

## Phase 5: User Story 3 - Warehouse Transfer Shipping & Receiving (Priority: P2)

**Goal**: Two-phase atomic transfers with variance tracking.

**Independent Test**: Ship a transfer (decreases source stock, IN_TRANSIT) and receive it (increases destination stock, variance reason recorded if quantities differ).

### Tests for User Story 3

- [x] T017 [P] [US3] Create unit/integration tests for Transfer ship and receive inside apps/api/test/operations/transfer-post.spec.ts

### Implementation for User Story 3

- [x] T018 [US3] Implement Transfer SHIP transaction service inside apps/api/src/modules/operations/transfer-post.service.ts
- [x] T019 [US3] Implement Transfer RECEIVE transaction service inside apps/api/src/modules/operations/transfer-post.service.ts
- [x] T020 [US3] Create and expose Transfer ship and receive endpoints inside apps/api/src/modules/operations/transfers/transfers.controller.ts

**Checkpoint**: User Stories 1, 2, and 3 are all functional independently.

---

## Phase 6: User Story 4 - Posting Stock Adjustments (Priority: P2)

**Goal**: Adjust stock balances with approval gates and WAC update on increase.

**Independent Test**: Post a surplus adjustment (increases stock and recalculates WAC) or deficit adjustment (decreases stock, blocks if goes negative).

### Tests for User Story 4

- [x] T021 [P] [US4] Create unit tests for Stock Adjustments inside apps/api/test/operations/adjustment-post.spec.ts

### Implementation for User Story 4

- [x] T022 [US4] Implement Adjustment posting transaction service inside apps/api/src/modules/operations/adjustment-post.service.ts
- [x] T023 [US4] Create and expose Adjustment post controller endpoint inside apps/api/src/modules/operations/adjustments/adjustments.controller.ts

**Checkpoint**: User Stories 1, 2, 3, and 4 are functional.

---

## Phase 7: User Story 5 - Posting a Stocktake Session (Priority: P3)

**Goal**: Variance reconciliation, ledger posting, and lock release.

**Independent Test**: Post an APPROVED stocktake session. Verify stock quantities update, variance stock ledger entries write, and the warehouse lock deactivates.

### Tests for User Story 5

- [x] T024 [P] [US5] Create unit tests for Stocktake posting inside apps/api/test/stocktake/stocktake-post.spec.ts

### Implementation for User Story 5

- [x] T025 [US5] Implement Stocktake posting transaction service inside apps/api/src/modules/stocktake/stocktake-post.service.ts
- [x] T026 [US5] Create and expose Stocktake post controller endpoint inside apps/api/src/modules/stocktake/stocktake.controller.ts

**Checkpoint**: All user stories are functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verification, lint, type checks, and knowledge graph update.

- [x] T027 Run quickstart.md validation script and check all endpoints via manual testing
- [x] T028 [P] Run typecheck validation for frontend and backend projects using npm run typecheck
- [x] T029 Run full lint check and clean up any remaining code styling warnings inside apps/api/
- [x] T030 Execute graphify update command to rebuild project knowledge graph using graphify update .

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) - BLOCKS all User Stories.
- **User Stories (Phase 3+)**: Depends on Foundational (Phase 2). Can execute sequentially (US1 → US2 → US3 → US4 → US5) or in parallel.
- **Polish (Phase 8)**: Depends on all User Stories completion.

### Parallel Opportunities

- Foundation tasks marked [P] can run in parallel.
- Once Foundation completes, User Stories can be developed in parallel (different services and controller files).
- Within each User Story, writing test file [P] can run in parallel with design updates.
