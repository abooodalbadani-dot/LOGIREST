# Tasks: Phase 2 — Core Workflow Fixes

**Input**: Design documents from `specs/012-core-workflow-fixes/`  
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not requested — test tasks are omitted. Run `npx vitest run` after each phase to verify no regressions.

**Organization**: Tasks are grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4, US5, US6)
- Exact file paths in all descriptions

---

## Phase 1: Setup (Translation Keys)

**Purpose**: Add all new i18n keys needed by user stories.

- [x] T001 Add translation keys in `apps/web/messages/en.json` and `apps/web/messages/ar.json`: `operations.adjustment.edit_rejected`, `operations.adjustment.rejection_reason_banner`, `operations.transfer.search_placeholder`, `grn.expiry_date_in_past`, `grn.expiry_date_in_past_warning`, `grn.expiry_date_required`, `grn.override_reason`

**Checkpoint**: All translation keys available — user story implementation can begin.

---

## Phase 2: User Story 1 — Search and Filter Transfers (Priority: P1) 🎯 MVP

**Goal**: Enable the search input on the transfer list page so users can filter transfers by document number or warehouse name with debounced search.

**Independent Test**: Open transfer list, type a document number, verify list filters. Clear search, verify full list restores to page 1.

### Implementation for User Story 1

- [x] T002 [US1] Add `search` state, `useDebounce` hook, bind to `<Input>` with `onChange`, pass `debouncedSearch` to `useTransferList` hook, and add `useEffect` to reset page to 1 on search change in `apps/web/src/app/[locale]/(app)/(operations)/transfers/TransferListClient.tsx`
- [x] T003 [US1] Add `search` parameter to `useTransferList` hook signature, append `?search=` to API query, include in query key in `apps/web/src/features/operations/hooks/useTransferList.ts`

**Checkpoint**: Transfer search works. Debounced. Page resets on new search.

---

## Phase 3: User Story 2 — Display Actual Warehouse Names Everywhere (Priority: P1)

**Goal**: Replace translation-key-based warehouse names with actual entity names from master data on all operational list screens.

**Independent Test**: Create a new warehouse, view transfer/adjustment/stocktake lists — new name appears immediately without translation file changes.

**Note**: US2 modifies `TransferListClient.tsx` which US1 also modifies. Implement US2 after US1 to avoid conflicts.

### Implementation for User Story 2

- [x] T004 [US2] Add `useWarehouses` import, build `warehouseMap` via `useMemo`, replace warehouse cell renderers with `warehouseMap.get(id)` lookup displaying locale-appropriate name, in `apps/web/src/app/[locale]/(app)/(operations)/transfers/TransferListClient.tsx`
- [x] T005 [P] [US2] Add `useWarehouses` import, build `warehouseMap` via `useMemo`, replace warehouse cell renderers with entity name lookup in `apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx`
- [x] T006 [P] [US2] Add `useWarehouses` import, build `warehouseMap` via `useMemo`, replace warehouse cell renderers with entity name lookup in `apps/web/src/app/[locale]/(app)/(operations)/stocktake/StocktakeListClient.tsx`

**Checkpoint**: All operational lists show real warehouse names from entity data. New/renamed warehouses appear immediately.

---

## Phase 4: User Story 3 — Edit Rejected Adjustments for Resubmission (Priority: P1)

**Goal**: Enable the EDIT transition from REJECTED to DRAFT so users can fix and resubmit rejected adjustments instead of creating new ones from scratch.

**Independent Test**: Reject a submitted adjustment, verify Edit/Resubmit button appears, click it, verify form opens with rejection reason visible.

### Implementation for User Story 3

- [x] T007 [US3] Add `REJECTED: { EDIT: { targetStatus: DRAFT, allowedRoles: ['ADMIN', 'INV_MGR', 'WH_KEEPER'] } }` transition rule to `transitionMapV2` under ADJUSTMENT in `apps/web/src/core/workflow/document-engine.ts`
- [x] T008 [US3] Render "Edit / Resubmit" button via `ActionGuard` when status is REJECTED and show rejection reason banner above the form in `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentDetailClient.tsx`

