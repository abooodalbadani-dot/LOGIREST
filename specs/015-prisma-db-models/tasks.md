# Tasks: Prisma Database Models & Migration Setup

**Input**: Design documents from `/specs/015-prisma-db-models/`
**Prerequisites**: [plan.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/015-prisma-db-models/plan.md) (required), [spec.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/015-prisma-db-models/spec.md) (required), [research.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/015-prisma-db-models/research.md), [data-model.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/015-prisma-db-models/data-model.md)

**Tests**: Tests are generated for all user stories to verify schema constraints, cascading rules, optimistic locking, and seeding validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- All descriptions reference exact file paths

## Path Conventions

- Paths reference the monorepo API structure: `apps/api/` and `packages/shared-types/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency setup

- [X] T001 Install `@prisma/client` and `prisma` dev dependencies in `apps/api/package.json`
- [X] T002 Initialize Prisma in `apps/api/` and configure database connection string in `apps/api/.env`
- [X] T003 [P] Configure Prisma Client generator and postgres datasource blocks in `apps/api/prisma/schema.prisma`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Setup `PrismaService` class extending `PrismaClient` in `apps/api/src/database/prisma.service.ts`
- [X] T005 [P] Register `PrismaModule` exporting `PrismaService` in `apps/api/src/database/database.module.ts`
- [X] T006 [P] Import `PrismaModule` inside NestJS main app module `apps/api/src/app.module.ts`
- [X] T007 [P] Create initial database connection verification script in `apps/api/src/database/verify.ts`
- [X] T008 [P] Add Prisma client generation script to `apps/api/package.json` scripts block under `prisma:generate`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Database Schema Provisioning & Seeding (Priority: P1) 🎯 MVP

**Goal**: Provision the database schema and seed the initial lookup data, so that the application has a valid database structure and essential parameters (UoMs, currencies, roles) to start operations.

**Independent Test**: Run database migration on a blank PostgreSQL instance and verify that all 30+ tables and enums are created. Then, run the seed script and verify that base records (currencies, standard UoMs, initial warehouses, and branches) are correctly populated.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T009 [P] [US1] Write database seeding assertion test in `apps/api/test/db-provision.e2e-spec.ts`

### Implementation for User Story 1

- [X] T010 [US1] Define Tier 1 enums (`Role`) and master data models (`User`, `UserWarehouseScope`, `Branch`, `Warehouse`, `Department`, `Category`, `UnitOfMeasure`, `Supplier`, `Currency`, `FXRate`, `Item`, `BarcodeMapping`) in `apps/api/prisma/schema.prisma`
- [X] T011 [US1] Define Tier 2 transaction document models (`PurchaseRequest`, `PRLine`, `PurchaseOrder`, `POLine`, `GoodsReceivedNote`, `GRNLine`, `InventoryIssue`, `InventoryIssueLine`, `LotAllocation`, `Transfer`, `TransferLine`, `Adjustment`, `AdjustmentLine`, `KitchenRequest`, `KitchenRequestItem`, `ApprovalEvent`) in `apps/api/prisma/schema.prisma`
- [X] T012 [US1] Define Tier 3/4 live inventory position and lot models (`Lot`, `WarehouseItem`, `WarehouseItemLot`) in `apps/api/prisma/schema.prisma`
- [X] T013 [US1] Define Tier 5 immutable ledger models (`StockLedger`, `CostLedger`) in `apps/api/prisma/schema.prisma`
- [X] T014 [US1] Define Tier 6 control and security models (`WarehouseLock`, `IdempotencyLog`, `AuditLog`, `StocktakeSession`, `StocktakeCount`, `StocktakeSnapshot`) in `apps/api/prisma/schema.prisma`
- [X] T015 [US1] Create the database migration script using `npx prisma migrate dev --name init_core_schema`
- [X] T016 [US1] Implement lookup data seeding script in `apps/api/prisma/seed.ts` (populating default branches, warehouses, currencies, roles, and units of measure)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Database Integrity Constraints Enforcement (Priority: P2)

**Goal**: Database enforces unique constraints, cascade deletion behaviors, and non-negativity rules at the schema level.

**Independent Test**: Attempt to insert duplicate barcodes for items, attempt to delete a warehouse that has active stock balances, and verify that the database rejects the operations and throws clean constraint violations.

### Tests for User Story 2

- [X] T017 [P] [US2] Write schema integrity and foreign key constraint tests in `apps/api/test/db-integrity.e2e-spec.ts`

### Implementation for User Story 2

- [X] T018 [US2] Define composite primary keys on `WarehouseItem(warehouseId, itemId)` and `WarehouseItemLot(warehouseId, itemId, lotId)` inside `apps/api/prisma/schema.prisma`
- [X] T019 [US2] Define barcode uniqueness constraint on `BarcodeMapping` and email uniqueness on `User` in `apps/api/prisma/schema.prisma`
- [X] T020 [US2] Configure cascade delete behavior for line items (`PRLine` on `PurchaseRequest`, `POLine` on `PurchaseOrder`, etc.) and delete restrictions on referenced master data in `apps/api/prisma/schema.prisma`
- [X] T021 [US2] Generate schema validation and update migrations via `npx prisma migrate dev --name schema_integrity_constraints`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Concurrency Safety Control Infrastructure (Priority: P3)

**Goal**: Database schema supports optimistic versioning and transaction log tracking, so that double-posting, concurrent editing conflicts, and race conditions are mitigated.

**Independent Test**: Simulate two concurrent updates using the same initial version number and verify that the database/ORM layer detects the version mismatch and allows only one to succeed.

### Tests for User Story 3

- [X] T022 [P] [US3] Write optimistic locking and concurrency transaction tests in `apps/api/test/db-concurrency.e2e-spec.ts`

### Implementation for User Story 3

- [X] T023 [US3] Add `version Int @default(1)` optimistic locking field on all mutable document headers and master data tables in `apps/api/prisma/schema.prisma`
- [X] T024 [US3] Define composite indexes on lookup fields: `WarehouseItemLot(warehouseId, itemId, expiryDate)`, `StockLedger(warehouseId, itemId, postedAt DESC)`, and `FXRate(currencyId, capturedAt DESC)` in `apps/api/prisma/schema.prisma`
- [X] T025 [US3] Add unique constraint on the `idempotencyKey` field inside the `StockLedger`, `CostLedger`, and `IdempotencyLog` tables in `apps/api/prisma/schema.prisma`
- [X] T026 [US3] Apply database migrations for versioning and index definitions using `npx prisma migrate dev --name concurrency_indexing`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T027 [P] Verify that all Zod schema and status enums in `packages/shared-types/src` match the Prisma enums and models exactly
- [X] T028 Code format verification by running `npm run format` and lint check using `npm run lint` across the API module
- [X] T029 Build the API application to confirm TypeScript and ORM generation compiles successfully using `npm run build --filter=api`
- [X] T030 Execute the quickstart guide validation steps in [quickstart.md](file:///e:/Kitchen%E2%80%91Store%20Inventory%20System/specs/015-prisma-db-models/quickstart.md) on a clean database

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but is independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but is independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel
- All tests for a user story marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch database seeding tests:
Task: "Write database seeding assertion test in apps/api/test/db-provision.e2e-spec.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently
