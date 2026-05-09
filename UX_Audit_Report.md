# Frontend UX/UI & Navigation Connectivity Audit Report

**Date:** 2026-05-07
**Target:** `apps/web/src/app/[locale]` (Next.js App Router Monorepo)

---

## 1. Total Number of Screens
**116** discrete screens (including dynamic routes, nested routes, and subpages).

## 2. Fully Connected Screens Count
**66** screens are fully connected (accessible via standard navigation paths like Sidebar, Dashboard, or direct parent links).

## 3. Orphan Screens List (50 Screens)
These screens exist in the filesystem but lack clear inward navigation from primary menus or parent lists:

**Operations:**
- `/issues/new/scan-mode`
- `/issues/[id]/scan-mode`
- `/kitchen-requests/new`
- `/stocktake/new`
- `/stocktake/[id]/approve`
- `/stocktake/[id]/count`
- `/stocktake/[id]/post`
- `/stocktake/[id]/start`
- `/stocktake/[id]/variance`
- `/transfers/[id]/receive`
- `/transfers/[id]/ship`

**Procurement:**
- `/goods-received/new`
- `/goods-received/[id]/post`
- `/goods-received/[id]/scan-mode`
- `/purchase-orders/[id]/approve`
- `/purchase-requests/new`
- `/purchase-requests/[id]/approve`
- `/purchase-requests/[id]/edit`

**Admin & Settings:**
- `/admin/roles/[id]`
- `/admin/settings`
- `/admin/users/new`
- `/admin/users/[id]/edit`

**Master Data:**
- `/master-data/barcodes/new`, `/master-data/barcodes/[id]/edit`
- `/master-data/branches/new`, `/master-data/branches/[id]/edit`
- `/master-data/categories/new`, `/master-data/categories/[id]/edit`
- `/master-data/currencies/new`, `/master-data/currencies/[id]/fx-rates`
- `/master-data/departments/new`, `/master-data/departments/[id]/edit`
- `/master-data/fx-rates/new`, `/master-data/fx-rates/[id]/edit`
- `/master-data/items/[id]/edit`
- `/master-data/suppliers/new`, `/master-data/suppliers/[id]/edit`
- `/master-data/units-of-measure/new`, `/master-data/units-of-measure/[id]/edit`
- `/master-data/warehouses/new`, `/master-data/warehouses/[id]/edit`
- `/master-data/import/barcodes`, `/master-data/import/items`, `/master-data/import/uoms`

**Utilities / Unknown:**
- `/communications/notifications/templates/[id]`
- `/context-selector`
- `/inventory/expired-override`
- `/profile`
- `/search`
- `/test-virtual`

## 4. Partially Connected Flows
**A. Stocktake Flow:** 
- Broken transition from `[id]` to `/start` or `/count`. Users can view the stocktake detail but lack clear CTAs to initiate the counting phase or approve variances.
- Missing return navigation after posting a stocktake.

**B. Transfer Flow:**
- `/receive` and `/ship` subpages exist but are conditionally hidden or lack persistent navigation from the main Transfer detail page.

**C. Master Data Creation Flows:**
- Most Master Data list pages exist, but the `/new` and `/[id]/edit` routes are often orphaned (List pages lack a "Create" button, or Detail pages lack an "Edit" button).

**D. Procurement Approval:**
- `/purchase-requests/[id]/approve` and `/purchase-orders/[id]/approve` routes exist, but the transition from "Pending" to the approval screen is not surfaced prominently on the detail view.

## 5. Missing Sidebar Entries
*List-type pages that should theoretically be accessible from the main Sidebar but are missing:*
- `/kitchen-requests`
- `/admin/settings`
- `/communications/notifications/templates`
- `/inventory/expired-override`
- `/inventory/lots`
- `/inventory/movements`
- `/master-data/categories`
- `/master-data/departments`
- `/master-data/import`
- `/master-data/suppliers`