**Checkpoint**: Rejected adjustments can be edited and resubmitted. Rejection reason visible during edit.

---

## Phase 5: User Story 4 — View Complete Stocktake Audit Trail (Priority: P1)

**Goal**: Display the full audit trail in stocktake detail (form and viewer) showing every status transition with timestamp and user name, not just the current status.

**Independent Test**: Progress a stocktake through multiple statuses, open detail — verify timeline shows all transitions chronologically.

### Implementation for User Story 4

- [x] T009 [US4] Add `audit_log` field to `StocktakeSessionSchema` in `apps/web/src/features/operations/types/stocktake.ts`: `audit_log: z.array(z.object({ status: z.string(), created_at: z.string(), user_name: z.string().nullable().optional(), comment: z.string().nullable().optional() })).optional()`
- [x] T010 [US4] Replace single-entry timeline construction with `session.audit_log.map()` mapping and add fallback DRAFT entry if audit_log is empty/absent in `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/StocktakeForm.tsx`
- [x] T011 [P] [US4] Apply same `audit_log.map()` timeline construction with fallback in `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/StocktakeViewer.tsx`

**Checkpoint**: Stocktake timeline shows all transitions. Fallback DRAFT entry for legacy sessions.

---

## Phase 6: User Story 5 — Validate GRN Expiry Dates at Receipt (Priority: P2)

**Goal**: Block warehouse keepers from entering past expiry dates on GRN lots, and require inventory managers to provide an override reason.

**Independent Test**: As WH_KEEPER, enter past expiry date — blocked. As INV_MGR, enter past date — warning + override reason → saved.

### Implementation for User Story 5

- [x] T012 [US5] Add `isExpiryInPast` date validation, block save with error toast for WH_KEEPER role, and show warning with mandatory override reason input for INV_MGR/ADMIN roles in the GRN lot entry form in `apps/web/src/app/[locale]/(app)/(operations)/goods-received/` (exact component path to be confirmed during implementation)
- [x] T013 [US5] Add `expiry_date_in_past` error toast and `expiry_date_in_past_warning` with override reason input UI, wired to save handler in the GRN form component

**Checkpoint**: Past expiry dates blocked for WH_KEEPER. INV_MGR can override with reason.

---

## Phase 7: User Story 6 — Enable KITCHEN_CHIEF and STORE_MGR Roles (Priority: P1)

**Goal**: Add KITCHEN_CHIEF and STORE_MGR roles to workflow transition rules so users with these roles can perform their operational duties.

**Independent Test**: Log in as KITCHEN_CHIEF — submit/cancel kitchen requests available. Log in as STORE_MGR — create/submit adjustments and view operations without permission errors.

**Note**: US6 modifies `document-engine.ts` which US3 also modifies. Implement US6 after US3 to avoid conflicts.

### Implementation for User Story 6

- [x] T014 [US6] Add KITCHEN_CHIEF to SUBMIT and CANCEL actions on DRAFT kitchen requests, and to FULFILL and CANCEL actions on SUBMITTED kitchen requests in `transitionMapV2` in `apps/web/src/core/workflow/document-engine.ts`
- [x] T015 [US6] Add STORE_MGR to DRAFT transitions (SUBMIT, CANCEL) for ADJUSTMENT, TRANSFER, STOCKTAKE, and GRN documents, plus APPROVE on SUBMITTED ADJUSTMENT, in `transitionMapV2` in `apps/web/src/core/workflow/document-engine.ts`

**Checkpoint**: KITCHEN_CHIEF can submit/fulfill/cancel kitchen requests. STORE_MGR can operate on adjustments, transfers, stocktakes, and GRNs. Existing roles unchanged.

---

## Phase 8: Polish & Verification

**Purpose**: Verify all changes compile, lint, and build correctly.

