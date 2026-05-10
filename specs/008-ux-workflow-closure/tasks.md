# Tasks: UX Completeness & Workflow Closure

**Input**: Design documents from `/specs/008-ux-workflow-closure/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and audit

- [ ] T001 Audit all list pages in `apps/web/src/app` and document those lacking "Create" buttons in `specs/008-ux-workflow-closure/audit_results.md`
- [ ] T002 Identify all `delete` and `reject` mutations in `apps/web/src` requiring confirmation and list them in `audit_results.md`
- [ ] T003 Create i18n namespaces for UX workflow closure in `apps/web/messages/en.json` and `apps/web/messages/ar.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure for locking and confirmation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 [P] Create `DocumentLock` banner component in `apps/web/src/components/shared/DocumentLock.tsx`
- [ ] T005 [P] Implement `useDocumentLock` hook to manage read-only state in `apps/web/src/hooks/useDocumentLock.ts`
- [ ] T006 [P] Implement `ConfirmationDialog` using shadcn/ui `AlertDialog` in `apps/web/src/components/shared/ConfirmationDialog.tsx`
- [ ] T007 Create `ConfirmationDialogProvider` to manage global modal state in `apps/web/src/providers/ConfirmationProvider.tsx`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Destructive Action Confirmation (Priority: P1) 🎯 MVP

**Goal**: Warn users before permanent data deletion or rejection.

**Independent Test**: Trigger a delete action on a mock entity and verify the `ConfirmationDialog` blocks the mutation until confirmed.

### Implementation for User Story 1

- [ ] T008 [P] [US1] Wrap Inventory deletion mutations (Stocktake, GRN) with `ConfirmationDialog` in their respective feature hooks/components.
- [ ] T009 [P] [US1] Wrap Procurement rejection mutations with `ConfirmationDialog` in `apps/web/src/features/procurement`.
- [ ] T010 [P] [US1] Wrap Master Data (Suppliers, Items) deletion mutations with `ConfirmationDialog`.
- [ ] T011 [US1] Implement "Simple Confirmation" pattern in `ConfirmationDialog.tsx` as per clarified spec.
- [ ] T012 [US1] Verify that `onCancel` resets the UI state without executing the mutation.

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Read-only Closed Documents (Priority: P1)

**Goal**: Lock Approved/Closed documents to prevent accidental edits.

**Independent Test**: Open an Approved stocktake and verify that all inputs are disabled and the lock banner is visible.

### Implementation for User Story 2

- [ ] T013 [P] [US2] Integrate `DocumentLock` banner into `StocktakeDetail` page in `apps/web/src/app/[locale]/(app)/(inventory)/stocktakes/[id]`.
- [ ] T014 [P] [US2] Integrate `DocumentLock` banner into `ProcurementDetail` page.
- [ ] T015 [US2] Implement component-level disabling logic in `DocumentLock` component to iterate through form fields.
- [ ] T016 [US2] Verify that "Back" and "Print" buttons remain active on locked documents.

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently.

---

## Phase 5: User Story 3 - Universal Create Access (Priority: P2)

**Goal**: Ensure every list page has a "Create" button in the header.

**Independent Test**: Visit all list pages identified in T001 and verify the "Create" button is present in the top-right header.

### Implementation for User Story 3

- [ ] T017 [P] [US3] Add "Create Stocktake" button to the Stocktake List page header.
- [ ] T018 [P] [US3] Add "Create Order" button to the Procurement List page header.
- [ ] T019 [P] [US3] Add "Create" buttons to Master Data list headers (Suppliers, Items, Categories).
- [ ] T020 [US3] Standardize top-right header action placement across all list page layouts.

**Checkpoint**: All user stories should now be independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final stabilization and RTL verification

- [ ] T021 [P] Verify RTL alignment for `DocumentLock` banner and `ConfirmationDialog` in Arabic locale.
- [ ] T022 [P] Ensure zero hard-coded strings in new components (RTL/i18n check).
- [ ] T023 Run E2E Playwright tests to validate "Happy Paths" and "Locked Paths".
- [ ] T024 Perform manual audit of identified "dead-end" workflows from Phase 1.
- [ ] T025 Run quickstart.md validation to confirm success criteria.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Must complete audit (T001, T002) to define the full scope of US1 and US3.
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all implementation in US1, US2, and US3.
- **User Stories (Phase 3+)**: All depend on Foundational phase completion.
  - US1 and US2 have P1 priority and should be addressed first.
  - US3 can be worked on in parallel with US1/US2.
- **Polish (Final Phase)**: Depends on completion of all user stories.

### Parallel Opportunities

- T004, T005, T006 can be developed simultaneously.
- T008, T009, T010 (US1 implementation) can run in parallel across different feature modules.
- T013 and T014 (US2 integration) can run in parallel.
- T017, T018, T019 (US3 buttons) can be added to different files in parallel.

---

## Implementation Strategy

### MVP First (P1 Stories Only)

1. Complete Phase 1 & 2 (Audit + Foundation).
2. Complete Phase 3 (US1 - Confirmations).
3. Complete Phase 4 (US2 - Locking).
4. **VALIDATE**: Ensure critical data safety (US1) and integrity (US2) are secured.

### Incremental Delivery

1. Foundation ready.
2. Deliver US1 (Safety) -> Demo.
3. Deliver US2 (Auditability) -> Demo.
4. Deliver US3 (Efficiency) -> Final Phase Closure.

---

## Notes

- [P] tasks = different files, no dependencies.
- [USX] label maps task to specific user story for traceability.
- Each user story is independently testable via its mock/feature target.
- RTL-first constraint is mandatory for all UI tasks.
