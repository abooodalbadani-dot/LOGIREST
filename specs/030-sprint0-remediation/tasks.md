# Tasks: Sprint 0 Readiness Hardening

**Input**: Design documents from `/specs/030-sprint0-remediation/`
**Prerequisites**: [plan.md](plan.md) (required), [spec.md](spec.md) (required), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Exact file paths are included in descriptions.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and environment validation

- [ ] T001 Verify project structure and active git branch `030-sprint0-remediation`
- [ ] T002 Run baseline NestJS build to verify workspace is compile-ready using `npm run build --workspace=apps/api`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure setup that must be complete before any user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Configure and verify E2E integration test runner configuration in `apps/api/test/jest-e2e.json`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Email Delivery Status Transparency and Alerting (Priority: P1) 🎯 MVP

**Goal**: Enable SMTP unconfigured status returns, generate admin notifications on failure, and expose a system email status metrics dashboard.

**Independent Test**: Remove SMTP credentials from environment, trigger an outbox event, and verify the outbox event is marked as `FAILED` (with `lastError = 'SMTP_NOT_CONFIGURED'`), an in-system administrative warning log is generated, and `GET /admin/system/email-status` reports 1 failed count.

### Implementation for User Story 1

- [ ] T004 [P] [US1] Create unit tests for unconfigured/configured SMTP transporter states in `apps/api/src/modules/outbox/email.service.spec.ts`
- [X] T005 [P] [US1] Define `EmailResult` discriminated union and modify `sendEmail` return types to return unconfigured reason codes in `apps/api/src/modules/outbox/email.service.ts`
- [X] T006 [US1] Refactor outbox processor to mark unconfigured transporter events as `FAILED` (error code: `SMTP_NOT_CONFIGURED`) and trigger an ADMIN in-system warning log in `apps/api/src/modules/outbox/outbox.worker.ts`
- [X] T007 [P] [US1] Register exports and import modules to expose the service globally in `apps/api/src/modules/outbox/outbox.module.ts` and `apps/api/src/modules/admin/admin.module.ts`
- [X] T008 [US1] Implement `GET /admin/system/email-status` endpoint restricted to the `ADMIN` role to expose health and failure metrics in `apps/api/src/modules/admin/admin.controller.ts`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Draft Document Cancellation (Priority: P1)

**Goal**: Allow operators to transition DRAFT procurement documents to terminal CANCELLED states from backend endpoints and frontend client forms.

**Independent Test**: Access a saved draft Purchase Request form, click the "Cancel" action, and verify it transitions to a read-only "Cancelled" status and generates an ApprovalEvent.

### Implementation for User Story 2

- [X] T009 [P] [US2] Update the statuses array contract to include `'CANCELLED'` and `'VOIDED'` states in `packages/shared-types/src/contracts/statuses.ts`
- [ ] T010 [P] [US2] Create integration E2E test cases validating draft document cancellation transitions in `apps/api/test/workflow-transitions.e2e-spec.ts`
- [X] T011 [US2] Add the `@Post(':id/cancel')` endpoint with appropriate Workflow State Guards and decorators in `apps/api/src/modules/purchase-requests/purchase-requests.controller.ts`
- [X] T012 [US2] Implement `cancel()` service method executing the `CANCEL` workflow state transition in `apps/api/src/modules/purchase-requests/purchase-requests.service.ts`
- [X] T013 [US2] Add Cancel action button and wire it to react mutation hook `useCancelPR` in `apps/web/src/features/purchasing/components/purchase-request-form.tsx`

**Checkpoint**: User Story 2 is fully functional and testable independently.

---

## Phase 5: User Story 3 - Multi-Currency Dashboard Support (Priority: P2)

**Goal**: Support dynamically formatted currencies based on settings configuration on Store Manager Dashboard components.

**Independent Test**: Alter base currency settings to `AED` and verify that Store Manager Dashboard values render formatting suffix `AED` dynamically.

### Implementation for User Story 3

- [X] T014 [US3] Retrieve currency configuration dynamically using settings hooks in `apps/web/src/features/dashboard/components/StoreManagerDashboard.tsx`
- [X] T015 [US3] Remove hardcoded `baseCurrency: 'SAR'` from dashboard defaults and hook the settings listener in `apps/web/src/app/[locale]/(app)/dashboard/DashboardClient.tsx`
- [X] T016 [US3] Clean up hardcoded demo PO total with currency value in `apps/web/src/app/[locale]/(app)/search/SearchClient.tsx`

**Checkpoint**: User Story 3 is fully functional and testable independently.

---

## Phase 6: User Story 4 - Automated Inventory Reconciliation (Priority: P2)

**Goal**: Migrate inventory reconciliation jobs from custom timeout timer schedulers to NestJS Schedule cron schedulers.

**Independent Test**: Verify that the daily reconciliation job triggers exactly once every 24 hours at 1:00 AM, and restarts do not miss scheduling slots.

### Implementation for User Story 4

- [X] T017 [P] [US4] Remove all setTimeout variables, module init/destroy timer tasks, and `scheduleNextRun` properties from the class in `apps/api/src/modules/ledger/reconciliation.job.ts`
- [X] T018 [P] [US4] Decorate `runReconciliation` with `@Cron('0 1 * * *', { name: 'daily-reconciliation' })` in `apps/api/src/modules/ledger/reconciliation.job.ts`
- [X] T019 [US4] Clean up obsolete unit test scheduler mocks and timing assertions in `apps/api/src/modules/ledger/reconciliation.job.spec.ts`

**Checkpoint**: User Story 4 is fully functional and testable independently.

---

## Phase 7: User Story 5 - Database State Integrity Safeguards (Priority: P3)

**Goal**: Apply raw PostgreSQL positive check constraints to inventory and outbox event tables to guarantee strict database state safety.

**Independent Test**: Attempt a direct database insert statement containing a negative stock quantity; verify the database engine rejects it with a CHECK constraint error.

### Implementation for User Story 5

- [X] T020 [P] [US5] Generate empty Prisma migration skeleton file using `npx prisma migrate dev --create-only --name add_nonneg_qty_constraints` in `apps/api/prisma/migrations/`
- [X] T021 [P] [US5] Append check constraints for positive quantities and valid outbox statuses to the generated SQL migration file under `apps/api/prisma/migrations/`
- [X] T022 [US5] Create DB constraint rejection integration tests and run migration deploy using `npx prisma migrate deploy` in `apps/api/test/db-integrity.e2e-spec.ts`

**Checkpoint**: User Story 5 is fully functional and testable independently.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validate compilation and build health across the monorepo workspaces

- [X] T023 Run monorepo typecheck, lint, and production build checks using `npm run typecheck --workspace=apps/web` and `npm run build --workspace=apps/api`
- [X] T024 Execute quickstart validation scenarios to confirm complete sprint 0 readiness

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion. Blocks all user stories.
- **User Stories (Phase 3+)**: Depend on Foundational completion. Can then proceed sequentially or in parallel depending on developer availability.

### Parallel Opportunities

- All Setup and Foundational tasks marked `[P]` can run in parallel.
- User Story 1, 2, 4, and 5 contain independent tasks marked `[P]` that can be worked on concurrently.
- Once Foundation is complete, separate developers can start User Story 1 and User Story 2 in parallel.
