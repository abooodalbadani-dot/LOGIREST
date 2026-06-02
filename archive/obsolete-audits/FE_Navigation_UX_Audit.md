# Navigation Flow, Routing Continuity & UI Actionability — Audit Report

**Project:** Kitchen-Store Inventory System  
**Audit Date:** 2026-05-12  
**Auditor:** Senior UX/UI Engineer & Frontend Routing Specialist  
**Scope:** 92 pages, 56 navigation links, 23 forms, 6 workflow modules (PR/PO/GRN/Issue/Transfer/Stocktake)

---

## 1. Dead Links & Empty Actions

### ✅ Sidebar — All 32 Links Valid
Every sidebar item in `Sidebar.tsx` has a valid `href` pointing to an existing page. No dead links, no `href="#"`, no `onClick={() => {}}`.

| Group | Count | Status |
|-------|-------|--------|
| Dashboard | 1 | ✅ |
| Inventory | 9 | ✅ |
| Procurement | 2 | ✅ |
| Communications | 3 | ✅ |
| Master Data | 11 | ✅ |
| Reports | 1 | ✅ |
| Admin | 5 | ✅ |

### ✅ Topbar — All 7 Links Valid
Search, profile, locale switcher, theme toggle, logout, context selector, mobile menu — all wired.

### ✅ Dashboard Widgets — All 13 Links Valid
PendingDocumentsWidget, NearExpiryWidget, KitchenDashboard, AdminDashboard, StoreManagerDashboard — all point to existing routes.

### ✅ Reports Hub — All 6 Links Valid
Available inventory, movements, expiry, stocktake variance, procurement status, currency summaries — all exist.

### ✅ Inventory Sub-Layout Tabs — All 4 Links Valid
Balance, Lots, Movements, Scan — all valid.

### ⚠️ Dead Code Found

| # | Severity | File | Line(s) | Issue |
|---|----------|------|---------|-------|
| D1 | Low | `Sidebar.tsx` | 147-151 | `visibleItems` filter always returns `true` — unused variable. If all items were permission-gated, the group heading would still render empty |
| D2 | Low | `lib/navigationMap.ts` | entire file | Zero imports anywhere — 100% dead code. Contains duplicated nav data that should be deleted or adopted as single source of truth |
| D3 | Low | `MasterDataFormLayout.tsx` | interface | All master-data forms pass `backHref` prop but the component doesn't accept it — `backHref` is silently ignored |

---

## 2. Orphaned Screens (Unreachable Pages)

These pages **exist in the route tree** but have **no link** from sidebar, topbar, dashboard, or any other navigation element.

| # | Route | File | How User Reaches It | Severity |
|---|-------|------|---------------------|----------|
| O1 | `/inventory/expired-override` | `apps/web/src/app/[locale]/(app)/inventory/expired-override/page.tsx` | **ORPHANED** — Not linked from sidebar, inventory tabs, or any known component | ❌ **UNREACHABLE** |
| O2 | `/inventory/transfers/hub` | `apps/web/src/app/[locale]/(app)/inventory/transfers/hub/page.tsx` | **ORPHANED** — Not linked from sidebar or any component | ❌ **UNREACHABLE** |
| O3 | `/admin/roles/matrix` | `apps/web/src/app/[locale]/(app)/admin/roles/matrix/page.tsx` | **ORPHANED** — Not linked from Roles list, detail, or sidebar | ❌ **UNREACHABLE** |
| O4 | `/communications/notifications/settings` | `apps/web/src/app/[locale]/(app)/communications/notifications/settings/page.tsx` | **ORPHANED** — Not linked from notifications list | ❌ **UNREACHABLE** |
| O5 | `/master-data/import/items` | `apps/web/src/app/[locale]/(app)/master-data/import/items/page.tsx` | **ORPHANED** — Import hub links only to `/master-data/import`. Sub-pages (items/uoms/barcodes) have no links | ❌ **UNREACHABLE** |
| O6 | `/master-data/import/uoms` | `apps/web/src/app/[locale]/(app)/master-data/import/uoms/page.tsx` | Same as O5 | ❌ **UNREACHABLE** |
| O7 | `/master-data/import/barcodes` | `apps/web/src/app/[locale]/(app)/master-data/import/barcodes/page.tsx` | Same as O5 | ❌ **UNREACHABLE** |

**Total orphaned: 5 unique screens** (O5/O6/O7 count as 1 import group — 3 files but feature is one unit)

### Reachable but Not in Sidebar
These pages are reachable via dashboard widgets or context-specific buttons (acceptable):

| Route | How to Reach |
|-------|-------------|
| `/profile` | Topbar user avatar dropdown |
| `/context-selector` | Topbar context selector button |
| `/search` | Topbar search icon |
| `/barcodes/mapping` | Action button on Barcode list |

