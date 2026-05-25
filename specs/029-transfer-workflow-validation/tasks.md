# Tasks: Fix Transfer SHIP/RECEIVE Workflow Role Validation

**Input**: Design documents from `/specs/029-transfer-workflow-validation/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/api.md

**Tests**: Tests are explicitly requested in the engineering tasks, and will be integrated into the NestJS E2E suite.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure verification

- [x] T001 [P] Verify specification, plan, research, and data model design artifacts are fully in sync and integrated in specs folder
- [x] T002 Verify NextJS / NestJS workspace configuration and resolve module dependencies for `@logirest/shared-types`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Verify external signature and utility interfaces before beginning implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Verify the defined signature of `canPerformActionV2` in `packages/shared-types/src/workflow/document-engine.ts` matches parameters `(documentType, status, action, role)`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Centralized Role Authorization for Transfer Ship/Receive (Priority: P1) 🎯 MVP

**Goal**: Integrate centralized role capabilities and strict branch scopes validation into both ship and receive operations inside the service layer, writing persistent `AuditLog` records for failed attempts.

**Independent Test**: Trigger SHIP or RECEIVE through E2E calls using unauthorized user roles or incorrect warehouse scopes and confirm they are successfully blocked with `ForbiddenException` and logged.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [P] [US1] Write failing E2E tests in `apps/api/test/workflow-roles.e2e-spec.ts` verifying SHIP/RECEIVE operations throw 403 Forbidden for unauthorized user roles
- [x] T005 [P] [US1] Write failing E2E tests in `apps/api/test/workflow-roles.e2e-spec.ts` verifying branch scope validation blocks users not scoped to the target warehouse (origin for SHIP, destination for RECEIVE)

### Implementation for User Story 1

- [x] T006 [US1] Import `canPerformActionV2` and `Role` from `@logirest/shared-types` into `apps/api/src/modules/operations/transfer-post.service.ts`
- [x] T007 [US1] Integrate centralized `canPerformActionV2` role capability check in `TransferPostService.ship()` before executing transitions
- [x] T008 [US1] Implement strict origin warehouse branch scope query validation inside `TransferPostService.ship()` transaction block using `tx.userWarehouseScope.findUnique`
- [x] T009 [US1] Add outer try/catch wrapper in `TransferPostService.ship()` to log standard warning logs via NestJS `Logger` and insert security records to `AuditLog` table using `this.prisma.auditLog.create` on failures
- [x] T010 [US1] Integrate centralized `canPerformActionV2` role capability check in `TransferPostService.receive()` before executing transitions
- [x] T011 [US1] Implement strict destination warehouse branch scope query validation inside `TransferPostService.receive()` transaction block using `tx.userWarehouseScope.findUnique`
- [x] T012 [US1] Add outer try/catch wrapper in `TransferPostService.receive()` to log standard warning logs via NestJS `Logger` and insert security records to `AuditLog` table using `this.prisma.auditLog.create` on failures
- [x] T013 [US1] Execute E2E tests in `apps/api/test/workflow-roles.e2e-spec.ts` and verify they pass

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently

---

## Phase 4: User Story 2 - Lifecycle State Guarding as Defense-in-Depth (Priority: P2)

**Goal**: Retain status checks (`status !== 'DRAFT'` for SHIP, `status !== 'IN_TRANSIT'` for RECEIVE) as a secondary validation guard in both service operations.

**Independent Test**: Attempt to SHIP a transfer that is already received (using an Admin role) and verify that the status transition check still blocks the action.

### Tests for User Story 2

- [x] T014 [P] [US2] Write E2E tests in `apps/api/test/workflow-roles.e2e-spec.ts` verifying SHIP/RECEIVE transitions from invalid statuses throw 400 Bad Request

### Implementation for User Story 2

- [x] T015 [US2] Ensure status checks in `TransferPostService.ship()` run as secondary guards after authorization checks
- [x] T016 [US2] Ensure status checks in `TransferPostService.receive()` run as secondary guards after authorization checks
- [x] T017 [US2] Execute all workflow state and transition E2E tests in `apps/api/test/workflow-roles.e2e-spec.ts` and confirm they pass successfully

**Checkpoint**: Both User Stories 1 and 2 work independently and concurrently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Code quality, type checking, and compilation safety validations

- [x] T018 [P] Update developer documentation and sequence references in `specs/029-transfer-workflow-validation/quickstart.md`
- [x] T019 Execute compiler checks on NestJS backend app via `npm run build --filter=api` to verify zero build warnings
- [x] T020 Run typecheck and static analysis checks on the whole project workspace to ensure complete type safety

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently using `npx jest apps/api/test/workflow-roles.e2e-spec.ts`
5. Commit and deliver MVP
