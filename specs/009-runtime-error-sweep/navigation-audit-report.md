# Navigation Flow, Routing Continuity & UI Actionability Audit

**Date**: 2026-05-14  
**Scope**: All 200+ page files under `apps/web/src/app/[locale]/(app)/`  
**Tooling**: Exhaustive static analysis across 367 `.tsx` files in `apps/web/src/`

---

## 1. Dead Links & Empty Actions

The codebase has **zero** instances of `href="#"`, `href=""`, or `onClick={() => {}}` in JSX. However, these **actionable dead-ends** were found:

| Priority | File | Line(s) | Issue |
|---|---|---|---|
| HIGH | `components/shared/SessionTimeoutModal.tsx` | 15-16, 29 | Entire component is a dead placeholder: `const isSessionTimeout = false` + `const resolveSessionTimeout = () => {}`. The modal never shows and the Button does nothing. Either implement or remove. |
| HIGH | `apps/web/src/app/[locale]/(app)/(operations)/yield-management/YieldManagementClient.tsx` | — | **"New Batch" button** has no `onClick` handler and no `href` — it is purely decorative |
| HIGH | `apps/web/src/app/[locale]/(app)/inventory/transfers/hub/TransferHubClient.tsx` | — | **"New Transfer" button** has no `onClick` or `href`. Eye icon and FileCheck icon buttons also lack navigation handlers. |

**Bonus (low priority)** — Default no-op callbacks that could mask bugs:
- `features/master-data/components/MasterDataFormLayout.tsx:31-32` — Default `onSubmit = () => {}` and `onCancel = () => {}`. Callers relying on defaults get silent no-ops.

---

## 2. Orphaned Screens (Unreachable Pages)

These 4 page files exist in the filesystem but have **zero navigation references** (`<Link>`, `router.push`, or `href`) pointing to them from anywhere in the entire `src/` directory:

| # | Route | Full Path |
|---|---|---|
| 1 | `/context-selector` | `apps/web/src/app/[locale]/(app)/context-selector/page.tsx` |
| 2 | `/issues/[id]/scan-mode` | `apps/web/src/app/[locale]/(app)/(operations)/issues/[id]/scan-mode/page.tsx` |
| 3 | `/issues/new/scan-mode` | `apps/web/src/app/[locale]/(app)/(operations)/issues/new/scan-mode/page.tsx` |
| 4 | `/master-data/currencies/[id]/fx-rates` | `apps/web/src/app/[locale]/(app)/master-data/currencies/[id]/fx-rates/page.tsx` |

**Additional concern**: `/inventory/expired-override` and `/inventory/scan-mode` are only linked from the Inventory layout sub-tabs (not the global sidebar). They are reachable but buried.

---

## 3. Workflow Dead-Ends (Missing Business Logic Links)

### 3A. Missing "Create New" / "Add" Buttons on List Pages

| File | Missing Button |
|---|---|
| `apps/web/src/app/[locale]/(app)/admin/users/UserListClient.tsx` | No **"Create User"** button — administrative dead-end |
| `apps/web/src/app/[locale]/(app)/admin/roles/RolesListClient.tsx` | No **"Create Role"** button — administrative dead-end |

All other list pages (PR, PO, GRN, Adjustments, Issues, Kitchen Requests, Stocktake, Transfers, all Master Data lists) correctly have "Create New" buttons.

### 3B. Detail Pages Missing Workflow Action Buttons

| File | Missing Actions | Impact |
|---|---|---|
| `(procurement)/purchase-requests/[id]/PRDetailClient.tsx` | **Approve**, **Submit**, **Convert to PO** | User views a PR but cannot advance it through any workflow stage |
| `(procurement)/purchase-orders/[id]/PODetailClient.tsx` | **Receive Goods**, **Close PO** | Only Approve exists; no way to progress a PO after approval |
| `(operations)/adjustments/[id]/AdjustmentDetailClient.tsx` | **Post**, **Approve** | Adjustment is stuck in whatever status it was created |
| `(operations)/issues/[id]/IssueDetailClient.tsx` | **Post**, **Approve** | Issue cannot be progressed |
| `(operations)/kitchen-requests/[id]/KitchenRequestDetailClient.tsx` | **Fulfill**, **Approve**, **Reject** | Kitchen request is a dead-end |
| `(operations)/transfers/[id]/TransferDetailClient.tsx` | **Ship**, **Receive**, **Dispute** | No buttons linking to the existing `/ship`, `/receive`, `/dispute` sub-pages |