---

## 3. Workflow Dead-Ends (Missing Business Logic Links)

### PURCHASING MODULE (PR / PO / GRN)

| # | Severity | Page | File | Line | Issue |
|---|----------|------|------|------|-------|
| W1 | 🔴 High | PR List | `PRListClient.tsx` | 83-102 | **No 3-dot action menu** — only a single "View" icon. No Edit, Delete, Approve row actions |
| W2 | 🔴 High | PO List | `POListClient.tsx` | 92-112 | Same — no 3-dot action menu |
| W3 | 🔴 High | GRN List | `GRNListClient.tsx` | 93-114 | Same — no 3-dot action menu |
| W4 | 🔴 High | PO Detail | `PODetailClient.tsx` | 49-63 | **No "Convert to GRN" button** after PO approval — user must manually navigate to GRN create. Missing `ActionGuard` for `CONVERT_TO_GRN` or equivalent |
| W5 | 🟡 Medium | PR Approve | `PRApprovalClient.tsx` | 72, 88 | After approve/reject → redirects to `/purchase-requests` instead of PR detail page. User misses the now-visible "Convert to PO" button |
| W6 | 🟡 Medium | PO Approve | `POApproveClient.tsx` | 71, 87 | After approve/reject → redirects to list instead of detail page |
| W7 | 🟡 Medium | PR Form | `purchase-request-form.tsx` | 166 | After create/submit → redirects to list (`/purchase-requests`) instead of new PR detail page |
| W8 | 🟡 Medium | PO Form | `POForm.tsx` (page-level) | entire file | Duplicate 475-line form at page level. Missing `useUnsavedChangesGuard` and `actions` prop for workflow buttons compared to feature-level `purchase-order-form.tsx` |

### OPERATIONS MODULE (Issue / Transfer / Stocktake / Adjustment / Kitchen Request)

| # | Severity | Page | File | Line | Issue |
|---|----------|------|------|------|-------|
| W9 | 🟡 Medium | Issue List | `IssueListClient.tsx` | 113-131 | No 3-dot action menu |
| W10 | 🟡 Medium | Transfer List | `TransferListClient.tsx` | 94-112 | No 3-dot action menu |
| W11 | 🟡 Medium | Stocktake List | `StocktakeListClient.tsx` | 110-129 | No 3-dot action menu |
| W12 | 🟡 Medium | Adjustment List | `AdjustmentListClient.tsx` | 108-126 | No 3-dot action menu |
| W13 | 🟡 Medium | Kitchen Req List | `KitchenRequestsListClient.tsx` | 56-112 | No dedicated action column — only request_number link. No Approve/Reject/Fulfill row actions |
| W14 | 🟡 Medium | Transfer New | `TransferNewClient.tsx` | 107-109 | After create → redirects to list (`/transfers`). User must search for their new transfer to Ship it |
| W15 | 🟡 Medium | Adjustment New | `AdjustmentCreateClient.tsx` | 91-93 | After create → redirects to list instead of detail page |
| W16 | 🟡 Medium | Kitchen Req New | `KitchenRequestFormClient.tsx` | 74-77 | After create → redirects to list instead of detail page |
| W17 | 🟡 Medium | Adjustment Form | `AdjustmentForm.tsx` | 172, 224 | Save (on create) and Post both redirect to list (`/adjustments`) instead of detail page |

### ✅ Correctly Implemented Workflows

| Workflow | Quality | Notes |
|----------|---------|-------|
| **Stocktake** | ⭐ **Excellent** | Create → Start → Count → Variance Review → Approve → Post — every step redirects to the correct next page. Best-in-codebase |
| **GRN** | ✅ Good | Create redirects to detail. Post redirects to detail |
| **Issue** | ✅ Good | Create redirects to detail. Post redirects to list (acceptable since POST is terminal) |
| **PO Create** | ✅ Good | Redirects to detail correctly |
| **PR Form buttons** | ✅ Good | Save, Submit, Approve, ConvertToPO all present and wired |

---

## 4. Breadcrumbs & Back Navigation

### 🔴 `router.back()` Usage — 24 Instances (Unpredictable Navigation)

`router.back()` sends the user to whatever page was in browser history. If the user arrived via direct link, bookmark, notification email, or page refresh, `router.back()` may dump them on the login page or an entirely unrelated page.

**All instances:**

