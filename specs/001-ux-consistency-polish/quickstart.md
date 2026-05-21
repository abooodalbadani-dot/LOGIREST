# Quickstart: UX Consistency & Polish (Phase 4)

**Date**: 2026-05-21  
**Prerequisites**: Node.js 18+, pnpm, repository cloned

## Setup

```powershell
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app runs at `http://localhost:3000/ar` (Arabic, default) or `http://localhost:3000/en`.

## File Locations

All changes are in `apps/web/src/`:

| Task | Primary Files |
|------|---------------|
| P4-01 (Wire Filters) | `app/[locale]/(app)/(operations)/*/[Type]ListClient.tsx` |
| P4-02 (Date Range) | Same as P4-01 + `features/operations/hooks/use*List.ts` |
| P4-03 (Warehouse Filter) | `adjustments/AdjustmentListClient.tsx`, `issues/IssueListClient.tsx` |
| P4-04 (Print CSS) | `styles/print.css` (NEW), `app/globals.css`, `adjustments/[id]/*`, `stocktake/[id]/*` |
| P4-05 (Print i18n) | `adjustments/[id]/AdjustmentViewer.tsx`, `stocktake/[id]/StocktakeViewer.tsx`, `messages/{ar,en}.json` |
| P4-06 (Sticky Header) | `components/shared/StickyGlassHeader.tsx`, `adjustments/[id]/AdjustmentForm.tsx`, `stocktake/[id]/StocktakeForm.tsx` |
| P4-07 (Column Sort) | `components/shared/DataTable/DataTable.tsx`, all list screens, all list hooks |
| P4-08 (Loading Indicator) | `adjustments/[id]/AdjustmentForm.tsx` |
| P4-09 (Manifest Search) | `stocktake/[id]/StocktakeViewer.tsx`, `stocktake/[id]/StocktakeForm.tsx` |

## Verification Checklist

After implementing each task:

1. **Functional filter toggle**: Click "Filter" button on any list → panel toggles. Active filter count shown.
2. **Date range filter**: Set from/to dates → list shows only matching documents. Clear → full list.
3. **Warehouse filter**: ADMIN sees all warehouses in combobox. WH_KEEPER sees only their scope.
4. **Column sort**: Click column header → sorts ascending. Click again → descending. Arrow icon visible.
5. **Manifest search**: Type item name in stocktake → matching items shown with "X of Y" count.
6. **Print layout**: Print any document → layout consistent across all screens.
7. **Print i18n**: Switch to Arabic → print → header in Arabic. Switch to English → header in English.
8. **Sticky header**: All form/viewer screens use identical sticky header behavior.
9. **Stock refresh loading**: Change warehouse on adjustment form → loading indicator visible.

## Translation Keys to Add

**`messages/en.json`**:
```json
{
  "print": {
    "adjustment_voucher_title": "Warehouse Adjustment Voucher",
    "stocktake_report_title": "Physical Inventory Report"
  },
  "filters": {
    "active_count": "Filters ({count})",
    "date_from": "From Date",
    "date_to": "To Date",
    "warehouse": "Warehouse"
  },
  "stocktake": {
    "manifest_search_placeholder": "Search by name or barcode...",
    "manifest_search_count": "{filtered} of {total} items"
  },
  "adjustment": {
    "refreshing_stock": "Updating stock levels..."
  }
}
```

**`messages/ar.json`**:
```json
{
  "print": {
    "adjustment_voucher_title": "قسيمة تسوية المستودع",
    "stocktake_report_title": "تقرير الجرد المادي"
  },
  "filters": {
    "active_count": "عوامل التصفية ({count})",
    "date_from": "من تاريخ",
    "date_to": "إلى تاريخ",
    "warehouse": "المستودع"
  },
  "stocktake": {
    "manifest_search_placeholder": "بحث بالاسم أو الباركود...",
    "manifest_search_count": "{filtered} من {total} عنصر"
  },
  "adjustment": {
    "refreshing_stock": "جاري تحديث مستويات المخزون..."
  }
}
```

## Running Tests

```powershell
# Run all unit tests
pnpm test

# Run specific test file
pnpm test -- --run apps/web/src/tests/unit/rbac.test.ts
```

## Common Issues

- **Sort/filter params not working**: Backend may not yet accept the new query parameters. Mock adapter should be updated to filter/sort in-memory for local dev.
- **Print styles not applying**: Ensure `styles/print.css` is imported in `globals.css` via `@import './styles/print.css'`.
- **RTL issues**: Always test Arabic locale (`/ar`) to verify RTL layout, icon mirroring, and translated strings.
