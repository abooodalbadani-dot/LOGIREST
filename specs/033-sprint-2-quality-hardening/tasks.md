# Tasks: Sprint 2 Quality Hardening

**Input**: Design documents from `/specs/033-sprint-2-quality-hardening/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/admin-endpoints.md

**Tests**: Unit tests are defined to verify the newly added service logic for unfreezing and outbox retries.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app monorepo structure**: `apps/api/src/`, `apps/web/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and environment verification

- [x] T001 Set up the sequential task list structure and environment verification for Sprint 2
- [x] T002 [P] Verify local development dependencies and configure any new dev modules in packages

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database schema constraints that must be complete before any user story can be implemented

**⚠️ CRITICAL**: Database constraints must be updated before executing any status-related user stories.

- [x] T003 [P] Implement Prisma migration adding status validation `CHECK` constraint on the `outbox_events` table in `prisma/migrations/`
- [x] T004 Apply the database migrations locally using `npx prisma migrate dev`

---

## Phase 3: User Story 1 - Admin Operations Hub for Frozen Items and Failed Notifications (Priority: P1) 🎯 MVP

**Goal**: Create the Frozen-Item administration UI and Failed Outbox retry dashboard.

**Independent Test**: Admin unfreezes a frozen stock item from `/admin/frozen-items` and triggers retries from `/admin/outbox` successfully.

### Implementation for User Story 1

- [x] T005 [P] [US1] Build NestJS API controller endpoint `GET /api/v1/admin/frozen-items` to fetch all frozen stock items in `apps/api/src/modules/admin/admin.controller.ts`
- [x] T006 [US1] Build NestJS API service handler `unfreezeItem(warehouseId, itemId)` and controller endpoint `POST /api/v1/admin/unfreeze/:warehouseId/:itemId` in `apps/api/src/modules/admin/admin.service.ts` and `apps/api/src/modules/admin/admin.controller.ts`
- [x] T007 [P] [US1] Build NestJS API controller endpoint `GET /api/v1/admin/outbox/failed` to retrieve failed outbox events in `apps/api/src/modules/admin/admin.controller.ts`
- [x] T008 [US1] Build NestJS API service retry handlers and controller endpoints `POST /api/v1/admin/outbox/:id/retry` and `POST /api/v1/admin/outbox/retry-all` in `apps/api/src/modules/admin/admin.service.ts` and `apps/api/src/modules/admin/admin.controller.ts`
- [x] T009 [P] [US1] Create the Next.js Admin Frozen Items page `apps/web/src/app/[locale]/(app)/admin/frozen-items/page.tsx` displaying the frozen items table and the "Unfreeze" button action
- [x] T010 [P] [US1] Create the Next.js Admin Outbox Retry page `apps/web/src/app/[locale]/(app)/admin/outbox/page.tsx` displaying failed outbox events and retry actions
- [x] T011 [US1] Inject new links for Frozen Items and Outbox Failures in the Admin sidebar component inside `apps/web/src/app/[locale]/(app)/admin/layout.tsx`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - System Auditing and Security Monitoring (Priority: P2)

**Goal**: Capture security logs on failed logins and track notification errors in metrics.

**Independent Test**: Unsuccessful login creates a `LOGIN_FAILED` audit log, and outgoing worker failures increment the Prometheus outbox error counter.

### Implementation for User Story 2

- [x] T012 [US2] Modify NestJS authentication service to log an immutable audit log entry of action `LOGIN_FAILED` on failed login attempts in `apps/api/src/auth/auth.service.ts`
- [x] T013 [US2] Inject the `MetricsService` into NestJS `OutboxWorker` and increment the global counter `failedOutboxEventsCounter` inside outbox processing error handlers in `apps/api/src/modules/outbox/outbox.worker.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Persistent Background Job Resilience (Priority: P3)

**Goal**: Secure background jobs via standardized crons and persistent Redis debounces.

**Independent Test**: Expired lock cleanup executes exactly every minute via cron, and low-stock alerts are correctly cached and debounced inside Redis across restarts.

### Implementation for User Story 3

- [x] T014 [US3] Migrate background task execution in `lock-cleanup.job.ts` from `setInterval` to `@Cron('*/1 * * * *')` in `apps/api/src/jobs/lock-cleanup.job.ts`
- [x] T015 [US3] Inject the Redis client inside the low stock alert job and integrate standard persistent debouncing using `alert:lowstock:debounce:${itemId}` keys in `apps/api/src/jobs/low-stock-alert.job.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Code quality audits, validations, and builds verification

- [x] T016 [P] Add and run comprehensive unit tests for the unfreeze and retry service endpoints in `apps/api/src/modules/admin/admin.service.spec.ts`
- [x] T017 Run comprehensive lint checks and TypeScript typecheck validations in frontend and backend
- [x] T018 Execute `npm run build` locally to verify full compilation safety across all workspaces

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1) starts first (MVP dashboard foundation)
  - User Story 2 (P2) and User Story 3 (P3) can run in parallel after User Story 1, or sequentially
- **Polish (Phase 6)**: Depends on all user stories being complete

---

## Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- T003 can be executed independently in Phase 2
- Once Phase 2 is complete, T005, T007, T009, and T010 can be developed in parallel by separate team members

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (Frozen & Outbox UI Console)
4. **STOP and VALIDATE**: Test User Story 1 manually
