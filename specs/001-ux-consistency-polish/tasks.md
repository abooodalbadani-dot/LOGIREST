# Tasks: UX Consistency & Polish (Phase 4)

**Input**: Design documents from `/specs/001-ux-consistency-polish/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, quickstart.md

**Tests**: None requested. Manual verification against acceptance scenarios in spec.md.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `- [ ] [ID] [P?] [Story] Description with file path`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create new files and add shared translation keys needed across all user stories.

- [X] T001 [P] Create `apps/web/src/styles/print.css` with shared print utility classes (`.print-hidden`, `.print-only`, `@media print` container rules per research.md R4)
- [X] T002 [P] Add filter, print, stocktake-search, and stock-refresh translation keys to `apps/web/messages/en.json`
- [X] T003 [P] Add filter, print, stocktake-search, and stock-refresh translation keys to `apps/web/messages/ar.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared component and hook modifications that all user stories build upon.

**⚠️ CRITICAL**: User story implementation depends on these shared changes being complete.

- [X] T004 Enable server-side column sorting in `apps/web/src/components/shared/DataTable/DataTable.tsx` — add `getSortedRowModel`, `sorting` state, `onSortingChange` callback to parent, and sort-direction arrow icon in column headers (per research.md R1)
- [X] T005 [P] Extend `apps/web/src/features/operations/hooks/useAdjustmentList.ts` to accept and pass `date_from`, `date_to`, `sort_by`, `sort_dir` query parameters
- [X] T006 [P] Extend `apps/web/src/features/operations/hooks/useTransferList.ts` to accept and pass `date_from`, `date_to`, `sort_by`, `sort_dir` query parameters
- [X] T007 [P] Extend `apps/web/src/features/operations/hooks/useStocktakeList.ts` to accept and pass `date_from`, `date_to`, `sort_by`, `sort_dir` query parameters

**Checkpoint**: Foundation ready — DataTable supports sorting, list hooks accept date/sort params. User stories can begin.

---

## Phase 3: User Story 1 — Filter, Search, and Sort Across Operational Lists (Priority: P1) 🎯 MVP

**Goal**: Make filter toggles functional across all operational lists, add date range and warehouse filtering, enable column sorting, and add in-manifest search for stocktakes.

**Independent Test**: Open any operational list screen (adjustments, transfers, stocktake), toggle filters, set date range, select a warehouse, click column headers to sort, and search within a stocktake manifest. All operations should filter/sort the displayed data correctly without errors.

### Implementation for User Story 1

- [X] T008 [P] [US1] Wire filter toggle, date range filter, and column sort in `apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx` — add `showFilters` state, `dateFrom`/`dateTo` inputs, active filter count badge, sort state wiring, and connect to `useAdjustmentList` extended params
- [X] T009 [P] [US1] Wire filter toggle, date range filter, and column sort in `apps/web/src/app/[locale]/(app)/(operations)/transfers/TransferListClient.tsx` — same pattern as T008 using `useTransferList`
- [X] T010 [P] [US1] Wire filter toggle, date range filter, and column sort in `apps/web/src/app/[locale]/(app)/(operations)/stocktake/StocktakeListClient.tsx` — same pattern as T008 using `useStocktakeList`
- [X] T011 [US1] Add warehouse filter to `apps/web/src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx` — populate `SmartCombobox` via `useWarehouses()` entity names, auto-apply scope for WH_KEEPER with non-editable selection, hide filter for WH_KEEPER (per research.md R5)
- [X] T012 [P] [US1] Add warehouse filter to `apps/web/src/app/[locale]/(app)/(operations)/issues/IssueListClient.tsx` — same scope-aware pattern as T011
- [X] T013 [P] [US1] Add client-side manifest search by item name and barcode in `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/StocktakeViewer.tsx` — filter with `useMemo`, display "X of Y items" count, show "no matches" when result is empty
- [X] T014 [P] [US1] Add client-side manifest search by item name and barcode in `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/StocktakeForm.tsx` — same pattern as T013

