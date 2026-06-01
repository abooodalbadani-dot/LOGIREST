# Tasks: Sprint 1 - Security & Stock Correctness

**Input**: Design documents from `/specs/044-security-stock-correctness/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Test tasks are included as we follow a robust test-first methodology to verify the stabilization changes before execution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- All paths reference the monorepo root structure: `apps/api/src/` and `packages/shared-types/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Verify active plan context in `AGENTS.md` matches `044-security-stock-correctness/plan.md`
- [X] T002 Ensure project dependencies are fully resolved across workspaces `apps/api` and `packages/shared-types`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Analyze AST dependency graph for `WorkflowStateGuard` and `ScopeValidationService` using AST references
- [X] T004 Review raw SQL lot locking syntax and transactional consistency expectations inside `PrismaService`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Warehouse-Scoped Document Hardening (Priority: P1) 🎯 MVP

**Goal**: Enforce that all document updates (PUT), deletions (DELETE), and transition actions (POST) are strictly validated against user warehouse scope limits in backend controllers and guards.

**Independent Test**: Log in as a user restricted to Warehouse A, attempt to perform PUT, DELETE, or POST actions on documents belonging to Warehouse B, and verify the system blocks all requests with a `403 Forbidden` response.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T005 [P] [US1] Create unit tests verifying cross-warehouse updates and deletes are rejected in `apps/api/src/modules/purchasing/purchase-orders/po.controller.spec.ts`
- [X] T006 [P] [US1] Create unit tests verifying cross-warehouse updates and deletes are rejected in `apps/api/src/modules/purchase-requests/purchase-requests.controller.spec.ts`
- [X] T007 [P] [US1] Create unit tests verifying cross-warehouse updates and deletes are rejected in `apps/api/src/modules/purchasing/grn/grn.controller.spec.ts`
- [X] T008 [P] [US1] Create unit tests verifying cross-warehouse updates and deletes are rejected in `apps/api/src/modules/operations/transfers/transfers.controller.spec.ts`
- [X] T009 [P] [US1] Create unit tests verifying cross-warehouse updates and deletes are rejected in `apps/api/src/modules/operations/issues/issues.controller.spec.ts`
- [X] T010 [P] [US1] Create unit tests verifying cross-warehouse updates and deletes are rejected in `apps/api/src/modules/operations/adjustments/adjustments.controller.spec.ts`
- [X] T011 [P] [US1] Create unit tests verifying cross-warehouse updates and deletes are rejected in `apps/api/src/modules/kitchen-requests/kitchen-requests.controller.spec.ts`

### Implementation for User Story 1

- [X] T012 [P] [US1] Inject `ScopeValidationService` and implement dynamic warehouse scope checks based on loaded document properties and actions in `apps/api/src/guards/workflow-state.guard.ts`
- [X] T013 [P] [US1] Add explicit scope validation checks inside update (PUT) and remove (DELETE) methods of `apps/api/src/modules/purchasing/purchase-orders/po.controller.ts`
- [X] T014 [P] [US1] Add explicit scope validation checks inside update (PUT) and remove (DELETE) methods of `apps/api/src/modules/purchase-requests/purchase-requests.controller.ts`
- [X] T015 [P] [US1] Add explicit scope validation checks inside update (PUT) and remove (DELETE) methods of `apps/api/src/modules/purchasing/grn/grn.controller.ts`
- [X] T016 [P] [US1] Add explicit scope validation checks inside update (PUT) and remove (DELETE) methods of `apps/api/src/modules/operations/transfers/transfers.controller.ts`
- [X] T017 [P] [US1] Add explicit scope validation checks inside update (PUT) and remove (DELETE) methods of `apps/api/src/modules/operations/issues/issues.controller.ts`
- [X] T018 [P] [US1] Add explicit scope validation checks inside update (PUT) and remove (DELETE) methods of `apps/api/src/modules/operations/adjustments/adjustments.controller.ts`
- [X] T019 [P] [US1] Add explicit scope validation checks inside update (PUT) and remove (DELETE) methods of `apps/api/src/modules/kitchen-requests/kitchen-requests.controller.ts`

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Kitchen Request Voiding & Stock Restoration (Priority: P1)

**Goal**: Restructure `KitchenRequestVoidService` to fetch the linked `InventoryIssue`, pessimistic-lock target lot rows, and atomically reverse stock deductions and WAC average cost updates.

**Independent Test**: Transition a kitchen request to POSTED status (deducting stock), trigger a void call, and confirm that both the request and the issue are VOIDED, with stock lot quantities and average costs fully restored.

### Tests for User Story 2

- [X] T020 [P] [US2] Write unit tests simulating concurrent void events and cost calculations in `apps/api/src/modules/operations/kitchen-request-void.service.spec.ts`

### Implementation for User Story 2

- [X] T021 [US2] Implement pessimistic lot locking using `SELECT FOR UPDATE` inside a Serializable transaction in `apps/api/src/modules/operations/kitchen-request-void.service.ts`
- [X] T022 [US2] Restructure voiding logic to invoke `IssueVoidService.void` within the same atomic transaction to reverse stock and cost entries in `apps/api/src/modules/operations/kitchen-request-void.service.ts`

**Checkpoint**: User Story 2 is fully functional and testable independently.

---

## Phase 5: User Story 3 - Strict Workflow State Lock Enforcement (Priority: P2)

**Goal**: Adjust `canPerformActionV2` logic to evaluate document status transition map rules first, preventing any role capability from bypassing locks on posted or cancelled documents.

**Independent Test**: Call `canPerformActionV2` for an APPROVED/POSTED document attempting an invalid transition and verify it returns `false` even if the user possesses ADMIN or APPROVER role capabilities.

### Tests for User Story 3

- [X] T023 [P] [US3] Add failing unit tests verifying role capabilities cannot bypass status locks in `packages/shared-types/src/workflow/document-engine.spec.ts`

### Implementation for User Story 3

- [X] T024 [US3] Reorder evaluation logic in `canPerformActionV2` to evaluate `transitionMapV2` status check first in `packages/shared-types/src/workflow/document-engine.ts`

**Checkpoint**: User Story 3 is fully functional and testable independently.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify that changes are solid, code compiles and typechecks cleanly, and all tests return successfully.

- [X] T025 Run local test suite using turbo filter api to verify code correctness
- [X] T026 Execute typecheck validation using npm run typecheck
- [X] T027 Run npm run build to verify successful compile of NestJS API and Next.js client
- [X] T028 Validate checklist criteria in quickstart.md guide

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational.
  - User Story 2 (P1): Can start after Foundational.
  - User Story 3 (P2): Can start after Foundational.
- **Polish (Final Phase)**: Depends on all user stories being complete

### Parallel Opportunities

- All US1 test writing tasks (T005 to T011) can run in parallel.
- All US1 controller update tasks (T013 to T019) can run in parallel.
- US1 and US3 have separate dependency footprints and can be implemented concurrently by different team members