## 6. Missing Dashboard Shortcuts
*High-traffic areas that lack direct access from the Dashboard:*
- `/kitchen-requests` (Critical for operations)
- `/transfers`
- `/goods-received`
- `/purchase-orders`
- `/inventory/balance`
- `/admin/settings`

## 7. Critical UX Gaps
- **Missing Loading States:** `/dashboard`, `/communications/notifications`, `/context-selector`, `/inventory/expired-override`, `/master-data` (root), `/master-data/import/*`, `/profile`.
- **Missing Empty States:** `/kitchen-requests`, `/admin/restaurant-profile`, `/admin/roles`, `/admin/settings`, `/admin/users`, `/inventory/lots`, `/master-data/*` (most master data lists).
- **Missing Error Handling (Mutation Feedback):** Almost all `Create` and `Edit` pages lack explicit error states. Failing a POST/PUT request does not reliably surface a toast or inline alert. (e.g., `/admin/users/new`, `/master-data/items/[id]/edit`).
- **Missing Success Redirects:** Forms like `/stocktake/new`, `/goods-received/new`, and all Master Data `/new` forms do not automatically push the router back to the List page upon successful creation.

## 8. Medium UI Inconsistencies (RTL & i18n)
- **Mixed LTR/RTL Layouts:** Several operational components enforce `dir="ltr"` on numeric/code fields but fail to flip flex layouts or padding correctly. Examples: `/adjustments`, `/issues`, `/stocktake`, `/transfers`, `/goods-received`, `/purchase-orders`.
- **Hardcoded Strings:** Found extensively in `/issues`, `/stocktake`, `/goods-received/[id]`, `/purchase-orders/new`, `/admin/settings`, and mostly in all Master Data components. Translation keys (`t()`) are bypassed for direct English strings.
- **Missing Cancel/Save Buttons:** Master Data creation/edit forms (`/master-data/*/new`, `/master-data/*/[id]/edit`) and `/admin/users/[id]/edit` are missing explicit "Cancel" or "Save" buttons, relying either on generic submits or auto-saving, which is inconsistent with operational forms.

## 9. Minor Design Improvements
- **Input Sizing:** Standardize input heights across standard forms vs. dense table-inline inputs.
- **Table Density:** Master data lists use a different padding/density than operational lists (like PR or PO). Needs unification.
- **Required Indicators:** Asterisks (`*`) or visual cues for required fields are missing on Procurement and Transfer forms.
- **Visual Lock States:** Posted documents (e.g., a POSTED Stocktake or RECEIVED GRN) do not clearly visually distinguish themselves as "Read-Only" (locked). Inputs should be replaced with text nodes or clearly disabled overlays.

## 10. Recommended Fix Roadmap (Priority Ordered)
1. **Connect Orphaned Master Data Flows:** Add "Create" buttons to all Master Data List pages, and "Edit" buttons to all Detail pages. Ensure successful submissions redirect back to the List.
2. **Implement Universal Loading & Empty States:** Wrap all List components in standard `<Skeleton />` loaders and `<EmptyState />` fallbacks.
3. **Fix Operational Subpage Routing:** Connect the Stocktake (`/count`, `/variance`, `/approve`) and Transfer (`/ship`, `/receive`) subpages via prominent, state-aware action buttons on their respective Detail views.
4. **Resolve RTL/LTR Mixed Contexts:** Audit all `dir="ltr"` implementations. Ensure they only apply to specific spans (like Barcodes or SKUs) and not to parent flex containers.
5. **Extract Hardcoded Strings:** Move all English text in Master Data and Admin Settings to the `en.json` and `ar.json` translation files.
6. **Standardize Form Actions:** Ensure every Create/Edit form has a consistent footer with `Cancel` (secondary) and `Save/Submit` (primary) buttons.
7. **Add Mutation Feedback:** Enforce `toast.success` and `toast.error` for all form submissions, coupled with `router.push()` for successful creates.
8. **Dashboard & Sidebar Update:** Add missing critical operational shortcuts (Transfers, Kitchen Requests, GRN) to the Dashboard and Sidebar.