# Tasks: Phase 3 — Data Integrity & Scope Isolation

**Input**: Design documents from `specs/013-data-integrity-scope-isolation/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested — test tasks excluded. Verification via `npx tsc --noEmit` and `quickstart.md` manual validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Monorepo web app: `apps/web/src/`
- All paths relative to repository root: `E:\kitchen-store-inventory-system\`

---

## Phase 1: Setup (New Contracts & Infrastructure)

**Purpose**: Create new foundational files that all user stories depend on

- [X] T001 [P] Create operational config contract with `NEXT_PUBLIC_TRANSFER_OVERDUE_DAYS` env var and fallback logic in `apps/web/src/contracts/operational-config.ts`
- [X] T002 [P] Create unified role capabilities contract with per-document-type action→role mapping (8 document types per contracts/README.md) in `apps/web/src/contracts/role-capabilities.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create `useOperationalScope()` hook that reads `warehouseId`/`branchId` from `useAuth().activeScope` in `apps/web/src/hooks/useOperationalScope.ts`
- [X] T004 Add i18n translation keys for scope-related messages (empty-scope, access-denied, skeleton loading aria) in both `messages/en.json` and `messages/ar.json`
- [X] T005 Update mock API adapter to support `warehouse_id`/`branch_id` query param filtering on all operational endpoints and add summary endpoint handlers in `apps/web/src/infrastructure/mock/mock-api.adapter.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 — Warehouse Keeper Sees Only Their Scoped Warehouse Data (Priority: P1) 🎯 MVP

**Goal**: Enforce warehouse scope on all operational list queries and detail views. WH_KEEPER sees only their assigned warehouse's documents. Scope change triggers skeleton + refetch. Empty scope shows message, not unfiltered data. Out-of-scope detail views show access-denied page.

**Independent Test**: Log in as WH_KEEPER scoped to Warehouse A → see only Warehouse A adjustments. Switch scope → skeleton → Warehouse B data. Access Warehouse B detail URL directly → access-denied page.

### Implementation for User Story 1

- [X] T006 [P] [US1] Add `warehouseId` and `branchId` from `useOperationalScope()` to query key and queryFn in `apps/web/src/features/operations/hooks/useAdjustmentList.ts`
- [X] T007 [P] [US1] Add `warehouseId` and `branchId` from `useOperationalScope()` to query key and queryFn in `apps/web/src/features/operations/hooks/useTransferList.ts`
- [X] T008 [P] [US1] Add `warehouseId` and `branchId` from `useOperationalScope()` to query key and queryFn in `apps/web/src/features/operations/hooks/useIssueList.ts`
- [X] T009 [P] [US1] Normalize scope consumption consistently via `useOperationalScope()` in `apps/web/src/features/operations/hooks/useStocktakeList.ts`
- [X] T010 [US1] Wire scope into list screen: add loading skeleton on scope change (clear current data, show placeholder, disable actions) and empty-state message when no scope assigned in `apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx`
- [X] T011 [US1] Wire scope into list screen: add loading skeleton on scope change and empty-state message when no scope assigned in `apps/web/src/app/[locale]/(app)/(operations)/transfers/TransferListClient.tsx`
- [X] T012 [US1] Wire scope into list screen: add loading skeleton on scope change and empty-state message when no scope assigned in `apps/web/src/app/[locale]/(app)/(operations)/stocktake/StocktakeListClient.tsx`
- [X] T013 [US1] Wire scope into list screen: add loading skeleton on scope change and empty-state message when no scope assigned in `apps/web/src/app/[locale]/(app)/(operations)/issues/IssueListClient.tsx`
- [X] T014 [US1] Add access-denied scope guard to operational detail pages: check document `warehouse_id` against active scope before rendering, show access-denied error page if out-of-scope, in `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentDetailClient.tsx` (and equivalent detail pages for transfers, stocktakes, issues)

**Checkpoint**: WH_KEEPER sees only scoped warehouse data. Scope change triggers skeleton + refetch. Access-denied on direct URL manipulation.

---

## Phase 4: User Story 2 — Users See Accurate KPI Metrics Across All Documents (Priority: P2)

**Goal**: Replace page-slice KPI metrics (computed from 10-item page data) with server-side summary endpoints. KPI cards show accurate totals across all matching documents. Invalidate summary data on all relevant mutations.

**Independent Test**: Seed 200 pending adjustments, view page 1 → "Pending" card shows 200. Approve one → card decrements to 199 within 3 seconds.

### Implementation for User Story 2

- [X] T015 [P] [US2] Create Zod schemas for adjustment summary (`total`, `pending`, `critical_losses`), transfer summary (`total`, `in_transit`, `overdue_count`), and stocktake summary (`total`, `in_progress`, `posted`) in `apps/web/src/features/operations/types/` (add to existing type files or create new summary types file)
- [X] T016 [P] [US2] Create `useAdjustmentSummary()` hook fetching `GET /operations/adjustments/summary` with scope params, query key `['adjustments', 'summary', { warehouseId, branchId }]` in `apps/web/src/features/operations/hooks/useAdjustmentSummary.ts`
- [X] T017 [P] [US2] Create `useTransferSummary()` hook fetching `GET /operations/transfers/summary` with scope params, query key `['transfers', 'summary', { warehouseId, branchId }]` in `apps/web/src/features/operations/hooks/useTransferSummary.ts`
- [X] T018 [P] [US2] Create `useStocktakeSummary()` hook fetching `GET /stocktake/sessions/summary` with scope params, query key `['stocktakes', 'summary', { warehouseId, branchId }]`, with 10s refetchInterval in `apps/web/src/features/operations/hooks/useStocktakeSummary.ts`
- [X] T019 [US2] Replace client-side `data?.data?.filter(...)` metric computations with `useAdjustmentSummary()` hook data in `apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx`
- [X] T020 [P] [US2] Replace client-side `data?.data?.filter(...)` metric computations with `useTransferSummary()` hook data in `apps/web/src/app/[locale]/(app)/(operations)/transfers/TransferListClient.tsx`
- [X] T021 [P] [US2] Replace client-side `data?.data?.filter(...)` metric computations with `useStocktakeSummary()` hook data in `apps/web/src/app/[locale]/(app)/(operations)/stocktake/StocktakeListClient.tsx`
- [X] T022 [US2] Add `queryClient.invalidateQueries({ queryKey: ['adjustments', 'summary'] })` to `onSuccess` of adjustment mutation hooks (create, approve, post, cancel, reject) — locate existing hooks in `apps/web/src/features/operations/hooks/` and add invalidation
- [X] T023 [P] [US2] Add `queryClient.invalidateQueries({ queryKey: ['transfers', 'summary'] })` to `onSuccess` of transfer mutation hooks (create, ship, receive, cancel) in `apps/web/src/features/operations/hooks/`
- [X] T024 [P] [US2] Add `queryClient.invalidateQueries({ queryKey: ['stocktakes', 'summary'] })` to `onSuccess` of stocktake mutation hooks (start, count, review, approve, post, close) in `apps/web/src/features/operations/hooks/`

**Checkpoint**: KPI cards show server-side aggregate counts across all pages. Counts update within 3 seconds after mutations.

---

## Phase 5: User Story 3 — Users See Fresh Master Data Immediately After Creating or Editing (Priority: P2)

**Goal**: Newly created or renamed warehouses and items appear in all comboboxes/dropdowns without page refresh. Cache invalidation ensures master data stays fresh.

**Independent Test**: Create a new warehouse → open any warehouse combobox → new warehouse appears without page refresh. Edit a warehouse name → updated name shown everywhere.

### Implementation for User Story 3

- [X] T025 [P] [US3] Verify and ensure `queryClient.invalidateQueries({ queryKey: ['warehouses'] })` is present in `onSuccess` of `useCreateWarehouse` in `apps/web/src/features/warehouses/hooks/useCreateWarehouse.ts`
- [X] T026 [P] [US3] Verify and ensure `queryClient.invalidateQueries({ queryKey: ['warehouses'] })` + targeted `setQueryData` is present in `onSuccess` of `useUpdateWarehouse` in `apps/web/src/features/warehouses/hooks/useUpdateWarehouse.ts`
- [X] T027 [P] [US3] Verify and ensure `queryClient.invalidateQueries({ queryKey: ['items'] })` is present in `onSuccess` of `useCreateItem` in `apps/web/src/features/items/hooks/useCreateItem.ts`
- [X] T028 [P] [US3] Verify and ensure `queryClient.invalidateQueries({ queryKey: ['items'] })` + targeted `setQueryData` is present in `onSuccess` of `useUpdateItem` in `apps/web/src/features/items/hooks/useUpdateItem.ts`
- [X] T029 [US3] Add error handling fallback for KPI cards when summary endpoint is unavailable (show "-" or "Unavailable" instead of 0 or crash) — apply to all three list clients modified in T019-T021

**Checkpoint**: Creating or editing a warehouse/item immediately updates all comboboxes. KPI cards gracefully handle summary endpoint errors.

---

## Phase 6: User Story 4 — Administrators Can Configure the Overdue Transfer Threshold (Priority: P3)

**Goal**: Transfer overdue threshold reads from `NEXT_PUBLIC_TRANSFER_OVERDUE_DAYS` env var with fallback to 3. Overdue count computed server-side via summary endpoint. Client reads threshold for display but does not compute overdue counts client-side.

**Independent Test**: Set env var to 5 days → transfers shipped 4 days ago not flagged as overdue. Set invalid value → falls back to 3.

### Implementation for User Story 4

- [X] T030 [US4] Replace hardcoded `- 3` days in overdue transfer client-side filter with config read from `OPERATIONAL_CONFIG.TRANSFER_OVERDUE_DAYS` (for display label only) in `apps/web/src/app/[locale]/(app)/(operations)/transfers/TransferListClient.tsx`
- [X] T031 [US4] Remove client-side overdue count computation (`data?.data.filter(i => isInTransit && shipped > N days)`); switch to `overdue_count` from `useTransferSummary()` hook data in `apps/web/src/app/[locale]/(app)/(operations)/transfers/TransferListClient.tsx`
- [X] T032 [US4] Ensure overdue count is computed server-side in the transfer summary endpoint with scope params; update mock adapter handler to apply `OPERATIONAL_CONFIG.TRANSFER_OVERDUE_DAYS` threshold when computing `overdue_count` in `apps/web/src/infrastructure/mock/mock-api.adapter.ts`
- [X] T033 [US4] Add input validation fallback for the env var: if `NaN`, negative, or zero → default to 3, in `apps/web/src/contracts/operational-config.ts`

**Checkpoint**: Transfer overdue threshold is configurable via environment variable. Overdue count comes from server-side summary.

---

## Phase 7: User Story 5 — Permission Checks Are Consistently Enforced Across the Application (Priority: P3)

**Goal**: Both `usePermission` (UI permission system) and `canPerformActionV2` (workflow authorization engine) derive from the single `ROLE_CAPABILITIES` contract. No divergence between the two permission models.

**Independent Test**: For every role-document-action combination, verify `usePermission` and `canPerformActionV2` agree. Add a new role → both systems reflect it.

### Implementation for User Story 5

- [X] T034 [US5] Refactor `usePermission` to derive its allow/deny result from `ROLE_CAPABILITIES` contract instead of the independent `PERMISSION_MATRIX` in `apps/web/src/hooks/usePermission.ts` — add adapter logic mapping `(resource, action)` pairs to `(documentType, action)` lookups in the contract
- [X] T035 [US5] Refactor `transitionMapV2` in `document-engine.ts` to derive `allowedRoles` arrays from `ROLE_CAPABILITIES` contract instead of inline role lists in `apps/web/src/core/workflow/document-engine.ts` — ensure status→action→roles mapping reads from the centralized contract
- [X] T036 [US5] Remove or deprecate the standalone `PERMISSION_MATRIX` in `apps/web/src/types/rbac.ts` if no longer independently used (keep as comment reference during transition, then clean up)
- [X] T037 [US5] Verify that `PermissionGate` component still works correctly with the refactored `usePermission` — no functional change expected, verify in `apps/web/src/components/shared/PermissionGate.tsx` (if standalone) or inline usage patterns
- [X] T038 [US5] Run existing RBAC unit tests and update expectations if needed in `apps/web/src/tests/unit/rbac.test.ts`; ensure all 60+ role-document-action combinations pass consistency check

**Checkpoint**: Single source of truth for role capabilities. `usePermission` and `canPerformActionV2` are always in agreement.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, cleanup, and edge case handling

- [X] T039 Verify all operational detail pages (adjustment, transfer, stocktake, issue detail views) include scope validation guard per T014 — audit `apps/web/src/app/[locale]/(app)/(operations)/**/[id]/` directories
- [X] T040 [P] Audit all mutation hooks for scope param attachment per FR-001 — review `apps/web/src/features/operations/hooks/` for approve, post, cancel, edit hooks to ensure they pass `warehouse_id`/`branch_id` in mutation payloads
- [X] T041 Run `npx tsc --noEmit` and fix any TypeScript errors introduced across all changed files
- [ ] T042 Run quickstart.md validation flow: scope isolation, KPI accuracy, cache invalidation, threshold config, RBAC consistency
- [ ] T043 [P] Add i18n keys for any remaining hardcoded strings discovered during implementation in `messages/en.json` and `messages/ar.json`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately (T001, T002 in parallel)
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (T003, T004, T005 sequential or parallel)
- **User Story 1 (Phase 3)**: Depends on Foundational — P1 MVP (T006-T009 parallel; T010-T013 after T006-T009; T014 after T010)
- **User Story 2 (Phase 4)**: Depends on Foundational. Shares list client files with US1 — schedule after US1 list client work to avoid merge conflicts. New hooks (T015-T018, T022-T024) can start in parallel with US1.
- **User Story 3 (Phase 5)**: Depends on Foundational. Independent files — can run in parallel with US1 and US2.
- **User Story 4 (Phase 6)**: Depends on US2 (uses `useTransferSummary` hook and mock adapter from US2). Schedules after US2.
- **User Story 5 (Phase 7)**: Depends on Foundational and T002 (role-capabilities contract). Independent files — can run in parallel with US1-US4.
- **Polish (Phase 8)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: After Foundational — No dependencies on other stories
- **US2 (P2)**: After Foundational — New hooks independent; list client changes after US1 clients
- **US3 (P2)**: After Foundational — No dependencies; independent files
- **US4 (P3)**: After US2 T016-T018 (summary hooks) — Depends on transfer summary hook
- **US5 (P3)**: After Foundational + T002 — No dependencies on US1-US4

### Within Each User Story

- Create types/schemas before hooks
- Create hooks before client components
- Modify list hooks before modifying list clients (within US1)
- Core implementation before integration/cleanup

### Parallel Opportunities

- **Phase 1**: T001 and T002 can run in parallel (different files)
- **Phase 2**: T003, T004, T005 can mostly run in parallel
- **US1**: T006-T009 can run in parallel (4 different hook files); T010-T013 can run in parallel (4 different client files)
- **US2**: T015-T018 can run in parallel (1 schema file + 3 new hooks); T019-T021 + T022-T024 can run in parallel
- **US3**: T025-T028 can all run in parallel (4 different hook files)
- **US5**: T034 and T035 can run in parallel (different files)
- **Cross-story**: US1, US3, US5 can be worked on in parallel by different developers once Foundational completes

---

## Parallel Example: User Story 1

```bash
# Launch all list hook modifications together:
Task: "Add scope to useAdjustmentList.ts"
Task: "Add scope to useTransferList.ts"
Task: "Add scope to useIssueList.ts"
Task: "Add scope to useStocktakeList.ts"

