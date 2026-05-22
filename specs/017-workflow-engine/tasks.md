# Tasks: Workflow Engine (Phase 4)

**Input**: Design documents from `/specs/017-workflow-engine/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- For our NestJS API project:
  - Source code: `apps/api/src/`
  - Prisma configuration: `apps/api/prisma/`
  - Tests: `apps/api/test/` or `src/**/*.spec.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and modular backend structure.

- [x] T001 Create workflow module directory structure in `apps/api/src/modules/workflow`
- [x] T002 Update `apps/api/src/app.module.ts` to import `WorkflowModule`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database schema modifications and helper boilerplate that MUST be complete before any user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Update `ApprovalEvent` model fields in `apps/api/prisma/schema.prisma` to add `stepNumber`, `userRole`, and `comments`
- [x] T004 Run prisma migrations with command `npx prisma migrate dev --schema=apps/api/prisma/schema.prisma --name add_approval_event_fields` to update database schema
- [x] T005 Run prisma client generation command `npm run prisma:generate --workspace=api` to update local client types
- [x] T006 [P] Create workflow action decorator in `apps/api/src/decorators/workflow-action.decorator.ts`
- [x] T007 [P] Create workflow service skeleton in `apps/api/src/modules/workflow/workflow.service.ts`
- [x] T008 [P] Create workflow state guard skeleton in `apps/api/src/guards/workflow-state.guard.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Document Status Transition Enforcement (Priority: P1) 🎯 MVP

**Goal**: Core system integrity. Ensures document status transitions use the shared-types state machine rules and log events/audit logs.

**Independent Test**: Create a draft Purchase Request, submit to pending (SUBMITTED), and try to submit again. The second submission must fail.

### Implementation for User Story 1

- [x] T009 [US1] Implement status transition logic in `apps/api/src/modules/workflow/workflow.service.ts` using `getNextStatusV2` from `@logirest/shared-types`
- [x] T010 [US1] Implement `ApprovalEvent` creation within a Prisma transaction in `apps/api/src/modules/workflow/workflow.service.ts`
- [x] T011 [US1] Implement successful and failed transition logging to `AuditLog` in `apps/api/src/modules/workflow/workflow.service.ts`
- [x] T012 [US1] Implement document state transition check in `apps/api/src/guards/workflow-state.guard.ts`
- [x] T013 [US1] Create unit tests for status transition logic in `apps/api/src/modules/workflow/workflow.service.spec.ts`
- [x] T014 [US1] Create unit tests for transition guard enforcement in `apps/api/src/guards/workflow-state.guard.spec.ts`
- [x] T015 [US1] Decorate existing PR routes with `@WorkflowAction` in `apps/api/src/modules/purchase-requests/purchase-requests.controller.ts`
- [x] T016 [US1] Create E2E integration test for status transition enforcement in `apps/api/test/workflow-transitions.e2e-spec.ts`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Role-Based Workflow Capability Validation (Priority: P1)

**Goal**: Essential security and audit compliance. Bypassing authorization blocks status updates.

**Independent Test**: A Warehouse Keeper tries to approve a Purchase Request. The approval must be blocked with a 403 Forbidden exception.

### Implementation for User Story 2

- [x] T017 [US2] Implement user role validation check in `apps/api/src/guards/workflow-state.guard.ts` using `canPerformActionV2` from `@logirest/shared-types`
- [x] T018 [US2] Implement warehouse operational lock verification check in `apps/api/src/guards/workflow-state.guard.ts` (blocks inventory mutations, permits PR/PO workflows)
- [x] T019 [US2] Create unit tests for role capability check and warehouse lock check in `apps/api/src/guards/workflow-state.guard.spec.ts`
- [x] T020 [x] Create E2E integration test for role validation and locked warehouse checks in `apps/api/test/workflow-roles.e2e-spec.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 - Conversion of Approved Purchase Requests (Priority: P2)

**Goal**: Convert APPROVED PR to DRAFT PO manually via an endpoint.

**Independent Test**: Convert an approved PR to a PO and verify new PO links back to the PR.

### Implementation for User Story 3

- [x] T021 [US3] Create `POST /api/purchase-requests/:id/convert-to-po` endpoint in `apps/api/src/modules/purchase-requests/purchase-requests.controller.ts` protected by WorkflowStateGuard
- [x] T022 [US3] Implement PR to PO conversion handler in `apps/api/src/modules/purchase-requests/purchase-requests.service.ts` that creates a new PO referencing the PR
- [x] T023 [US3] Add unit tests for PR to PO conversion in `apps/api/src/modules/purchase-requests/purchase-requests.service.spec.ts`
- [x] T024 [US3] Create E2E integration test for conversion endpoint in `apps/api/test/workflow-conversion.e2e-spec.ts`

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality verification, formatting, type checking, and documentation.

- [x] T025 [P] Update workflow API documentation and README in `apps/api/README.md`
- [x] T026 Run full API unit test suite with `npm run test --filter=api` to verify zero test regressions
- [x] T027 Run typescript compile checks with `npm run typecheck --workspace=api`
- [x] T028 Run ESLint formatting checks with `npm run lint --workspace=api`
- [x] T029 Validate quickstart.md integration scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - User stories can then proceed in parallel (if staffed).
  - Or sequentially in priority order (P1 → P2).
- **Polish (Final Phase)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories.
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - May integrate with US1 check but can be independently tested.
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) and APPROVED state from US1 is ready.

### Within Each User Story

- Models before services.
- Services before endpoints.
- Core implementation before integration.
- Story complete before moving to next priority.

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel.
- All Foundational tasks marked [P] can run in parallel (within Phase 2).
- Once Foundational phase completes, both User Story 1 and User Story 2 can start in parallel (if team capacity allows).

---

## Parallel Example: User Story 1

```bash
# Launch unit tests for User Story 1 together:
Task: "Create unit tests for status transition logic in apps/api/src/modules/workflow/workflow.service.spec.ts"
Task: "Create unit tests for transition guard enforcement in apps/api/src/guards/workflow-state.guard.spec.ts"
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