**Checkpoint**: US1 is independently testable — all list screens have functional filters, date ranges, warehouse selection, column sorting, and stocktake manifests are searchable.

---

## Phase 4: User Story 2 — Consistent Print Experience (Priority: P2)

**Goal**: Centralize all duplicate `@media print` CSS into a single shared stylesheet and localize print voucher/report headers for Arabic and English.

**Independent Test**: Print an adjustment voucher and a stocktake report from both English and Arabic UIs. Verify headers display in the correct language, print layout matches pre-refactor behavior, and no component contains inline print CSS.

### Implementation for User Story 2

- [X] T015 [US2] Extract all duplicate `@media print` blocks from `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentForm.tsx`, `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentViewer.tsx`, and `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/StocktakeViewer.tsx` — move rules into `apps/web/src/styles/print.css`, import in `apps/web/src/app/globals.css`, replace inline `<style jsx global>` blocks with `print-hidden` class (per research.md R4)
- [X] T016 [P] [US2] Replace hardcoded English print header text with `t('print.adjustment_voucher_title')` in `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentViewer.tsx`
- [X] T017 [P] [US2] Replace hardcoded English print header text with `t('print.stocktake_report_title')` in `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/StocktakeViewer.tsx`

**Checkpoint**: US2 is independently testable — print output is consistent across all screens and localized in both languages.

---

## Phase 5: User Story 3 — UI Component Consistency and Loading Feedback (Priority: P3)

**Goal**: Unify sticky header implementations by replacing inline `<div>`s with the shared `StickyGlassHeader` component, and add a visible loading indicator when stock levels refresh after warehouse change.

**Independent Test**: Navigate between the adjustment form and stocktake form — sticky headers should look and behave identically. Change the warehouse on an adjustment form — a loading indicator should appear above the line items table while stock refreshes, and action buttons should be disabled.

### Implementation for User Story 3

- [X] T018 [US3] Extend `apps/web/src/components/shared/StickyGlassHeader.tsx` — add `isEditing?: boolean` prop for form-mode styling differentiation (per research.md R7)
- [X] T019 [US3] Replace inline sticky header `<div>` with `<StickyGlassHeader>` in `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentForm.tsx` — pass `title`, `statusBadge`, `actions`, `onBack` props; set `isEditing={true}`
- [X] T020 [P] [US3] Replace inline sticky header `<div>` with `<StickyGlassHeader>` in `apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/StocktakeForm.tsx` — same pattern as T019
- [X] T021 [US3] Add loading indicator for warehouse-change stock refresh in `apps/web/src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentForm.tsx` — add `isRefreshingStock` state, show `<InlineLoader>` above line items table, disable "Add Item" and "Save Draft" buttons during refresh

**Checkpoint**: US3 is independently testable — sticky headers are unified across all document screens, and warehouse-change stock refresh shows clear loading feedback.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification across locales and code quality gates.

- [X] T022 Verify all Phase 4 changes across both Arabic (`/ar`) and English (`/en`) locales — check RTL layout, translated strings, print headers, numeric LTR direction, and Operational Nocturne design token adherence
- [X] T023 Run `pnpm lint` and `pnpm typecheck` (or `tsc --noEmit`) across `apps/web/` and fix any issues

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. All tasks are [P] parallelizable.
- **Foundational (Phase 2)**: Depends on Setup for translation keys (T002/T003). T004 blocks US1 list screen tasks. T005-T007 can run in parallel.
- **User Story 1 (Phase 3)**: Depends on Foundational (T004-T007). All internal tasks are [P] parallelizable.
- **User Story 2 (Phase 4)**: Depends on Setup (T001 for print.css, T002/T003 for translation keys). Independent of other phases.
- **User Story 3 (Phase 5)**: Depends on Setup (T002/T003 for translation keys). T019-T021 depend on T018 (StickyGlassHeader extension).
- **Polish (Phase 6)**: Depends on all user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational (Phase 2). No dependencies on US2 or US3.
- **US2 (P2)**: Can start after Setup (Phase 1). Independent of US1 and US3.
- **US3 (P3)**: Can start after Setup (Phase 1). Independent of US1 and US2.

