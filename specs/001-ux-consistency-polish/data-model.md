# Data Model: UX Consistency & Polish (Phase 4)

**Date**: 2026-05-21  
**Scope**: Frontend UI state models (no database schema changes)

## Overview

Phase 4 introduces no new database entities or API contracts. All "entities" are UI state objects managed within React components or TanStack Query caches. This document defines their shape for consistent implementation across all affected screens.

## Entity Definitions

### 1. FilterState

Represents active filter criteria on a list screen.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `string \| undefined` | No | Document status filter (e.g., "DRAFT", "SUBMITTED", "POSTED") |
| `search` | `string \| undefined` | No | Free-text search term (debounced before API call) |
| `dateFrom` | `string \| undefined` | No | ISO date string for range start |
| `dateTo` | `string \| undefined` | No | ISO date string for range end |
| `warehouseId` | `string \| undefined` | No | Selected warehouse ID (auto-set for WH_KEEPER via scope) |
| `showFilters` | `boolean` | Yes | Whether filter panel is expanded (default: `true`) |

**Persistence**: URL query parameters (`?status=&search=&date_from=&date_to=&warehouse_id=`) + React `useState`.

**Derived field**: `activeFilterCount` — count of non-empty filter fields (excluding `showFilters`).

**Applicable screens**: AdjustmentList, TransferList, StocktakeList, IssueList.

---

### 2. SortState

Represents current column sort configuration.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sortBy` | `string \| undefined` | No | Column identifier to sort by (e.g., "created_at", "status") |
| `sortDir` | `'asc' \| 'desc' \| undefined` | No | Sort direction |

**Persistence**: URL query parameters (`?sort_by=&sort_dir=`) + React `useState`. Integrated with TanStack Table's `sorting` state via `onSortingChange`.

**Applicable screens**: All list screens with DataTable (adjustments, transfers, stocktake).

---

### 3. ManifestSearchState

Represents client-side item search within a stocktake session's manifest.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `query` | `string` | Yes | Search term (not debounced — filters in-memory data) |

**Derived field**: `filteredItems` — `session.items.filter(item => item.item_name.toLowerCase().includes(query.toLowerCase()) || item.barcode?.includes(query))`.

**Persistence**: React `useState` only (purely local, no URL persistence).

**Applicable screens**: StocktakeForm, StocktakeViewer.

---

### 4. PrintConfiguration

Not a runtime entity but a build-time organization concern.

| Aspect | Location | Description |
|--------|----------|-------------|
| Shared print CSS | `apps/web/src/styles/print.css` | All `@media print` rules consolidated from 3 components |
| Print utility classes | `.print-hidden`, `.print-only` | Standard classes for show/hide in print mode |
| Print header keys | `messages/{locale}.json` under `print.*` | Localized vouchers: `print.adjustment_voucher_title`, `print.stocktake_report_title` |

---

## State Transition: Filter Lifecycle

```
[User opens list] → showFilters=true, all filters empty
       ↓
[User toggles "Filter" button] → showFilters toggled, filters preserved
       ↓
[User applies filter/sort] → state updated → page reset to 1 → API refetched
       ↓
[API returns results] → data displayed (or empty state if 0 results)
       ↓
[User clears filters via Reset] → all filters cleared → page=1 → API refetched
```

## Relationships

```
ListScreen
├── FilterState (1:1)
├── SortState (1:1)
├── Pagination (1:1)
└── DataTable (1:1)
    └── rows (0..N)

StocktakeScreen
├── ManifestSearchState (1:1)
└── filteredItems (0..N, derived from session.items + ManifestSearchState.query)
```

## Validation Rules

- `dateFrom` and `dateTo` must be valid ISO 8601 date strings when set.
- `sortDir` must be "asc" or "desc" when `sortBy` is set.
- `warehouseId` for WH_KEEPER must match their scope warehouse ID and be non-editable.
- `activeFilterCount` excludes `showFilters` boolean.
- `filteredItems` in manifest search must preserve original item order; only visibility changes.

