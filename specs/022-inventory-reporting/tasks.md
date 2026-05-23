# Tasks: Inventory Query, Reporting, & Administrative Jobs

**Input**: Design documents from `/specs/022-inventory-reporting/`  
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Includes exact file paths in descriptions.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project schema definition and index exports

- [x] T001 Create Zod schemas for queries and notification structures inside `packages/shared-types/src/schemas/reporting.schema.ts`
- [x] T002 Export new reporting schemas from index inside `packages/shared-types/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema models, migrations, and core module declarations

- [x] T003 Add `LockStatus` enum, update `WarehouseLock` schema with `status`, and declare `NotificationLog` table inside `apps/api/prisma/schema.prisma`
- [x] T004 Apply database migrations and generate client via `npx prisma migrate dev --name add_reporting_models --schema=apps/api/prisma/schema.prisma`
- [x] T005 [P] Create and declare notification module infrastructure inside `apps/api/src/modules/notifications/notification.module.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Inventory Balance, Lot & Movement Queries (Priority: P1) 🎯 MVP

**Goal**: Expose read-only APIs for stock levels, lots, and movement histories filtered by warehouse scope.

**Independent Test**: Seed warehouse data, query balance, lots, and movements endpoints using `x-warehouse-id` headers, and verify that only scoped records are returned.

### Implementation for User Story 1

- [x] T006 [P] [US1] Create query methods for live balance and lots inside `apps/api/src/modules/inventory/inventory.service.ts`
- [x] T007 [P] [US1] Expose balance, lots, and movement endpoints inside `apps/api/src/modules/inventory/inventory.controller.ts`
- [x] T008 [US1] Apply global `ScopeInterceptor` and `JwtAuthGuard` to `apps/api/src/modules/inventory/inventory.controller.ts`
- [x] T009 [US1] Write unit tests for inventory query operations inside `apps/api/src/modules/inventory/inventory.service.spec.ts`

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Warehouse Lock Management & Expiry (Priority: P2)

**Goal**: Detect expired warehouse locks and mark them `STALE` via a cron job, maintaining write protection.

**Independent Test**: Create an active lock past its expiration timestamp. Run the cleanup job, verify its status transitions to `STALE`, verify write actions are still blocked, and verify that the manual unlock endpoint releases it.

### Implementation for User Story 2

- [x] T010 [P] [US2] Implement manual release method inside `apps/api/src/modules/warehouse-lock/warehouse-lock.service.ts`
- [x] T011 [US2] Implement lock expiry checker cron job inside `apps/api/src/jobs/lock-cleanup.job.ts`
- [x] T012 [P] [US2] Expose manual unlock endpoint `/warehouse-locks/:id/unlock` inside `apps/api/src/modules/warehouse-lock/warehouse-lock.controller.ts`
- [x] T013 [US2] Write unit tests for background cron expiration updates inside `apps/api/src/jobs/lock-cleanup.job.spec.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 are functional and testable independently.

---

## Phase 5: User Story 3 - Role-Based Workflow Notifications (Priority: P3)

**Goal**: Trigger notification logs on document workflow state changes and support marking them read.

**Independent Test**: Submit a PR, verify `NotificationLog` is created, and trigger read updates on the notifications endpoint to verify read status changes.

### Implementation for User Story 3

- [x] T014 [US3] Implement DB notification logging inside `apps/api/src/modules/notifications/notification.service.ts`
- [x] T015 [US3] Hook dispatch call into state transitions inside `apps/api/src/modules/workflow/workflow.service.ts`
- [x] T016 [P] [US3] Expose mark-read endpoints `PATCH /notifications/:id/read` and `POST /notifications/read-all` inside `apps/api/src/modules/notifications/notification.controller.ts`
- [x] T017 [US3] Write unit tests for notification creation and read state updating inside `apps/api/src/modules/notifications/notification.service.spec.ts`

**Checkpoint**: User Stories 1, 2, and 3 are fully functional.

---

## Phase 6: User Story 4 - Optimized Barcode Scan API (Priority: P2)

**Goal**: Expose an optimized barcode scanner lookup API returning item details and active lots in one query.

**Independent Test**: Scan an existing barcode mapping and verify the returned JSON contains default UoM conversion and active lots list.

### Implementation for User Story 4

- [x] T018 [P] [US4] Implement barcode resolution logic inside `apps/api/src/modules/inventory/inventory.service.ts`
- [x] T019 [US4] Expose scanning endpoint `GET /items/scan` inside `apps/api/src/modules/inventory/inventory.controller.ts`
- [x] T020 [US4] Write unit tests for scanner lookups inside `apps/api/src/modules/inventory/inventory.service.spec.ts`

**Checkpoint**: All user stories are independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Dashboard reporting, audit logging endpoints, and compilation checks.

- [x] T021 Expose KPI summary and overdue transfer metrics inside `apps/api/src/modules/reports/reports.controller.ts`
- [x] T022 Expose administrative audit log list query inside `apps/api/src/modules/admin/audit-logs.controller.ts`
- [x] T023 Run project compilation and type check tests via `npm run build --filter=api`
- [x] T024 Validate developer instructions and cURL commands from `quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User stories can then proceed in parallel (if staffed).
- **Polish (Phase 7)**: Depends on all user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies.
- **User Story 2 (P2)**: Can start after Foundational - Independently testable.
- **User Story 3 (P3)**: Can start after Foundational - Independently testable.
- **User Story 4 (P4)**: Can start after Foundational - Independently testable.

### Parallel Opportunities

- Setup tasks `T001` and `T002` can be completed in parallel.
- Foundational task `T005` can run in parallel with database updates.
- Once Foundation completes:
  - Developer A can work on US1 (`T006`-`T009`).
  - Developer B can work on US2 (`T010`-`T013`).
  - Developer C can work on US3 (`T014`-`T017`).
  - Developer D can work on US4 (`T018`-`T020`).

---

## Parallel Example: User Story 1

```bash
# Developers can work on services and controllers concurrently:
Task: "Create query methods for live balance and lots inside apps/api/src/modules/inventory/inventory.service.ts"
Task: "Expose balance, lots, and movement endpoints inside apps/api/src/modules/inventory/inventory.controller.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (blocks all user stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: Verify balance, lots, and movements endpoints return correct data.

### Incremental Delivery

1. Complete Setup + Foundational.
2. Add User Story 1 (MVP) -> Validate.
3. Add User Story 2 (Lock cleanup job & Manual unlock) -> Validate.
4. Add User Story 3 (Workflow notification logs) -> Validate.
5. Add User Story 4 (Optimized barcode scanning lookup) -> Validate.
6. Add Phase 7 (Reports and Audit logs) -> Final Polish.