### Within Each User Story

- T008-T010 (US1): All parallel — different files, same pattern.
- T011 depends on T008 only for shared filter panel state conventions (both in AdjustmentListClient, but T008 sets up the panel structure). T012 is parallel with T011.
- T013-T014 (US1): Parallel — different files.
- T015 (US2): Must complete before T016-T017 since it establishes the import structure. T016-T017 are parallel.
- T018 (US3): Must complete before T019-T021. T019 and T020 are parallel.

### Parallel Opportunities

- All Setup tasks (T001-T003): 3-way parallel
- All Foundational hook tasks (T005-T007): 3-way parallel
- US1 list screen tasks (T008-T010): 3-way parallel
- US1 warehouse filter tasks (T011-T012): 2-way parallel
- US1 manifest search tasks (T013-T014): 2-way parallel
- US2 header localization tasks (T016-T017): 2-way parallel
- US3 form sticky header tasks (T019-T020): 2-way parallel
- **US1, US2, US3 are independent phases**: can be worked on in parallel by different developers once their prerequisites are met

---

## Parallel Example: User Story 1

```bash
# Launch all list screen tasks together (different files, same pattern):
Task: "Wire filter toggle, date range, sort in AdjustmentListClient.tsx (T008)"
Task: "Wire filter toggle, date range, sort in TransferListClient.tsx (T009)"
Task: "Wire filter toggle, date range, sort in StocktakeListClient.tsx (T010)"

# After list screens done, launch warehouse filters in parallel:
Task: "Add warehouse filter in AdjustmentListClient.tsx (T011)"
Task: "Add warehouse filter in IssueListClient.tsx (T012)"

# Launch manifest search tasks together:
Task: "Add manifest search in StocktakeViewer.tsx (T013)"
Task: "Add manifest search in StocktakeForm.tsx (T014)"
```

## Parallel Example: US2 & US3 (Independent Phases)

```bash
# After Setup Phase 1 — run US2 and US3 simultaneously:
# Team member A: Phase 4 (US2)
Task: "Extract print CSS into print.css (T015)"
Task: "Localize print headers in AdjustmentViewer.tsx (T016)"
Task: "Localize print headers in StocktakeViewer.tsx (T017)"

# Team member B: Phase 5 (US3)
Task: "Extend StickyGlassHeader component (T018)"
Task: "Replace inline sticky header in AdjustmentForm.tsx (T019)"
Task: "Replace inline sticky header in StocktakeForm.tsx (T020)"
Task: "Add stock refresh loading indicator in AdjustmentForm.tsx (T021)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T007)
3. Complete Phase 3: User Story 1 (T008-T014)
4. **STOP and VALIDATE**: Test US1 independently — all list screens have functional filters, date ranges, warehouse selection, column sorting, and stocktake manifest search
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Filter, search, sort on all lists → Deploy/Demo (MVP)
3. Add US2 → Localized print experience → Deploy/Demo
4. Add US3 → Unified sticky headers + loading feedback → Deploy/Demo
5. Polish → Final verification → Full release

### Parallel Team Strategy

With 3 developers after Setup + Foundational:

- Developer A: Phase 3 — US1 (T008-T014, 7 tasks)
- Developer B: Phase 4 — US2 (T015-T017, 3 tasks)
- Developer C: Phase 5 — US3 (T018-T021, 4 tasks)

---

## Notes

- [P] tasks contact different files with no inter-task dependencies — safe to run in parallel
- [Story] label maps each task to its user story for traceability (US1, US2, US3)
- Each user story is independently completable and testable per its acceptance scenarios in spec.md
- No backend changes required — if backend doesn't support new query params, the full list is returned (no worse than current state per research.md R6)
- Mock adapter at `apps/web/src/infrastructure/mock/mock-api.adapter.ts` may need updates to filter/sort by the new params for local development
- All strings must use next-intl translation keys — zero hardcoded text per constitution (Code Standards §2)
- Commit after each task or logical group of [P] tasks
