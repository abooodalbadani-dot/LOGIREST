# Research: UX Consistency & Polish (Phase 4)

**Date**: 2026-05-21  
**Status**: Complete

## Research Items

### R1: TanStack Table Sorting Support

**Question**: Does the existing `DataTable` component support column sorting, and what changes are needed to enable it?

**Findings**:
- The `DataTable` component (`apps/web/src/components/shared/DataTable/DataTable.tsx`) currently uses only `getCoreRowModel()` from TanStack Table v8.
- No `getSortedRowModel`, sorting state, or `enableSorting` is configured.
- Column definitions in list screens (AdjustmentListClient, TransferListClient, StocktakeListClient) define `ColumnDef` array but do not set `enableSorting: true` on individual columns.

**Decision**: Enable server-side sorting via query parameters (`sort_by`, `sort_dir`).
- Add `sorting` state and `getSortedRowModel()` to the `useReactTable` call in `DataTable`.
- Use `onSortingChange` callback to propagate sort state to parent list components.
- List screens pass sort state to their respective hooks, which append `?sort_by=X&sort_dir=asc|desc` to API calls.
- Minimum sortable columns per implementation plan: `created_at`, `status`, `warehouse` (adjustments); `created_at`, `status`, `shipped_at` (transfers); `created_at`, `status` (stocktake).

**Alternatives considered**:
- Client-side sorting: rejected because data is paginated server-side; sorting only the current page would be misleading.
- Hybrid approach (sort current page client-side vs full dataset server-side): rejected as inconsistent UX.

---

### R2: FilterPanel Current State

**Question**: Is there an existing `FilterPanel` component, and can it be reused for P4-01?

**Findings**:
- `FilterPanel` already exists at `apps/web/src/components/shared/DataTable/FilterPanel.tsx` with full collapsible behavior, expand/collapse toggle, and reset button.
- It manages its own `isOpen` state internally and exposes `onReset` callback.
- Some list screens already render filter controls inside this panel; others have decorative filter buttons with no handler.

**Decision**: Standardize all list screens to use `FilterPanel` for collapsible filter controls.
- Wire decorative "Filter" buttons to toggle the `FilterPanel` open/closed state.
- Add active filter count badge to the filter toggle label.
- Remove any custom/inline filter toggle implementations in favor of the shared component.

**Alternatives considered**:
- Building a new filter panel from scratch: rejected — `FilterPanel` already exists and works correctly.
- Inline always-visible filters: rejected — wastes vertical space on operational screens where data density matters.

---

### R3: Debounce Utility Availability

**Question**: Is a debounce hook already available in the codebase?

**Findings**:
- `useDebounce` exists at `apps/web/src/hooks/useDebounce.ts`.
- Implementation plan specifies 400ms debounce for transfer list search (P2-01).
- Same hook can be reused for in-manifest stocktake search (P4-09) although that search is client-side (filtering already loaded items, not API calls).

**Decision**: Use existing `useDebounce` hook for all debounced inputs.
- Transfer search: 400ms debounce as specified.
- Stocktake manifest search: instant client-side filtering (no debounce needed since data is already in memory).

---

### R4: Print CSS Centralization Approach

**Question**: Where should centralized print styles live, and what CSS rules are duplicated?

**Findings**:
- The implementation plan (Appendix A) references `styles/print.css` as a new file.
- `apps/web/src/app/globals.css` is the existing global stylesheet.
- `apps/web/src/styles/` directory does not exist yet.
- Three files have duplicate `@media print` blocks: AdjustmentForm, AdjustmentViewer, StocktakeViewer.

**Decision**: Create `apps/web/src/styles/print.css` and import it from `globals.css`.
- Extract all `@media print` rules from the three components into the new file.
- Define shared utility classes: `.print-hidden`, `.print-only`, `.print-header`, `.print-footer`.
- Import via `@import './styles/print.css'` in `globals.css` (Next.js convention).

**Alternatives considered**:
- Putting print styles directly in `globals.css`: rejected — clutters the main stylesheet; separate file is cleaner.
- CSS Modules per component: rejected — defeats the purpose of centralization.

---

### R5: Warehouse Names from Master Data

**Question**: Are warehouse entity names available through existing hooks, or do they rely on translation keys?

**Findings**:
- `useWarehouses()` exists at `apps/web/src/features/warehouses/hooks/useWarehouses.ts`.
- The implementation plan (P2-02) already addresses replacing translation key fallbacks with warehouse entity name lookups.
- Warehouse data includes `name_ar` and `name_en` fields for bilingual display.

**Decision**: Reuse the P2-02 pattern — create a `warehouseMap` memoized lookup from `useWarehouses()` data and use it in filter comboboxes.
- `SmartCombobox` is the existing shared component for entity selection.
- WH_KEEPER scope enforcement (P3-01) already restricts warehouse visibility via `useOperationalScope()`.

---

### R6: Backend API Parameter Support

**Question**: Do backend endpoints accept `date_from`, `date_to`, `sort_by`, `sort_dir` query parameters?

**Findings**:
- The spec's Assumptions section documents that "backend list endpoints either already accept or can be extended to accept" these params.
- The existing `useAdjustmentList` hook already constructs URL params for `status`, `warehouse_id`, `branch_id`, `search`, `page`.
- Backend is being developed in parallel; Phase 4 frontend tasks should send these params and gracefully handle if backend ignores them (show all results unfiltered/unsorted as fallback).

**Decision**: Frontend sends the params; backend support is tracked as a dependency but not blocking for frontend development.
- Add `date_from`, `date_to`, `sort_by`, `sort_dir` to `URLSearchParams` construction in list hooks.
- If backend doesn't filter by these params, the full list is returned and displayed — no worse than current state.
- Mock adapter should be updated to respect these params for local development/testing.

---

### R7: StickyGlassHeader Extension for Form Mode

**Question**: What changes are needed to `StickyGlassHeader` to support both viewer and form modes?

**Findings**:
- `StickyGlassHeader` currently accepts: `title`, `statusBadge`, `actions`, `onBack`, `className`.
- Form components (AdjustmentForm, StocktakeForm) use inline `<div>` with similar styling but independent code.
- The implementation plan suggests adding an `isEditing?: boolean` prop.

**Decision**: Add `isEditing` prop to `StickyGlassHeader` and replace all inline sticky header divs.
- When `isEditing` is true, render an "Editing" indicator or different styling.
- Form components pass their existing header content (title, back navigation, action buttons) as props.
- Viewer components already use `StickyGlassHeader` — no viewer-side changes needed except ensuring `isEditing` defaults to `false`.