| # | Page | File | Line | Suggested Fix |
|---|------|------|------|---------------|
| B1 | PR Detail View | `PRViewer.tsx` | 136 | `push('/purchase-requests')` |
| B2 | PR Form (Cancel) | `PRForm.tsx` | 381 | `push('/purchase-requests')` |
| B3 | PR Approve | `PRApprovalClient.tsx` | 101 | `push('/purchase-requests/${id}')` |
| B4 | PO Detail View | `POViewer.tsx` | 173 | `push('/purchase-orders')` |
| B5 | PO Form (Cancel) | `POForm.tsx` | 457 | `push('/purchase-orders')` |
| B6 | PO Approve | `POApproveClient.tsx` | 100 | `push('/purchase-orders/${id}')` |
| B7 | GRN Detail View | `GRNViewer.tsx` | 234 | `push('/goods-received')` |
| B8 | GRN Post (Cancel) | `GRNPostClient.tsx` | 152 | `push('/goods-received/${id}')` |
| B9 | Issue Detail View | `IssueViewer.tsx` | 53 | `push('/issues')` |
| B10 | Issue Create Form | `issue-form.tsx` | 351 | `push('/issues')` |
| B11 | Issue Scan Mode | `issue-scan-client.tsx` | 131 | `push('/issues/${id}')` |
| B12 | Transfer Detail View | `TransferViewer.tsx` (page) | 39 | `push('/transfers')` |
| B13 | Transfer View | `transfer-viewer.tsx` (feature) | 40 | `push('/transfers')` |
| B14 | Transfer Ship | `TransferShipClient.tsx` | 111 | `push('/transfers/${id}')` |
| B15 | Transfer Receive | `TransferReceiveClient.tsx` | 130 | `push('/transfers/${id}')` |
| B16 | Transfer Dispute | `TransferDisputeClient.tsx` | 41 | `push('/transfers/${id}')` |
| B17 | Stocktake View | `StocktakeViewer.tsx` | 77 | `push('/stocktake')` |
| B18 | Stocktake New | `stocktake-form.tsx` | 122 | `push('/stocktake')` |
| B19 | Stocktake Start | `StocktakeStartClient.tsx` | 91 | `push('/stocktake/${id}')` |
| B20 | Adjustment Detail View | `AdjustmentViewer.tsx` | 54 | `push('/adjustments')` |
| B21 | Kitchen Request View | `KitchenRequestViewer.tsx` | 65 | `push('/kitchen-requests')` |
| B22 | Kitchen Request Form | `KitchenRequestForm.tsx` | 189 | `push('/kitchen-requests')` |
| B23 | Error State | `ErrorState.tsx` | 64 | Generic fallback — acceptable |
| B24 | Permission Denied | `PermissionDenied.tsx` | 22 | Generic fallback — acceptable |

### 🔴 Pages Completely Missing Back Navigation

| # | Page | File | Issue |
|---|------|------|-------|
| B25 | Adjustment Create | `AdjustmentCreateClient.tsx:98-121` | **No back button anywhere** — breadcrumb has `href="#"` (non-functional). No Cancel button in header or body. User is trapped on the form |
| B26 | Kitchen Request Create | `KitchenRequestFormClient.tsx:88-91` | **No back button anywhere** — PageHeader has no `backHref`. No Cancel button. No breadcrumb. User cannot return to list |

### 🟡 Header Missing Back Button (only FormFooter bottom Cancel)

| # | Page | File | Issue |
|---|------|------|-------|
| B27 | Adjustment Form (detail/edit) | `AdjustmentForm.tsx:318-339` | Sticky header has title only — no back arrow, no breadcrumb. Must scroll to bottom FormFooter to cancel. Poor UX |

### 🟡 Missing Breadcrumbs on Detail Forms

| # | Page | File | Issue |
|---|------|------|-------|
| B28 | PR Form | `PRForm.tsx` | No breadcrumb. Cancel uses `router.back()` |
| B29 | PO Form | `POForm.tsx` | No breadcrumb. Cancel uses `router.back()` |
| B30 | GRN Form | `grn-form.tsx` (feature) | No breadcrumb |
| B31 | Issue Create Form | `issue-form.tsx` | No breadcrumb. Cancel uses `router.back()` |
| B32 | Stocktake New | `stocktake-form.tsx` | No breadcrumb |

### ✅ Correct Back Navigation (Reference Implementation)

These pages handle back navigation correctly with explicit `backHref`:

| Page | File | Mechanism |
|------|------|-----------|
| Stocktake Count | `StocktakeCountClient.tsx:182-185` | `backHref="/stocktake/${id}"` |
| Stocktake Variance | `StocktakeVarianceClient.tsx:135-138` | `backHref="/stocktake/${id}/count"` |
| Stocktake Post | `StocktakePostClient.tsx:85-101` | `backHref="/stocktake/${id}"` |
| Stocktake Approve | `StocktakeApproveClient.tsx:126-168` | `backHref="/stocktake/${id}"` |
| GRN Scan Mode | `GRNScanClient.tsx:139-153` | `backHref="/goods-received/${id}"` |
| FXRates sub-page | `FXRatesClient.tsx:109-111` | `backHref="/master-data/currencies"` |
| All master-data forms | Various | `onCancel` → `push('/master-data/{entity}')` |

