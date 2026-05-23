# Tasks: Transactional & Financial Hardening (Phase 2)

**Input**: Design documents from `/specs/024-transaction-financial-hardening/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks are included as requested by the TDD planning rules. All test tasks MUST be written first and verify failure (RED) before executing implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- All paths are relative to the monorepo root. NestJS API files reside under `apps/api/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic database schema adjustments

- [ ] T001 Define `DocumentSequence` model and add `isFrozen` field to `WarehouseItem` in `apps/api/prisma/schema.prisma`
- [ ] T002 Generate database migration script: `npx prisma migrate dev --name add_document_sequence_and_is_frozen --schema=apps/api/prisma/schema.prisma`
- [ ] T003 [P] Create sequencing module and register it in app modules `apps/api/src/app.module.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core configurations and lock decorators/utilities that block story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Implement `Prisma.Decimal` arithmetic utilities and precision rounding (to 4 decimal places) helper functions in `apps/api/src/modules/ledger/wac.service.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Recalculate Cost Basis on Transfers (Priority: P1) 🎯 MVP

**Goal**: Recalculate destination warehouse WAC on transfer receipt based on received quantity, logging transit loss to a dedicated account.

**Independent Test**: Post a transfer shipment with known WAC, receive it with a quantity discrepancy, and assert destination WAC recalculation correctness and `TRANSIT_LOSS` ledger records.

### Tests for User Story 1
> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T005 [P] [US1] Create unit tests in `apps/api/src/modules/operations/transfer-post.service.spec.ts` to assert that receipt WAC is calculated correctly and transit loss transactions are posted to the Cost and Stock ledgers (must fail initially)

### Implementation for User Story 1

- [ ] T006 [US1] Refactor `receive` method in `apps/api/src/modules/operations/transfer-post.service.ts` to retrieve the source warehouse item's WAC
- [ ] T007 [US1] Refactor WAC recalculation inside the `WarehouseItem` upsert loop of `apps/api/src/modules/operations/transfer-post.service.ts` using `Prisma.Decimal` high-precision arithmetic
- [ ] T008 [US1] Implement transit loss write-off posting logic in `apps/api/src/modules/operations/transfer-post.service.ts` to write quantity discrepancies as `TRANSIT_LOSS` in both stock and cost ledgers under a system-wide `Transit Loss Expense` account

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Sequential Document Numbering (Priority: P2)

**Goal**: Assign sequential, branch-prefixed, annually resetting numbers atomically to PO, GRN, SA, TR, etc.

**Independent Test**: Generate concurrent document creation requests and verify sequential numbering without gaps or collisions.

### Tests for User Story 2

- [ ] T009 [P] [US2] Create unit tests in `apps/api/src/modules/sequencing/document-sequence.service.spec.ts` checking format validation, annual reset triggers, and concurrency safety using transaction locks (must fail initially)

### Implementation for User Story 2

- [ ] T010 [US2] Implement `DocumentSequenceService` with atomic database-level locks (`SELECT FOR UPDATE`) in `apps/api/src/modules/sequencing/document-sequence.service.ts`
- [ ] T011 [US2] Refactor PR number generation inside `apps/api/src/modules/purchase-requests/purchase-requests.service.ts` to use `DocumentSequenceService`
- [ ] T012 [US2] Refactor PO number generation inside `apps/api/src/modules/purchasing/purchase-orders/po.service.ts` to use `DocumentSequenceService`
- [ ] T013 [US2] Refactor Stock Transfer number generation inside `apps/api/src/modules/operations/transfers/transfers.service.ts` to use `DocumentSequenceService`
- [ ] T014 [US2] Refactor Inventory Issue number generation inside `apps/api/src/modules/operations/issues/issues.service.ts` to use `DocumentSequenceService`
- [ ] T015 [US2] Refactor Stock Adjustment number generation inside `apps/api/src/modules/operations/adjustments/adjustments.service.ts` to use `DocumentSequenceService`

**Checkpoint**: User Stories 1 and 2 should both work independently.

---

## Phase 5: User Story 3 - Automated Reconciliation & SKU-level Lock (Priority: P3)

**Goal**: Schedule daily reconciliation checks to detect stock-to-ledger discrepancies and freeze mutations for affected SKUs.

**Independent Test**: Inject stock level discrepancy in database, trigger reconciliation job, verify SKU is frozen, and attempt inventory mutations which should be blocked.

### Tests for User Story 3

- [ ] T016 [P] [US3] Create unit/integration tests in `apps/api/src/modules/ledger/reconciliation.job.spec.ts` asserting drift checks, SKU freezing execution, and mutation controller rejections (must fail initially)

### Implementation for User Story 3

- [ ] T017 [US3] Implement scheduled daily NestJS cron job `ReconciliationJob` inside `apps/api/src/modules/ledger/reconciliation.job.ts` comparing `WarehouseItem.qtyOnHand` with the sum of historical transaction entries in `StockLedger`
- [ ] T018 [US3] Add validation block inside mutating services (GRN post, stock adjustments, issues, transfers) checking the `isFrozen` status of each item, returning `423 LOCKED` or `400 BAD REQUEST` if true
- [ ] T019 [US3] Implement automatic unfreezing trigger upon successful posting of a reconciling Stock Adjustment document in `apps/api/src/modules/operations/adjustments/adjustment-post.service.ts`

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Refactoring, quality checks, and performance validation

- [ ] T020 [P] Run typecheck verification: `npm run typecheck --filter=api`
- [ ] T021 [P] Run ESLint sweep and styling checks: `npm run lint --filter=api`
- [ ] T022 Compile production bundle: `npm run build --filter=api`
- [ ] T023 Run developer quickstart validation in `specs/024-transaction-financial-hardening/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
- **Polish (Final Phase)**: Depends on all user stories being complete.

### Parallel Opportunities

- T003 (Sequencing module registration) can run in parallel with T001 and T002.
- Unit test creations (T005, T009, T016) can be written in parallel.
- Once Foundational phase is complete, US1, US2, and US3 implementation tracks can run in parallel since they touch separate services.
- Polish phase tasks (T020, T021) can run in parallel.

---

## Parallel Example: User Story 1

```bash
# Launch model updates and test script setup in parallel
Task: T005 [P] Create unit tests in transfer-post.service.spec.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (WAC decimal utilities)
3. Complete Phase 3: WAC propagation on transfers
4. **STOP and VALIDATE**: Verify transfer posting updates destination WAC and logs transit losses.
5. Deploy/Demo MVP.