# After hooks complete, launch all client modifications together:
Task: "Wire scope into AdjustmentListClient.tsx"
Task: "Wire scope into TransferListClient.tsx"
Task: "Wire scope into StocktakeListClient.tsx"
Task: "Wire scope into IssueListClient.tsx"
```

## Parallel Example: User Story 2

```bash
# Launch all new hook creations together:
Task: "Create useAdjustmentSummary.ts"
Task: "Create useTransferSummary.ts"
Task: "Create useStocktakeSummary.ts"

# Launch all mutation hook invalidation together:
Task: "Add summary invalidation to adjustment mutation hooks"
Task: "Add summary invalidation to transfer mutation hooks"
Task: "Add summary invalidation to stocktake mutation hooks"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T005)
3. Complete Phase 3: User Story 1 (T006-T014)
4. **STOP and VALIDATE**: Test scope isolation independently per quickstart.md
5. Deploy/demo if ready — WH_KEEPER can no longer see cross-warehouse data

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Scope Isolation) → Test independently → Deploy/Demo (MVP!)
3. Add US2 (KPI Metrics) → Test independently → Deploy/Demo
4. Add US3 (Cache Invalidation) → Test independently → Deploy/Demo
5. Add US4 (Overdue Threshold) → Test independently → Deploy/Demo
6. Add US5 (Unified RBAC) → Test independently → Deploy/Demo
7. Polish → Final validation → Ship

### Parallel Team Strategy

With multiple developers after Foundational:

- Developer A: User Story 1 (scope isolation)
- Developer B: User Story 2 (KPI metrics — new hooks first, client changes coordinate with A)
- Developer C: User Story 3 + User Story 5 (cache invalidation + RBAC — independent files)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Run `npx tsc --noEmit` after each phase to catch type errors early
- Mock adapter (T005, T032) must stay in sync with real backend API contracts
- File conflicts between US1/US2 on list client files — coordinate sequencing or use feature branches
