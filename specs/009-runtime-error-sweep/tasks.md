# Tasks: Runtime Error Sweep

**Input**: Design documents from `/specs/009-runtime-error-sweep/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Audit script initialization

- [ ] T001 [P] Verify `research.md` decisions and project structure in `specs/009-runtime-error-sweep/`
- [ ] T002 [P] Create the React Key audit script at `e:\Kitchen‑Store Inventory System\scratch\find_missing_keys.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure for error handling and cancellation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 [P] Modify `apiClient.ts` in `apps/web/src/lib/api/client.ts` to support `AbortSignal` in `request` function
- [ ] T004 [P] Implement `GlobalErrorBoundary` in `apps/web/src/components/shared/GlobalErrorBoundary.tsx` to catch render-time errors
- [ ] T005 [P] Setup `window.onunhandledrejection` and `window.onerror` listeners in `apps/web/src/providers/ErrorProvider.tsx` for standardized reporting

**Checkpoint**: Foundation ready - audit and stabilization implementation can now begin

---

## Phase 3: User Story 1 - Production Stability & Hydration (Priority: P1) 🎯 MVP

**Goal**: Eradicate all hydration mismatches and React key warnings across the app

**Independent Test**: Run `npm run build && npm run start` and navigate all routes without console warnings.

### Implementation for User Story 1

- [ ] T006 [P] [US1] Run production build (`next build`) and audit logs for hydration mismatch warnings
- [ ] T007 [P] [US1] Run `scratch/find_missing_keys.py` to identify all `.map()` calls missing `key` props in `apps/web/src`
- [ ] T008 [US1] Resolve identified hydration mismatches in component files (e.g., standardizing date formatting or using `useEffect` for client-only state)
- [ ] T009 [US1] Add unique, stable keys to all identified `.map()` calls in operational components

**Checkpoint**: User Story 1 complete - Console should be clean of React structural warnings

---

## Phase 4: User Story 2 - Concurrency & Conflict Verification (Priority: P1)

**Goal**: Ensure the Conflict Resolution layer is robust under concurrent writes

**Independent Test**: Manual multi-tab verification on a versioned entity (e.g., Stock Balance).

### Implementation for User Story 2

- [ ] T010 [US2] Perform manual conflict simulation by editing `StockBalanceClient.tsx` in two browser tabs simultaneously
- [ ] T011 [US2] Verify `ConflictDialog.tsx` displays the correct "Updated By" and "Current Version" data from the 409 response
- [ ] T012 [US2] Fix any regressions in the `ConflictError` parsing logic in `apps/web/src/lib/api/client.ts`

**Checkpoint**: User Story 2 complete - Concurrency guards are verified functional

---

## Phase 5: User Story 3 - Memory Leak & Promise Safety (Priority: P2)

**Goal**: Eliminate "state update on unmounted component" warnings and secure background tasks

**Independent Test**: Rapidly navigate between list/detail views and confirm zero unmounted state warnings.

### Implementation for User Story 3

- [ ] T013 [US3] Update data-fetching hooks (e.g., `useInventory`, `useKitchenRequests`) to pass `AbortController.signal` to `apiClient`
- [ ] T014 [US3] Implement `useEffect` cleanups in all forms to call `controller.abort()` when the component unmounts
- [ ] T015 [US3] Verify that caught `AbortError` in `apiClient.ts` does not trigger a console error or user-facing toast

**Checkpoint**: All user stories complete - Runtime is clean and memory-safe

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Final verification and documentation

- [ ] T016 Final universal navigation audit across all 50+ routes in `apps/web/src/app`
- [ ] T017 Update `quickstart.md` in `specs/009-runtime-error-sweep/` with the final audit report and remaining low-impact noise
- [ ] T018 Run `python .agent/scripts/checklist.py .` to verify project-wide compliance

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on T001/T002 - Blocks US1, US2, US3
- **User Stories (Phase 3+)**: US1, US2, and US3 can proceed in parallel once Phase 2 is complete
- **Polish (Final Phase)**: Depends on all user stories being closed

### Parallel Opportunities

- T003, T004, and T005 can be implemented simultaneously by different developers.
- US1 (Hydration/Keys) and US2 (Concurrency) can be audited independently.
- US3 (AbortController) can be implemented incrementally across different feature modules.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 & 2.
2. Complete US1 (Hydration & Keys) - This delivers the most visible stability improvement.
3. **VALIDATE**: Production build console must be 100% clean of React warnings.