**Contrast**: `StocktakeDetailClient.tsx` does it right — it has Start, Count, Variance Review, Approve, and Post buttons based on document status.

### 3C. Form Submissions Missing Redirect Logic

After a successful create/submit, these pages do **not** redirect the user. The user is left hanging on the form.

| File | Issue |
|---|---|
| `purchase-requests/new/page.tsx` | No `router.push` after PR creation |
| `purchase-orders/new/page.tsx` | No `router.push` after PO creation |
| `goods-received/new/page.tsx` | No `router.push` after GRN creation |
| `issues/new/page.tsx` | No `router.push` after Issue creation |
| `kitchen-requests/new/page.tsx` | No `router.push` after KR creation |
| `admin/settings/SettingsClient.tsx` | Save resets form but does not redirect anywhere |
| `admin/restaurant-profile/ProfileFormClient.tsx` | Save resets form but does not redirect |
| `communications/notifications/settings/NotificationSettingsClient.tsx` | Save button has **no mutation wired at all** |

**Gold standard reference**: `AdjustmentCreateClient.tsx` does `router.push(\`/adjustments/${data.id}\`, { skipGuard: true })` on success.

---

## 4. Breadcrumbs & Back Navigation

### 4A. Breadcrumbs Present ✅ (16 pages)

All Master Data list pages (Items, Categories, Warehouses, Suppliers, Branches, Departments, Barcodes, Currencies, FX Rates, UoM), PRList, POList, GRNList, AdjustmentList, KitchenRequestsList, StocktakeList, TransferReceive/Ship/Dispute sub-pages, Settings.

### 4B. Breadcrumbs Missing ❌ (27+ pages)

| Module | Files |
|---|---|
| **Procurement detail** | `PRDetailClient.tsx`, `PODetailClient.tsx`, `GRNDetailClient.tsx`, `LandedCostClient.tsx` |
| **Operations detail** | `AdjustmentDetailClient.tsx`, `IssueListClient.tsx` (list itself!), `IssueDetailClient.tsx`, `KitchenRequestDetailClient.tsx`, `StocktakeDetailClient.tsx` + all 5 sub-workflow pages (Approve, Count, Post, Start, Variance), `TransferDetailClient.tsx`, `YieldManagementClient.tsx` |
| **All Inventory** | `StockBalanceClient.tsx`, `LotBalanceClient.tsx`, `MovementsClient.tsx`, `ExpiredOverrideClient.tsx`, `ScannerClient.tsx`, `TransferHubClient.tsx` |
| **Master Data detail** | Every `[id]/page.tsx` (Items, Categories, Suppliers, Departments, Warehouses, Branches, Barcodes, Currencies, UoM) |
| **Admin & Comms** | `UserListClient.tsx`, `RolesListClient.tsx`, `AuditLogsClient.tsx`, `ProfileFormClient.tsx`, `profile/page.tsx`, `EmailOutboxClient.tsx`, `notifications/page.tsx`, `TemplateListClient.tsx` |
| **Other** | `SearchClient.tsx`, `ReportsHubClient.tsx` |

### 4C. Back Buttons Present ✅

AdjustmentCreateClient, StocktakeApproveClient, StocktakeCountClient, StocktakePostClient, StocktakeStartClient, StocktakeVarianceClient, TransferReceiveClient, TransferShipClient, TransferDisputeClient, ScannerClient, SettingsClient, NotificationSettingsClient.

### 4D. Back Buttons Missing ❌

All detail pages that lack breadcrumbs (Section 4B) also lack a dedicated "Back" button. Users on these screens cannot navigate back to the parent list except via browser back or re-clicking the sidebar.

---

## Summary of Required Actions

| Category | Count | Files to Fix |
|---|---|---|
| Wire or remove dead stub components | 3 | `SessionTimeoutModal.tsx`, `YieldManagementClient.tsx`, `TransferHubClient.tsx` |
| Add navigation or delete orphaned routes | 4 | `/context-selector`, `/issues/[id]/scan-mode`, `/issues/new/scan-mode`, `/currencies/[id]/fx-rates` |
| Add "Create New" button | 2 | `UserListClient.tsx`, `RolesListClient.tsx` |
| Wire workflow action buttons on detail pages | 5 modules | PR, PO (receive/close), Issue, Kitchen Request, Transfer, Adjustment |
| Add form-submission redirect logic | 8 | PR new, PO new, GRN new, Issue new, KR new, Settings, Profile, NotificationSettings |
| Add breadcrumb navigation | 27+ pages | See Section 4B |
| Add explicit back buttons | All detail pages without breadcrumbs | Same set as Section 4B |
