# Tasks: Inventory Locking & Valuation

**Input**: Design documents from `specs/019-inventory-locking/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create the ledger module directory structure under `apps/api/src/modules/ledger/`
- [x] T002 [P] Export new ledger services from `apps/api/src/modules/ledger/ledger.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database connections that must be complete before any user story can be implemented

- [x] T003 Implement the base database provider reference in `apps/api/src/modules/ledger/ledger-lock.service.ts`

---

## Phase 3: User Story 1 - Intelligent Lot Allocation (FEFO/FIFO) (Priority: P1) 🎯 MVP

**Goal**: Automatic FEFO/FIFO/unbatched lot allocation for inventory deductions, excluding expired lots.

**Independent Test**: Unit test with active, expired, and FIFO lots verifying allocation ordering.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [P] [US1] Create allocation service unit tests in `apps/api/src/modules/ledger/allocation.service.spec.ts`

### Implementation for User Story 1

- [x] T005 [US1] Implement batch allocation selection logic checking item configuration in `apps/api/src/modules/ledger/allocation.service.ts`
- [x] T006 [US1] Exclude expired lots from allocation query under `apps/api/src/modules/ledger/allocation.service.ts`
- [x] T007 [US1] Integrate allocation service into the main module in `apps/api/src/modules/ledger/ledger.module.ts`

---

## Phase 4: User Story 2 - Prevention of Negative Stock and Race Conditions (Priority: P1)

**Goal**: Row-level pessimistic locking (`SELECT FOR UPDATE`) and deadlock prevention via sorted locks, blocking negative stock mutations.

**Independent Test**: Integration e2e test with parallel threads attempting concurrent deduction requests.

### Tests for User Story 2

- [x] T008 [P] [US2] Create ledger locking unit and e2e tests in `apps/api/src/modules/ledger/ledger-lock.service.spec.ts` and `apps/api/src/modules/ledger/ledger-lock.e2e-spec.ts`

### Implementation for User Story 2

- [x] T009 [US2] Implement raw SQL pessimistic locking for item and lots with sorted ordering `ORDER BY itemId ASC, lotId ASC` in `apps/api/src/modules/ledger/ledger-lock.service.ts`
- [x] T010 [US2] Implement post-lock negative balance assertion logic in `apps/api/src/modules/ledger/ledger-lock.service.ts`

---

## Phase 5: User Story 3 - Automatic Weighted Average Cost (WAC) Recalculation (Priority: P2)

**Goal**: Recalculate WAC on stock receipt (GRN) and log updates to the `CostLedger`, ensuring positive adjustments inherit current WAC.

**Independent Test**: Unit test verifying WAC recalculation formula and cost ledger logging.

### Tests for User Story 3

- [x] T011 [P] [US3] Create WAC service unit tests in `apps/api/src/modules/ledger/wac.service.spec.ts`

### Implementation for User Story 3

- [x] T012 [US3] Implement WAC recalculation formula and update on `WarehouseItem` in `apps/api/src/modules/ledger/wac.service.ts`
- [x] T013 [US3] Implement WAC mutation logging to `CostLedger` in `apps/api/src/modules/ledger/wac.service.ts`
- [x] T014 [US3] Enforce positive adjustments inheriting current WAC without recalculating in `apps/api/src/modules/ledger/wac.service.ts`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T015 Document locking code usage and best practices in `DEVELOPMENT_GUIDELINES.md`
- [x] T016 Run quickstart.md validation tests and verify code compiles cleanly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2)
- **User Story 2 (P2)**: Can start after Foundational (Phase 2)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2)

### Parallel Opportunities

- Setup tasks can run in parallel (T001, T002).
- Allocation service tests (T004) and locking service tests (T008) can run in parallel.
- Once Foundation (Phase 2) is completed, User Story 1, User Story 2, and User Story 3 can be developed in parallel by separate developers.

---

## Parallel Example: User Story 1

```bash
# Launch both models and services for User Story 1 together:
Task: "Implement batch allocation selection logic checking item configuration in apps/api/src/modules/ledger/allocation.service.ts"
Task: "Exclude expired lots from allocation query under apps/api/src/modules/ledger/allocation.service.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. Complete Phase 4: User Story 2
5. **STOP and VALIDATE**: Verify allocations and locks sequentially and concurrently.
6. Complete Phase 5: User Story 3
7. Complete Phase 6: Polish