---

## 5. Actionable Checklist

### 🔴 CRITICAL — Must Fix This Week

| # | Area | Task | File(s) | Effort |
|---|------|------|---------|--------|
| 1 | Workflow | **Add "Create GRN from PO" button** to PO Detail — ActionGuard-gated, link to `/goods-received/new?po_id=${id}` | `PODetailClient.tsx` | 1h |
| 2 | Back Nav | **Replace ALL 24 `router.back()` calls** with explicit `router.push('/{parent-list}')` — prioritize detail viewers (PR, PO, GRN, Issue, Transfer, Stocktake, Adjustment, Kitchen Req) | See B1-B22 in section 4 | 2h |
| 3 | Back Nav | **Add Cancel/Back button** to Adjustment Create page | `AdjustmentCreateClient.tsx` | 30m |
| 4 | Back Nav | **Add Cancel/Back button** to Kitchen Request Create page | `KitchenRequestFormClient.tsx` | 30m |
| 5 | Workflow | **Fix redirects**: PR Approve and PO Approve → redirect to detail page instead of list (so user sees next action buttons) | `PRApprovalClient.tsx`, `POApproveClient.tsx` | 30m |
| 6 | Workflow | **Fix redirects**: PR Create, Transfer Create, Adjustment Create, Kitchen Req Create → redirect to detail page instead of list | 4 form files | 30m |
| 7 | Orphaned | **Add navigation links** for 5 orphaned screens: expired-override, transfer-hub, roles-matrix, notification-settings, import-sub-pages | Various | 1h |

### 🟡 HIGH — Fix This Sprint

| # | Area | Task | File(s) | Effort |
|---|------|------|---------|--------|
| 8 | Workflow | **Add 3-dot action menus** to ALL 7 list pages (PR, PO, GRN, Issue, Transfer, Stocktake, Adjustment) with contextual actions per status (Edit for drafts, Approve for submitted, Post for approved, etc.) | `*ListClient.tsx` (7 files) | 4h |
| 9 | Workflow | **Add action column** to Kitchen Request list with Approve/Reject/Fulfill row buttons | `KitchenRequestsListClient.tsx` | 1h |
| 10 | Back Nav | **Add back arrow + breadcrumb** to Adjustment Form detail header | `AdjustmentForm.tsx:318-339` | 30m |
| 11 | Back Nav | **Add breadcrumbs** to procurement forms (PR Form, PO Form, GRN Form) and Issue Create form | 4 files | 1h |
| 12 | Workflow | **Resolve POForm duplication** — merge page-level `POForm.tsx` with feature-level `purchase-order-form.tsx`, add `useUnsavedChangesGuard` and `actions` prop | `POForm.tsx` (page), `purchase-order-form.tsx` | 2h |
| 13 | Workflow | **Fix Adjustment Post redirect** → go to detail page instead of list | `AdjustmentForm.tsx:224` | 15m |

### 🟢 MEDIUM — Fix This Month

| # | Area | Task | File(s) | Effort |
|---|------|------|---------|--------|
| 14 | Dead Code | **Remove unused `navigationMap.ts`** or adopt it as single source of truth for sidebar nav data | `lib/navigationMap.ts`, `Sidebar.tsx` | 1h |
| 15 | Dead Code | **Fix `visibleItems` filter** in Sidebar — apply actual permission gating to hide empty groups | `Sidebar.tsx:147-151` | 30m |
| 16 | Routing | **Fix sidebar active-link** detection to use exact match (avoid `startsWith` false positives for future routes) | `Sidebar.tsx:183` | 30m |
| 17 | Back Nav | **Fix dead `backHref` props** on master-data forms — either update `MasterDataFormLayout` to accept `backHref` or remove the prop from 11 form clients | `MasterDataFormLayout.tsx`, all `*FormClient.tsx` | 1h |

### 🔵 LOW — Polish

| # | Area | Task | File(s) | Effort |
|---|------|------|---------|--------|
| 18 | Navigation | **Audit permission resource granularity** in sidebar — inconsistent `master_data` vs `master_data_categories`/`master_data_suppliers`/`master_data_departments` | `Sidebar.tsx`, `rbac.ts` | 30m |
| 19 | UX | **Verify every `onSuccess` redirect** across all forms goes to the detail page (not list) for consistency | 8 files | 30m |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total navigation links audited | **56** |
| Dead links found | **0** |
| Orphaned/unreachable pages | **5** |
| Workflow continuity gaps | **17** (1 high, 16 medium) |
| `router.back()` instances (unpredictable) | **24** |
| Pages missing back navigation entirely | **2** |
| Header missing back/close button | **1** |
| Dead code files | **2** |

---

*Audit generated: 2026-05-12*