- [x] T016 Run `npx tsc --noEmit` from `apps/web/` and fix any type errors in changed files
- [x] T017 [P] Run `npx eslint` from `apps/web/` and fix any lint errors in changed files
- [x] T018 Run `npx next build` from `apps/web/` and verify production build succeeds
- [x] T019 Manual verification: run through all test scenarios from `specs/012-core-workflow-fixes/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Setup (translation keys)
- **US2 (Phase 3)**: Depends on Setup + US1 (shares `TransferListClient.tsx` with US1)
- **US3 (Phase 4)**: Depends on Setup (translation keys for edit button)
- **US4 (Phase 5)**: Depends on Setup only
- **US5 (Phase 6)**: Depends on Setup (translation keys for GRN errors)
- **US6 (Phase 7)**: Depends on US3 (shares `document-engine.ts`)
- **Polish (Phase 8)**: Depends on all user stories

### User Story Dependencies

- **US1**: Independent — only needs Setup
- **US2**: Depends on US1 (same file: `TransferListClient.tsx`)
- **US3**: Independent — only needs Setup
- **US4**: Independent — only needs Setup
- **US5**: Independent — only needs Setup
- **US6**: Depends on US3 (same file: `document-engine.ts`)

### Parallel Opportunities

- **US1 + US3 + US4 + US5** can start in parallel after Setup
- **US2** waits for US1 (same file)
- **US6** waits for US3 (same file)
- **T005 + T006** (US2) are parallel (different files)
- **T010 + T011** (US4) are sequential (Form first, Viewer mirrors)
- **T016 + T017** (Polish) are parallel (typecheck + lint)

---

## Parallel Example

```text
# After Setup (Phase 1):
Developer A: T002+T003 [US1] TransferListClient + useTransferList (search)
Developer B: T007+T008 [US3] document-engine + AdjustmentDetailClient (REJECTED→DRAFT)
Developer C: T009+T010+T011 [US4] stocktake.ts + StocktakeForm/Viewer (audit trail)
Developer D: T012+T013 [US5] GRN form (expiry validation)

# After US1 completes:
Developer A: T004+T005+T006 [US2] Warehouse names on all 3 lists

# After US3 completes:
Developer B: T014+T015 [US6] KITCHEN_CHIEF + STORE_MGR roles
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (translation keys)
2. Complete Phase 2: User Story 1 (transfer search)
3. **STOP and VALIDATE**: Test transfer search independently

### Incremental Delivery

1. Setup → Foundation ready
2. Add US1 → Transfer search works (MVP!)
3. Add US2 → Warehouse names correct everywhere
4. Add US3 → Rejected adjustments can be edited
5. Add US4 → Stocktake audit trail complete
6. Add US5 → GRN expiry validated
7. Add US6 → KITCHEN_CHIEF/STORE_MGR operational
8. Polish → Build verification

### Files Changed Summary

| File | Tasks |
|------|-------|
| `messages/en.json`, `messages/ar.json` | T001 |
| `transfers/TransferListClient.tsx` | T002, T004 |
| `hooks/useTransferList.ts` | T003 |
| `adjustments/AdjustmentListClient.tsx` | T005 |
| `stocktake/StocktakeListClient.tsx` | T006 |
| `core/workflow/document-engine.ts` | T007, T014, T015 |
| `adjustments/[id]/AdjustmentDetailClient.tsx` | T008 |
| `features/operations/types/stocktake.ts` | T009 |
| `stocktake/[id]/StocktakeForm.tsx` | T010 |
| `stocktake/[id]/StocktakeViewer.tsx` | T011 |
| GRN lot entry form (goods-received) | T012, T013 |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- US2 waits for US1 because both modify `TransferListClient.tsx`
- US6 waits for US3 because both modify `document-engine.ts`
- US3, US4, US5 are fully independent and can be implemented in parallel
- All tasks are frontend-only; backend endpoints are prerequisites in spec.md Assumptions
- Commit after each phase checkpoint to maintain atomic rollback points
