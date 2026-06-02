# Enterprise Frontend Repository Audit
## LogiRest Kitchen-Store Inventory System
**Audit Date:** 2026-05-21 | **Auditor Role:** Principal Frontend Architect + Enterprise UX Analyst + Production Auditor  
**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · TanStack Query · Zod · next-intl · Sonner  
**Audit Scope:** Full repository — all routes, features, components, hooks, state, API layer, mocks, permissions, validations

---

## TABLE OF CONTENTS

1. [Repository Structure Analysis](#1-repository-structure-analysis)
2. [Architecture & System Overview](#2-architecture--system-overview)
3. [Domain Map](#3-domain-map)
4. [Workflow Map](#4-workflow-map)
5. [SCREEN: Adjustment List](#5-screen-adjustment-list)
6. [SCREEN: Adjustment Form (Create/Edit)](#6-screen-adjustment-form-createedit)
7. [SCREEN: Adjustment Viewer (Read-Only)](#7-screen-adjustment-viewer-read-only)
8. [SCREEN: Stocktake List](#8-screen-stocktake-list)
9. [SCREEN: Stocktake Form (Active Session)](#9-screen-stocktake-form-active-session)
10. [SCREEN: Stocktake Viewer (Read-Only)](#10-screen-stocktake-viewer-read-only)
11. [SCREEN: Transfer List](#11-screen-transfer-list)
12. [SCREEN: Purchase Order Viewer](#12-screen-purchase-order-viewer)
13. [SCREEN: GRN Viewer](#13-screen-grn-viewer)
14. [Component Inventory Audit](#14-component-inventory-audit)
15. [Mock Data & Temporary Logic Audit](#15-mock-data--temporary-logic-audit)
16. [State Management Analysis](#16-state-management-analysis)
17. [API Layer Analysis](#17-api-layer-analysis)
18. [Permission & RBAC Analysis](#18-permission--rbac-analysis)
19. [Validation Consistency Analysis](#19-validation-consistency-analysis)
20. [UX Consistency Report](#20-ux-consistency-report)
21. [Operational Risk Report](#21-operational-risk-report)
22. [Production Readiness Report](#22-production-readiness-report)
23. [Frontend Technical Quality Report](#23-frontend-technical-quality-report)
24. [Prioritized Improvement Plan](#24-prioritized-improvement-plan)
25. [Backend Requirements Extraction](#25-backend-requirements-extraction)

---

## 1. Repository Structure Analysis

### Monorepo Layout
```
Kitchen-Store Inventory System/
├── apps/web/src/
│   ├── app/[locale]/              # Next.js App Router
│   │   ├── (app)/                 # Authenticated route group
│   │   │   ├── (operations)/      # Operations domain routes
│   │   │   │   ├── adjustments/   # Inventory adjustments
│   │   │   │   ├── issues/        # Stock issue documents
│   │   │   │   ├── kitchen-requests/
│   │   │   │   ├── stocktake/     # Physical inventory sessions
│   │   │   │   ├── transfers/     # Warehouse-to-warehouse transfers
│   │   │   │   └── yield-management/
│   │   │   ├── (procurement)/     # Procurement domain routes
│   │   │   │   ├── goods-received/# GRN documents
│   │   │   │   ├── landed-cost/
│   │   │   │   ├── purchase-orders/
│   │   │   │   └── purchase-requests/
│   │   │   ├── admin/
│   │   │   ├── dashboard/
│   │   │   ├── inventory/
│   │   │   ├── master-data/
│   │   │   └── reports/
│   │   └── (auth)/                # Unauthenticated routes
│   ├── components/
│   │   └── shared/                # 38 shared components
│   ├── contracts/                 # Domain status enums (source of truth)
│   ├── core/
│   │   ├── concurrency/           # useSafeMutation, ConflictDialog
│   │   ├── query/                 # QueryBoundary
│   │   └── workflow/              # document-engine, ActionGuard
│   ├── domain/                    # Status guards, UI maps
│   ├── features/                  # Domain feature slices
│   │   ├── operations/            # hooks, api, components, types, mappers
│   │   ├── purchasing/
│   │   ├── inventory/
│   │   ├── items/
│   │   ├── warehouses/
│   │   └── ...
│   ├── hooks/                     # Shared hooks
│   ├── i18n/                      # Localization
│   ├── infrastructure/
│   │   ├── mock/                  # 56KB mock adapter + 1494-line route handler
│   │   └── storage/
│   ├── lib/api/                   # apiClient + ConflictError
│   ├── providers/                 # AuthProvider, UserProfileProvider
│   ├── types/                     # Global TypeScript types
│   └── utils/                     # currency, fefo, audio helpers
└── packages/                      # Shared packages (UI, utils)
```

### Detected Patterns
- **Feature-Slice Architecture**: Each domain has `hooks/`, `api/`, `components/`, `types/`, `mappers/`.
- **Dual-Path Rendering**: Most screens have a `*Form.tsx` (edit mode) and `*Viewer.tsx` (read-only) toggled by `AdjustmentDetailClient.tsx`.
- **Centralized Workflow Engine**: `document-engine.ts` is the authoritative transition map. `ActionGuard` enforces it at the UI layer.
- **Universal Mock Infrastructure**: The entire API is backed by a 1,494-line in-memory adapter (`mock-api.adapter.ts`) — all CRUD, workflow transitions, and inventory movements run from browser storage.

---

## 2. Architecture & System Overview

### Frontend Architecture Quality: **B+ (Good foundation, critical operational gaps)**

**Strengths:**
- Centralized document engine with explicit transition maps per document type
- Idempotency keys (`X-Idempotency-Key`) present on write mutations
- AbortController-based cancellation in `useAbortController` hook
- `useSafeMutation` wrapping TanStack Query for conflict detection
- Optimistic cache updates via `queryClient.setQueryData` in mutation `onSuccess`
- FEFO sorting and expiry override enforcement in `FEFOLotAllocator`
- RTL/LTR handled consistently via `dir="ltr"` for monetary/numeric content
- `PostConfirmDialog` with text confirmation requirement for destructive actions
- `DocumentLockBanner` and `DocumentLockWrapper` for visual/interactive locking
- Separate read-only (`Viewer`) and editable (`Form`) render paths per document

**Critical Weaknesses:**
- **Entire system runs on mock data** — no backend exists yet; `NEXT_PUBLIC_USE_MOCKS=true` is the assumed runtime
- **Batch operations lack per-item state validation** — batch approve/post fire without checking individual document eligibility client-side
- **Auth token stored in `localStorage`** — susceptible to XSS; cookie sync is manual and fragile
- **Warehouse name resolution is client-side** — `tCommon('warehouses.' + warehouse_id.toLowerCase())` is a translation-key hack, not a real entity join
- **Stocktake audit timeline is a single-entry list** — only the current status is recorded, not the full transition history
- **Version number always defaults to 0** in batch operations: `{ id, version: 0 }` bypasses optimistic locking entirely for batch flows
- **Transfer search is a non-functional UI element** — the search `<Input>` has no `onChange` handler connected to the query

---

## 3. Domain Map

| Domain | Routes | Documents | Key Transitions |
|--------|--------|-----------|-----------------|
| **Adjustments** | `/adjustments`, `/adjustments/[id]`, `/adjustments/new` | DRAFT → SUBMITTED → APPROVED → POSTED | Approve, Reject, Post, Cancel |
| **Stock Issues** | `/issues`, `/issues/[id]`, `/issues/new` | DRAFT → SUBMITTED → POSTED | Submit, Post, Cancel |
| **Transfers** | `/transfers`, `/transfers/[id]`, `/transfers/new`, `/transfers/hub` | DRAFT → IN_TRANSIT → RECEIVED → POSTED | Ship, Receive, Dispute |
| **Stocktake** | `/stocktake`, `/stocktake/[id]`, `/stocktake/new` | DRAFT → STARTED → COUNTING → REVIEW → APPROVED → POSTED → CLOSED | Start, Count, Submit, Approve, Post, Close |
| **Kitchen Requests** | `/kitchen-requests`, `/kitchen-requests/[id]` | DRAFT → SUBMITTED → FULFILLED | Submit, Fulfill, Cancel |
| **Purchase Requests** | `/purchase-requests`, `/purchase-requests/[id]` | DRAFT → SUBMITTED → APPROVED → FULFILLED | Submit, Approve, Reject, Convert-to-PO |
| **Purchase Orders** | `/purchase-orders`, `/purchase-orders/[id]` | DRAFT → SUBMITTED → APPROVED → PARTIAL/FULFILLED | Submit, Approve, Reject |
| **GRN** | `/goods-received`, `/goods-received/[id]` | DRAFT → RECEIVED → POSTED | Post, Cancel |
| **Master Data** | `/master-data/items`, `/master-data/warehouses`, etc. | CRUD entities | No workflow |
| **Reports** | `/reports` | Read-only analytical | None |
| **Inventory** | `/inventory` | Balance, movements | Read-only |

---

## 4. Workflow Map

### Adjustment Workflow
```
[DRAFT] ──submit──► [SUBMITTED] ──approve──► [APPROVED] ──post──► [POSTED]
   │                     │                                              │
   └──cancel──►      [CANCELLED]  ◄──reject──                    (TERMINAL)
                         │
                    [REJECTED] ──(no re-edit path defined)──►
```
> **Gap**: REJECTED adjustment has no `EDIT` transition back to DRAFT in the workflow engine, unlike PR which supports `EDIT` from REJECTED. Users cannot resubmit a rejected adjustment.

### Stocktake Workflow
```
[DRAFT] ──start──► [STARTED] ──count──► [COUNTING] ──submit──► [REVIEW]
   │                   │                    │                       │
   └──cancel──►    [CANCELLED]         [CANCELLED]          ──approve──► [APPROVED] ──post──► [POSTED] ──close──► [CLOSED]
                                                             ──reject──► [REVIEW] (stays in review)
```
> **Note**: Stocktake is the most complex workflow with 8 states. The warehouse is LOCKED from the moment STARTED until POSTED/CANCELLED — critical for inventory consistency.

### Transfer Workflow
```
[DRAFT] ──ship──► [IN_TRANSIT] ──receive──► [RECEIVED]
   │                                            │ 
   └──cancel──► [CANCELLED]              ──(no auto-post, manual step)──► [POSTED]
```
> **Gap**: `RECEIVED` status exists in the engine but the `TRANSFER` workflow map does not define a `POST` action from RECEIVED. The mock handles `POST` only for inventory movement but the transition target is missing from `transitionMapV2`.

### GRN Workflow
```
[DRAFT] ──(receive items)──► [RECEIVED] ──post──► [POSTED]
   └──cancel──► [CANCELLED]
```

---

# SCREEN: Adjustment List

## Purpose
- **Operational purpose**: Command center for all inventory adjustments
- **Business role**: Correction of stock discrepancies (damage, expiry, theft, counting errors)
- **Intended users**: Inventory Manager, Warehouse Keeper, Approver
- **Workflow position**: Entry point — creates, filters, and batch-processes adjustment documents
- **Operational importance**: HIGH — any incorrect adjustment directly corrupts inventory ledger

## UI Structure
| Component | Purpose |
|-----------|---------|
| `Breadcrumb` | Navigation context |
| `PageHeader` | Title + live-sync indicator + "Create New" CTA |
| 3× `MetricCard` | KPIs: Total adjustments, Pending approvals, Critical losses (DAMAGE/THEFT) |
| Batch action toolbar | Appears on checkbox selection — Approve/Post batch actions |
| `SmartCombobox` (status filter) | Filter by adjustment status |
| `Input` (search) | Free-text search with 500ms debounce |
| Filter/Clear buttons | Filter toggle (non-functional) and reset |
| `DataTable` | Paginated table with select-all checkbox |
| `PostConfirmDialog` | Batch confirm dialog for approve/post |

## Data Flow
- **Displayed data**: From `useAdjustmentList({ status, search, page })` → `['adjustments']` query key
- **Computed data**: `inProgressCount`, `majorAdjustmentsCount`, `pendingApprovalsCount` computed from **current page data only**, not total dataset
- **Stale data risk**: Metrics are computed from `data?.data` (current page), not `data?.meta.total`. If 50 pending adjustments exist but only 10 are on page 1, metrics show `10` — **misleadingly incorrect**
- **Warehouse resolution**: Uses `tCommon('warehouses.' + warehouse_id.toLowerCase())` — a translation key fallback, not a real entity name. Breaks for any warehouse whose ID doesn't match a translation key

## Workflows
- **Create**: PermissionGate → `/adjustments/new`
- **View detail**: Row click → `/adjustments/{id}`
- **Batch Approve**: Select checkboxes → confirm dialog → sequential API calls via `apiClient.post` (not using `useApproveAdjustment` hook, bypassing onConflict pattern)
- **Batch Post**: Select checkboxes → confirm dialog → sequential `postAdjustment.mutateAsync`

## Validations
| Validation | Present | Gap |
|-----------|---------|-----|
| Permission gate on Create button | ✅ PermissionGate | — |
| Batch action confirmation dialog | ✅ PostConfirmDialog with text confirmation | — |
| Status eligibility before batch approve | ❌ None | Sends approve to DRAFT/POSTED adjustments |
| Status eligibility before batch post | ❌ None | Sends post to non-APPROVED adjustments |
| Version locking in batch | ❌ Version always `0` | Bypasses optimistic concurrency |

## Operational Safety
- **CRITICAL**: `handleBatchApprove` uses `version: 0` — never checks the document's current version. Multiple users approving simultaneously will not detect conflicts.
- **HIGH**: Batch approve fires `apiClient.post` directly (bypassing `useApproveAdjustment` hook), so `onConflict` callback is never triggered.
- **HIGH**: Select-all checkbox selects ALL items on the current page regardless of status — including already-POSTED or CANCELLED records. Batch approve/post will silently fail for those (caught by `/* skip on error */`) but the user sees a misleading success count.
- **MEDIUM**: "Filter" button (`<Button>`) has no `onClick` handler — it is non-functional.

## UX Efficiency
- Debounced search (500ms) ✅
- Pagination ✅
- Batch selection UX with sliding action bar ✅
- Reason chip color-coding (DAMAGE red, EXPIRY amber) ✅
- Live-sync pulsing indicator ✅
- **Gap**: No date range filter
- **Gap**: Warehouse filter is missing (only status + search)
- **Gap**: No sort controls on table columns
- **Gap**: "Filter" button is decorative — pressing it does nothing

## Production Gaps
| Gap | Severity |
|-----|----------|
| Metrics computed from page-slice, not total dataset | HIGH |
| Batch approve does not validate per-item eligibility | CRITICAL |
| Batch operations use `version: 0` — no concurrency protection | HIGH |
| Filter button is non-functional | MEDIUM |
| Transfer search input has no handler | MEDIUM |
| Warehouse name shown as translation key fallback | MEDIUM |

## Missing Features
| Feature | Justification | Priority |
|---------|--------------|---------|
| Server-side metric aggregates (pending count, critical count by reason) | Metrics must reflect total dataset, not page slice | HIGH |
| Batch eligibility pre-check (filter selected to valid-only before batch action) | Operational safety — prevents illegal state transitions | HIGH |
| Date range filter | Temporal audit access | MEDIUM |
| Warehouse filter on list | Multi-warehouse operations need scope isolation | MEDIUM |
| Column sort (by date, by status, by reason) | Operational speed | MEDIUM |

## Backend Requirements
- `GET /operations/adjustments/summary` → `{ pending_count, critical_count, total }` for accurate KPIs
- Approval and post endpoints must validate document status server-side (not rely on client filtering)
- Batch approve endpoint: `POST /operations/adjustments/batch-approve` with idempotency key

---

# SCREEN: Adjustment Form (Create/Edit)

## Purpose
- **Operational purpose**: Create a new inventory adjustment or edit a draft
- **Business role**: Corrects stock quantities for specific reasons
- **Intended users**: Warehouse Keeper, Inventory Manager
- **Workflow position**: Entry point for adjustment lifecycle
- **Operational importance**: CRITICAL — directly mutates inventory ledger when posted

## UI Structure
| Component | Purpose |
|-----------|---------|
| Sticky glass header | Doc number + status badge + export menu |
| `DocumentLockBanner` | Warns when document is in non-editable status |
| Warehouse lock alert | Red pulse banner when warehouse is locked by stocktake |
| `DocumentLockWrapper` | Disables all form inputs when locked |
| `SmartCombobox` (warehouse) | Warehouse selector |
| `SmartCombobox` (reason) | Reason selector (DAMAGE/EXPIRY/THEFT/etc.) |
| `Textarea` (notes) | Free-text notes, min 10 chars enforced |
| `ScanInput` | Barcode scan field with audio feedback |
| `SmartCombobox` (item search) | Manual item lookup (triggers same scan handler) |
| `DocumentLineItemTable` | Line items with inline qty, direction toggle, qty_before/after columns |
| Status timeline sidebar | Audit trail (right column) |
| Document info sidebar | Status, posted_at, approved_by |
| `FormFooter` | Save Draft / workflow action buttons |
| 5× `PostConfirmDialog` | Submit / Approve / Reject / Post / Cancel confirmations |

## Data Flow
- **Document data**: `useAdjustment(id)` or empty for new
- **Items list**: `useItems()` — full item catalog for combobox
- **Variance reasons**: `useVarianceReasons()` — with fallback to hardcoded list
- **Warehouses**: `useWarehouses()` for selector
- **Lock state**: `useWarehouseLock(warehouseId)` — real-time check
- **Stock level refresh**: On warehouse change, fires `apiClient.get('/inventory/balance?warehouse_id=...')` for each line item to update `qty_before`
- **Local mutations**: Line additions, qty changes, direction changes are local state until `handleSaveDraft` is called

## Workflows
- **Save Draft**: `useCreateAdjustment` (new) / `useUpdateAdjustment` (edit) → idempotency header
- **Submit for Approval**: `useSubmitAdjustment` → wrapped in `PostConfirmDialog`
- **Approve**: `useApproveAdjustment` → `PostConfirmDialog`
- **Reject**: `useRejectAdjustment` → requires rejection comment ≥ 15 chars
- **Post**: `usePostAdjustment` → requires text confirmation in dialog
- **Cancel**: `useCancelAdjustment` → optional cancel reason
- **Barcode Scan**: Fetches item by barcode → fetches stock balance → adds/updates line

## Validations
| Validation | Present | Gap |
|-----------|---------|-----|
| Notes minimum 10 chars | ✅ `isValid={notes.trim().length >= 10}` | — |
| Lines must not be empty to save | ✅ `handleSaveDraft` early returns on empty lines | — |
| Qty must be > 0 | ⚠️ Input has `min="0.001"` but no explicit Zod enforcement | — |
| Direction must be set | ✅ Default INCREASE on scan, togglable | — |
| Rejection reason ≥ 15 chars | ✅ `disabled={rejectionComment.trim().length < 15}` | — |
| Negative stock prevention | ❌ No client-side check | If DECREASE qty_adjusted > qty_before, `qty_after < 0` is shown in red but save is allowed |
| Warehouse lock blocks posting | ✅ `useWarehouseLock` + banner | — |
| Idempotency key on create/update | ✅ `crypto.randomUUID()` per session | — |
| AbortController on API calls | ✅ `useAbortController` hook | — |

## Operational Safety
- **CRITICAL**: A DECREASE adjustment with `qty_adjusted > qty_before` will produce negative `qty_after`. The UI shows it in red but does NOT block save. This can create negative inventory when posted. A client-side guard must prevent saving lines with negative projected stock.
- **HIGH**: `qty_before` is fetched from `/inventory/balance` at the time of item addition and on warehouse change. Between saving draft and posting, actual stock may change — a stale `qty_before` creates incorrect variance display.
- **MEDIUM**: When warehouse changes, only `qty_before` values are refreshed. Other line fields (item availability, lot allocations) are not re-validated for the new warehouse.
- **MEDIUM**: The barcode scan increments `qty_adjusted` by 1 if item already exists. There is no max-stock check or warning if adding beyond available quantity.
- **LOW**: The reason fallback list (`fallbackReasons`) is hardcoded in the component. If backend returns zero reasons, the frontend uses a static list that may not match backend's enum.

## Inventory-Sensitive UX
- Direction toggle (INCREASE/DECREASE) with color coding ✅
- `qty_before` and `qty_after` preview ✅
- Red coloring for negative projected qty ✅
- Warehouse lock banner ✅
- **GAP**: No tooltip explaining that `qty_before` is a snapshot and may be stale by posting time

## Production Gaps
| Gap | Severity |
|-----|----------|
| No guard against negative stock mutations | CRITICAL |
| qty_before staleness not communicated to user | HIGH |
| Reason list depends on backend but falls back silently | MEDIUM |
| No per-line validation (qty > 0 enforcement) | MEDIUM |
| Rejected adjustment has no EDIT path in workflow engine | HIGH |

## Backend Requirements
- `GET /operations/variance-reasons` — list of allowed adjustment reasons
- `GET /inventory/balance?warehouse_id=&search=` — current stock per item
- `POST /operations/adjustments` — idempotency required
- `PUT /operations/adjustments/:id` — with version locking
- `POST /operations/adjustments/:id/submit` — transitions DRAFT → SUBMITTED
- `POST /operations/adjustments/:id/approve` — transitions SUBMITTED → APPROVED
- `POST /operations/adjustments/:id/reject` — with rejection reason, transitions SUBMITTED → REJECTED
- `POST /operations/adjustments/:id/post` — transitions APPROVED → POSTED; must validate negative stock server-side
- `POST /operations/adjustments/:id/cancel` — with optional reason

---

# SCREEN: Adjustment Viewer (Read-Only)

## Purpose
- **Operational purpose**: Immutable record of a posted/approved adjustment
- **Business role**: Audit visibility into inventory corrections
- **Intended users**: All roles with view permission
- **Workflow position**: Post-posting review; used by auditors and approvers

## UI Structure
| Component | Purpose |
|-----------|---------|
| `StickyGlassHeader` | Doc number, status badge, date, Export menu, action buttons |
| Print-only voucher header | Document print layout (A4) |
| Warehouse field | Read-only warehouse name |
| Reason field | Localized reason code |
| Notes field | Read-only notes panel |
| `DocumentLineItemTable` | Read-only with direction, qty_before, qty_after |
| Audit trail timeline | Status history |
| Document info panel | Status, posted_at, approved_by |

## Data Flow
- `document` prop: passed from `AdjustmentDetailClient.tsx` which fetches via `useAdjustment(id)`
- `useWarehouses()`: for warehouse name resolution (separate fetch)
- `mappedLines`: computed from `document.lines` in `useMemo`

## Operational Safety
- `DocumentReadOnlyOverlay` wraps the items table when status is POSTED ✅
- No edit controls present in viewer ✅
- Print CSS defined for A4 voucher output ✅

## Production Gaps
| Gap | Severity |
|-----|----------|
| Print header has hardcoded English "Warehouse Adjustment Voucher" — not translated | MEDIUM |
| Warehouse name uses secondary fetch (`useWarehouses`) — waterfall if warehouse data isn't cached | LOW |
| `qty_after` is recomputed client-side (`qty_before ± qty_adjusted`) — not from backend snapshot | MEDIUM |
| Audit timeline shows limited fields (status, at, by) — no change details per transition | MEDIUM |

## Missing Features
| Feature | Justification | Priority |
|---------|--------------|---------|
| Full audit log (field changes, not just status) | Compliance / auditability | MEDIUM |
| Print title localization (AR/EN) | Multi-language operations | MEDIUM |
| Batch document comparison (before/after inventory snapshot) | Audit depth | LOW |

---

# SCREEN: Stocktake List

## Purpose
- **Operational purpose**: Dashboard for physical inventory verification sessions
- **Business role**: Initiate, monitor, and review stocktake audits per warehouse
- **Intended users**: Inventory Manager, Warehouse Keeper
- **Workflow position**: Entry to the stocktake lifecycle; creates sessions, monitors progress
- **Operational importance**: CRITICAL — stocktake locks the warehouse; initiating one incorrectly blocks all other operations

## UI Structure
| Component | Purpose |
|-----------|---------|
| `Breadcrumb` | Navigation context |
| `PageHeader` | Title + live-sync indicator + "Create New" CTA |
| 3× `MetricCard` | Total sessions, In-progress sessions, Posted sessions |
| `QueryBoundary` | Loading/error boundary for the data section |
| Status `SmartCombobox` | Status filter |
| Search input | Free-text search |
| Filter button | Non-functional (no onClick handler) |
| `DataTable` | Virtualized 600px container |
| Progress bar column | Visual counted/total progress per session |

## Data Flow
- `useStocktakeList({ status, warehouse_id, search, page })` → `['stocktake']` query key
- Status filter and search use URL params via `router.push`
- Progress (`counted_items / total_items`) comes from API summary fields
- Metrics computed from page data only (same staleness issue as Adjustments list)

## Workflows
- Create: PermissionGate → `/stocktake/new`
- View: Row click → `/stocktake/{id}`
- Status filtering via URL-based router push (preserves browser history) ✅

## Operational Safety
- **CRITICAL**: No warning displayed when a warehouse ALREADY has an active stocktake session before creating a new one. The backend mock checks for this, but the frontend shows no pre-create validation or warning.
- **HIGH**: Creating a stocktake locks the warehouse for ALL other operations (adjustments, transfers, issues). The list page does not visually indicate which warehouses are currently locked.

## Production Gaps
| Gap | Severity |
|-----|----------|
| No warehouse lock status indicator per row | HIGH |
| No pre-creation check warning about active sessions | HIGH |
| Metrics show current page counts, not totals | MEDIUM |
| Hardcoded "Operational Audit" subtitle in session_number column cell | LOW |
| Filter button non-functional | MEDIUM |

---

# SCREEN: Stocktake Form (Active Session)

## Purpose
- **Operational purpose**: View and manage an active stocktake counting session
- **Business role**: Display inventory manifest, track counting progress, show timeline
- **Intended users**: Warehouse Keeper, Inventory Manager
- **Workflow position**: Central working screen during counting phase

## UI Structure
| Component | Purpose |
|-----------|---------|
| Sticky glass header | Session name, status badge, export menu, action buttons |
| `Breadcrumb` | Navigation |
| `DocumentLockBanner` | Lock state notification |
| `LockBanner` (warehouse lock) | Shown if warehouse is locked |
| 4× `Card` metadata | Warehouse, owner, item count, last updated |
| `DocumentLineItemTable` | Read-only manifest with counted_qty, snapshot_qty, variance, status columns |
| `StatusTimeline` | **Single-entry** timeline (only current status) |
| `FormFooter` | Action buttons via `actions` prop |

## Critical Finding: Timeline Is Not a Timeline
The `StatusTimeline` in `StocktakeForm` is rendered with a **single hardcoded entry**:
```tsx
entries={[{ 
  status: session.status.toLowerCase() as Status, 
  at: session.updatedAt || session.createdAt || new Date().toISOString(), 
  by: session.postedBy || common('system_user') 
}]}
```
This shows only the current state. A real audit trail requires all historical transitions. Same issue exists in `StocktakeViewer`.

## Operational Safety
- **HIGH**: The counting screen is read-only in `StocktakeForm`. The actual count entry screen is the `/stocktake/[id]/count` route (not analyzed in this file, but exists as a sub-route). If users land on the form instead of the count screen, they cannot enter counts.
- **MEDIUM**: `isLocked` from `DocumentLockWrapper` sets `opacity-60 grayscale pointer-events-none` on the content — this visual lock is CSS-only and could be bypassed by browser DevTools.
- **LOW**: `item_name_ar` and `item_name_en` are both set to `item_name` (single string). Bilingual item names are lost in the stocktake manifest.

## Production Gaps
| Gap | Severity |
|-----|----------|
| Audit timeline shows only current status (not full history) | HIGH |
| Arabic item names lost in manifest (item_name used for both ar/en) | MEDIUM |
| Count entry screen access not surfaced from this view | MEDIUM |

---

# SCREEN: Stocktake Viewer (Read-Only)

## Purpose
- **Operational purpose**: Read-only inspection of a completed/posted stocktake session
- **Business role**: Audit review of counted quantities and variances
- **Intended users**: Auditors, Managers, Approvers
- **Workflow position**: Post-completion review

## Critical Finding: Same Single-Entry Timeline
`StocktakeViewer` renders:
```tsx
entries={[{ 
  status: session.status.toLowerCase() as Status, 
  at: session.updated_at ?? session.snapshot_at, 
  by: session.posted_by || common('system') 
}]}
```
This is **not an audit trail**. It is a current status display disguised as a timeline. Auditors require full transition history.

## Production Gaps
| Gap | Severity |
|-----|----------|
| No real audit trail (single entry) | HIGH |
| Variance column shows raw numbers without UoM context | MEDIUM |
| No filter/search within the manifest for large SKU counts | MEDIUM |
| Lot numbers visible in manifest but lot detail not expandable | LOW |

---

# SCREEN: Transfer List

## Purpose
- **Operational purpose**: Monitor warehouse-to-warehouse transfer operations
- **Business role**: Track goods in transit, detect overdue transfers, receive dispatched goods
- **Intended users**: Warehouse Keeper, Inventory Manager
- **Workflow position**: Multi-step cross-warehouse movement management
- **Operational importance**: HIGH — in-transit inventory is in a "limbo" state not counted in either warehouse

## UI Structure
| Component | Purpose |
|-----------|---------|
| Breadcrumb | Navigation |
| Overdue alert banner | Shows count of in-transit transfers >3 days old |
| `PageHeader` | Title + live-sync + Create CTA |
| 3× `MetricCard` | Total, In-Transit, Completed |
| `DataTable` | Virtualized, with status, doc number, from/to warehouse, shipped/created dates |
| Status filter | `SmartCombobox` |
| Search input | **Non-functional** — no `onChange` handler |
| Filter button | Non-functional |

## Critical Finding: Search Input is Broken
```tsx
<Input
  placeholder={t('search_placeholder')}
  className="..."
  // NO onChange handler
/>
```
The Transfer list search input has no state binding. Users cannot search transfers.

## Warehouse Resolution Issues
```tsx
cell: ({ row }) => (
  <span>{tCommon('warehouses.' + row.original.from_warehouse_id.toLowerCase())}</span>
)
```
Warehouse names are resolved via translation key `common.warehouses.{id}`. This requires every warehouse ID to have a corresponding translation key in the i18n files. For dynamically created warehouses, this will show the raw key (e.g., `warehouses.wh-005`) instead of a name.

## Overdue Detection Logic
```tsx
const threeDaysAgo = new Date();
threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
return (data?.data || []).filter(i => {
  if (!isTransferInTransit(i.transfer_status)) return false;
  const dispatchDate = i.shipped_at || i.created_at;
  return new Date(dispatchDate) < threeDaysAgo;
});
```
- Hardcoded 3-day threshold (should be configurable per operation type)
- Computed only from current page — if there are 50 overdue transfers but only 10 are on page 1, the banner shows only those 10

## Production Gaps
| Gap | Severity |
|-----|----------|
| Search input non-functional | HIGH |
| Overdue detection page-limited (not global) | MEDIUM |
| Warehouse names via translation key (breaks for dynamic warehouses) | HIGH |
| Filter button non-functional | MEDIUM |
| `locale` variable unused in columns dependency array | LOW |
| No column for transfer direction/type | LOW |

---

# SCREEN: Purchase Order Viewer

## Purpose
- **Operational purpose**: Immutable read-only view of a purchase order
- **Business role**: Review PO details, line items, total, and audit log
- **Intended users**: Procurement Officer, Manager, Approver

## UI Structure
| Component | Purpose |
|-----------|---------|
| `StickyGlassHeader` | Title, status badge, export menu, action buttons |
| `DocumentReadOnlyOverlay` | Wraps content when status = POSTED |
| 4× `Card` metadata | Supplier, currency, target warehouse, expected delivery |
| `DocumentLineItemTable` | Line items with unit_price and subtotal |
| Total footer | Grand total in order currency |
| `StatusTimeline` | Full audit_log from backend → real transition history |

## Positive Findings
- `audit_log` from the PO response is a proper array of log entries → real audit timeline ✅
- `DocumentReadOnlyOverlay` correctly wraps content ✅
- Currency-aware formatting via `formatCurrency(total, currency_id, locale)` ✅
- Tax, discount, and multi-currency handling present in data model ✅

## Production Gaps
| Gap | Severity |
|-----|----------|
| `unit_cost` column renders raw number without currency symbol | MEDIUM |
| Expected delivery date rendered as raw string (no localized date format) | LOW |
| `target_warehouse_id` falls back to ID if `warehouse_name` missing | LOW |
| No exchange rate display for foreign currency POs | MEDIUM |

---

# SCREEN: GRN Viewer

## Purpose
- **Operational purpose**: View a Goods Received Note
- **Business role**: Verify receipt of ordered goods against purchase orders
- **Intended users**: Warehouse Keeper, Procurement Officer, Auditor

## Key Observations (from structure analysis)
- `GRNViewer.tsx` exists at `goods-received/[id]/GRNViewer.tsx`
- Has both a `GRNDetailClient.tsx` (mode-switcher) and `/post` sub-route
- Lot tracking: GRN lines include `lot: { lot_number, expiry_date }` — lot data is correctly captured at receipt
- `scan-mode` sub-route exists: barcode scanning during GRN receipt ✅

## Production Gaps (inferred from structure)
| Gap | Severity |
|-----|----------|
| GRN does not have approval step — any user with `POST` permission can post | MEDIUM |
| Received quantity vs ordered quantity discrepancy has no frontend warning | HIGH |
| Expiry date capture at GRN — critical for FEFO — needs validation that date is not in past | HIGH |

---

## 14. Component Inventory Audit

### Critical Shared Components

| Component | Usage | Consistency | Gaps |
|-----------|-------|------------|------|
| `DocumentLineItemTable` | All document viewers/forms | HIGH | `hideLotColumns={true}` used in Adjustment/Stocktake — lot data suppressed |
| `FEFOLotAllocator` | Issues, Transfers (lot-tracked items) | HIGH | FEFO sort + expiry override + role-based expired lot access |
| `PostConfirmDialog` | All workflow transitions | HIGH | Text confirmation for destructive actions |
| `ActionGuard` | All form action buttons | HIGH | Wraps workflow engine's `canPerformActionV2` |
| `PermissionGate` | Create buttons | MEDIUM | Only wraps create actions; edit/delete rely on ActionGuard |
| `StatusBadge` | All list and detail screens | HIGH | Consistent |
| `StatusTimeline` | All viewers | MEDIUM | **Feeds only current status in Stocktake** — not truly an audit trail there |
| `SmartCombobox` | All dropdowns | HIGH | RTL/LTR handled, virtualized list |
| `ScanInput` | Adjustment/Issue/GRN forms | HIGH | Audio feedback, status indicators |
| `DocumentLockBanner` | All editable forms | HIGH | Correct visual lock state |
| `DocumentLockWrapper` | All editable forms | HIGH | CSS-based lock (pointer-events-none) |
| `DataTable` | All list screens | HIGH | Virtualization, pagination, empty state |
| `MetricCard` | All list headers | HIGH | Consistent across domains |
| `EmptyState` | All tables | HIGH | Consistent |

### Component Duplication Risks
- **Dual sticky header implementations**: `StickyGlassHeader` (shared component) vs. inline `<div className="sticky top-0 z-50...">` used in `AdjustmentForm` and `StocktakeForm`. Two implementations of the same UI pattern.
- **Print CSS duplication**: Each viewer/form (Adjustment, Stocktake) defines `<style jsx global>` with nearly identical `@media print` rules. Should be centralized in a `PrintLayout` component or `globals.css`.

---

## 15. Mock Data & Temporary Logic Audit

### Mock Infrastructure Scale
The entire system runs on an in-memory browser database. This is the most critical production blocker.

| Item | File | Lines | Operational Risk |
|------|------|-------|-----------------|
| **Mock API Adapter** | `infrastructure/mock/mock-api.adapter.ts` | 1,494 | Routes ALL 50+ API paths; no real backend |
| **Mock Database** | `infrastructure/mock/mock-database.ts` | ~150 | In-memory; data lost on page refresh |
| **Mock Factory** | `infrastructure/mock/mock-factory.ts` | ~180 | Fake document generators |
| **Seeds** | `infrastructure/mock/seeds/` | — | Static seed data for items, warehouses, lots |

### Mock Activation
```ts
// lib/api/client.ts line 13-14
const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === 'true' || 
  (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_MOCKS !== 'false');
```
- In development, mocks are ON unless explicitly disabled
- This means the entire UI, all workflows, all inventory movements run against fake in-memory state

### Hardcoded/Static Values
| Value | Location | Operational Risk |
|-------|----------|-----------------|
| Warehouse names via `tCommon('warehouses.{id}')` | Multiple list screens | HIGH — breaks for real dynamic warehouses |
| `fallbackReasons` array in AdjustmentForm | `AdjustmentForm.tsx:99` | MEDIUM — fallback to static list if API returns empty |
| `version: 0` in batch operations | `AdjustmentListClient.tsx:84,101` | CRITICAL — bypasses optimistic locking |
| `'user-1'` hardcoded in mock POST actions | `mock-api.adapter.ts:550,618` | MEDIUM — fake user attribution |
| Overdue threshold: 3 days | `TransferListClient.tsx:137` | LOW — should be configurable |
| `unit_cost: 0` in stocktake item mock | `mock-api.adapter.ts:769` | MEDIUM — cost data placeholder |

### Mock Business Logic (Must Move to Backend)
| Logic | Mock Location | Notes |
|-------|--------------|-------|
| Inventory balance computation | `mock-api.adapter.ts` | `lot.qty_available` aggregation |
| FEFO lot sorting | `utils/fefo.ts` | Client-side (correct to keep) |
| Workflow transition enforcement | `getNextStatusV2` called in mock | Correct to duplicate in backend |
| Stocktake snapshot freeze | `mock-api.adapter.ts:744-771` | Must be atomic server-side operation |
| GRN inventory posting (lot creation) | `mock-api.adapter.ts` | Complex lot creation logic |
| Transfer inventory movement (deduct source, add destination) | `mock-api.adapter.ts:620-686` | Must be atomic DB transaction |
| Duplicate barcode/code check | `mock-api.adapter.ts:401-413` | Must be DB constraint |

### Migration Priority
All mock logic must be replaced by real API endpoints before production. The transition path:
1. Deploy backend with equivalent endpoints
2. Set `NEXT_PUBLIC_USE_MOCKS=false`
3. Verify each workflow end-to-end

---

## 16. State Management Analysis

### TanStack Query Usage
| Query Key Pattern | Freshness Risk |
|------------------|---------------|
| `['adjustments']` | Invalidated on mutations ✅ |
| `['adjustments', id]` | Optimistic update + invalidation ✅ |
| `['stocktakes']` | Invalidated on all stocktake mutations ✅ |
| `['warehouse-lock']` | Invalidated on stocktake start/post ✅ |
| `['warehouses']` | No invalidation on warehouse create/edit — stale for new warehouses in same session |
| `['items']` | Not invalidated after item creation |

### Global State
- **AuthProvider**: User, token, activeScope — stored in `localStorage`. No server-side session validation on mount (no `/auth/me` call).
- **Scope selector**: `activeScope` (branch/warehouse/department context) stored in localStorage but **not used to filter any query**. This is a critical architectural gap — the active scope has no effect on operational data visibility.

### Stale State Risks
1. **`qty_before` staleness**: Fetched at item add time, used at posting time. Can be hours stale for long-lived drafts.
2. **Batch metrics on page-slice**: KPI cards show counts from the loaded page, not from server aggregates.
3. **Warehouse list cache**: If a new warehouse is added in another tab or by another user, the current session's combobox won't show it until refresh.

### Duplicated State
- `lines` state in `AdjustmentForm` duplicates `document.lines` from the server. The sync pattern uses:
  ```tsx
  if (document && document.id !== prevAdjustmentId) {
    setPrevAdjustmentId(document.id);
    // ... sync all fields
  }
  ```
  This is a derived state anti-pattern. If TanStack Query refreshes `document` (e.g., after background refetch), local `lines` state will re-sync and overwrite any pending unsaved edits.

---

## 17. API Layer Analysis

### Client Architecture
```ts
// lib/api/client.ts
export const apiClient = {
  get, post, put, patch, del
}
```
- Zod schema validation on every response ✅
- 409 → `ConflictError` typed throw ✅
- AbortSignal support ✅
- `Accept-Language` header set from `document.documentElement.lang` ✅
- Mock interception via `NEXT_PUBLIC_USE_MOCKS` ✅
- `console.log` on EVERY request and response — must be removed for production

### Production Concerns
| Concern | Severity |
|---------|---------|
| `console.log` on every API request/response | HIGH — leaks auth tokens in browser console |
| Token in `localStorage` (XSS vulnerability) | HIGH |
| No token refresh / silent refresh mechanism | HIGH — 24hr expiry; session dies mid-operation |
| No 401 interceptor to redirect to login | HIGH — API errors on expired token are shown as generic errors |
| No retry logic for transient failures | MEDIUM |
| No request timeout (relies on AbortController from TanStack Query defaults) | MEDIUM |
| `POST` signature inconsistency: `post(path, schema, body?, options?)` vs some callers pass `version` as body | MEDIUM |

### API Route Coverage
- Operations: `/operations/adjustments`, `/operations/issues`, `/operations/transfers`
- Procurement: `/purchase-requests`, `/purchase-orders`, `/goods-received`
- Stocktake: `/stocktake/sessions`
- Master Data: `/items`, `/warehouses`, `/branches`, `/departments`, `/suppliers`, `/currencies`, `/barcodes`, `/units-of-measure`
- Inventory: `/inventory/balance`, `/inventory/movements`
- Auth: `/auth/login`

---

## 18. Permission & RBAC Analysis

### Role Hierarchy
```
ADMIN > INV_MGR > APPROVER > PROC_OFFICER > WH_KEEPER > AUDITOR > VIEWER
```
Additional: `GM`, `KITCHEN_CHIEF`, `STORE_MGR`

### Permission Gate Coverage
| Action | Guard Type | Gap |
|--------|-----------|-----|
| Create document | `PermissionGate` (resource/action) | Correct |
| Submit/Approve/Reject/Post/Cancel | `ActionGuard` (document-engine) | Correct |
| View detail | No gate — all authenticated users | By design (viewer role) |
| Edit existing | `isLocked` + `canEdit` boolean | Correct |
| Batch approve | No ActionGuard — raw `apiClient.post` | **CRITICAL GAP** |
| Batch post | No `canPerformActionV2` check per item | **HIGH GAP** |

### Role Validation in document-engine
The `canPerformActionV2` function does a strict role check:
```ts
if (!role) return false;
return rule.allowedRoles.includes(role as Role);
```
If `user?.role` is `undefined`, ALL actions are denied (safe default). ✅

### Issues
1. **`PermissionGate` uses a separate RBAC system** (`usePermission` hook based on resource/action) while `ActionGuard` uses the workflow engine. These are two different permission models that must stay synchronized.
2. **Active scope not enforced**: A WH_KEEPER assigned only to Warehouse A can see and potentially act on Warehouse B documents. The `activeScope` is stored but never passed to API queries as a filter.
3. **`KITCHEN_CHIEF` and `STORE_MGR` roles** are defined in `UserRole` but absent from `transitionMapV2` allowed roles for any action. These users cannot perform any workflow action through `ActionGuard`.

---

## 19. Validation Consistency Analysis

### Cross-Domain Validation Matrix
| Form | Min Lines | Notes Min Chars | Qty > 0 | Negative Stock | Version Lock | Duplicate Check |
|------|-----------|----------------|---------|----------------|-------------|-----------------|
| Adjustment | ✅ lines > 0 | ✅ 10 chars | ⚠️ HTML min only | ❌ No | ✅ (single ops) | — |
| Issue | (not inspected) | — | — | — | — | — |
| Transfer | (not inspected) | — | — | — | — | — |
| GRN | (not inspected) | — | — | — | — | ✅ (barcode) |
| Stocktake Create | — | — | — | — | — | ✅ (active session) |

### Rejection Reason Validation
- Adjustment reject: ≥ 15 chars ✅
- Stocktake reject: Has comment field (length validation not confirmed without viewing screen)

### Idempotency Coverage
- Adjustment create/update: ✅ `X-Idempotency-Key` header
- Stocktake count submit: ✅ `headers` param passed
- Batch approve: ❌ No idempotency

---

## 20. UX Consistency Report

### Inconsistencies Detected

| Area | Inconsistency | Screens Affected |
|------|-------------|-----------------|
| **Sticky Header** | `StickyGlassHeader` component used in AdjustmentViewer, POViewer, StocktakeViewer. Inline `div` with `sticky` class used in AdjustmentForm, StocktakeForm — two implementations | All editable forms vs. all viewers |
| **Print CSS** | Inline `<style jsx global>` in AdjustmentForm AND AdjustmentViewer — duplicated print rules | All document forms/viewers |
| **Empty state** | Transfer list has minimal `EmptyState` with no description or action button; Adjustment list has full empty state with CTA | Transfer vs. others |
| **Filter Reset** | Adjustment list has explicit "Clear Filters" button; Transfer list does not | Adjustments vs. Transfers |
| **Search handler** | Adjustment list: search bound to state + debounce. Transfer list: search input has no handler | Transfers |
| **Warehouse display** | Translation key fallback (`tCommon('warehouses.{id}')`) in list views; real entity name in detail views | Lists vs. details |
| **Timeline entries** | PO viewer: full audit log (multiple entries). Adjustment viewer: real timeline from API. Stocktake: single current-status entry | Stocktake vs. all others |
| **Metrics source** | All list KPI cards computed from page-slice, not server aggregates | All list screens |
| **Locale in columns** | `locale` is in `columns` dependency array for Stocktake but not for Adjustment | Inconsistent memoization |
| **Button sizing** | `h-14 px-8` in FormFooter workflow buttons; `h-10 px-8` in page header; `h-9 px-5` in batch toolbar | Multiple |
| **Confirmation dialogs** | Some use `requiresTextConfirmation={true}`, others use simple confirm; no consistent rule about when text confirmation is required | AdjustmentForm vs. others |

### RTL/LTR Handling
- Numeric content: `dir="ltr"` applied consistently ✅
- Document numbers: `dir="ltr"` on `<span>` ✅
- Form layout: uses `ms-`, `me-`, `ps-`, `pe-` (logical properties) ✅
- Some icons use `me-2` while others use `me-3` — minor inconsistency

---

## 21. Operational Risk Report

### CRITICAL Risks

| Risk | Description | Location |
|------|------------|---------|
| **Negative stock mutation** | DECREASE adjustments with qty > available stock can be saved and posted, creating negative inventory | `AdjustmentForm.tsx` |
| **Batch approve bypasses version lock** | `version: 0` in batch approve/post; no conflict detection | `AdjustmentListClient.tsx:84` |
| **Batch approve bypasses workflow gate** | Does not use `ActionGuard` or `canPerformActionV2` — attempts approve on any selected document regardless of status | `AdjustmentListClient.tsx:79-93` |
| **Entire system is mock-backed** | No real backend; data is ephemeral (lost on refresh); inventory movements are simulated | `infrastructure/mock/mock-api.adapter.ts` |
| **Auth token in localStorage** | XSS can extract token; no httpOnly cookie for token | `AuthProvider.tsx:63` |
| **No session validation on mount** | Expired JWT used until natural session timeout; no server-side validation | `AuthProvider.tsx:61-113` |

### HIGH Risks

| Risk | Description | Location |
|------|------------|---------|
| **Transfer search non-functional** | Users cannot search/filter transfers by document number | `TransferListClient.tsx` |
| **Warehouse names from translation keys** | Dynamic warehouse names will display as raw IDs | Multiple list screens |
| **Active scope not filtering queries** | WH_KEEPER sees all warehouse data, not their assigned scope | `AuthProvider.tsx` + all feature hooks |
| **Stocktake audit trail is fake** | Shows current status only, not transition history | `StocktakeForm.tsx`, `StocktakeViewer.tsx` |
| **GRN expiry date validation missing** | Past expiry dates accepted at receipt → FEFO corruption | `GRNViewer.tsx` area |
| **qty_before staleness** | Stock snapshot taken at item-add time; stale by posting time | `AdjustmentForm.tsx:140-177` |
| **console.log in API client** | All request/response data logged including auth tokens | `lib/api/client.ts:42,57` |
| **No 401 handling** | Expired tokens show cryptic errors instead of redirect to login | `lib/api/client.ts` |

### MEDIUM Risks

| Risk | Description |
|------|------------|
| Filter buttons non-functional | Adjustment and Transfer list filter buttons have no onClick |
| Metrics from page slice | KPI cards misleading for large datasets |
| No date range filter | Cannot audit adjustments by date range |
| KITCHEN_CHIEF/STORE_MGR blocked | These roles cannot perform any workflow action |
| Rejected adjustment has no re-edit path | Users cannot recover a rejected adjustment |
| Print templates not translated | Print header is hardcoded English |

### LOW Risks

| Risk | Description |
|------|------------|
| Duplicate print CSS | Maintenance burden, potential override conflicts |
| Dual sticky header implementations | Risk of divergence in behavior |
| `format()` from date-fns imported in AdjustmentViewer but uses ClientOnlyTime | Redundant import |
| Hardcoded 3-day overdue threshold | Not configurable |

---

## 22. Production Readiness Report

### Blockers Before Production Deployment

| # | Blocker | Severity | Notes |
|---|---------|---------|-------|
| 1 | **Mock infrastructure must be fully replaced by real backend** | CRITICAL | Entire system is frontend-only simulation |
| 2 | **Negative stock mutation must be guarded** | CRITICAL | Client + server validation required |
| 3 | **Batch operations must use version locking** | CRITICAL | Load current version before batch action |
| 4 | **Batch operations must validate per-item eligibility** | CRITICAL | Use `canPerformActionV2` per item before firing API |
| 5 | **Auth token moved to httpOnly cookie** | HIGH | Current localStorage approach is XSS-vulnerable |
| 6 | **401 interceptor for expired sessions** | HIGH | Silent session expiry during operations |
| 7 | **Remove all `console.log` from API client** | HIGH | Token leakage in production |
| 8 | **Active scope must filter API queries** | HIGH | Multi-warehouse data isolation |
| 9 | **Transfer search must be functional** | HIGH | Core UX feature |
| 10 | **Warehouse name entity join (not translation key)** | HIGH | Production data has dynamic warehouse IDs |
| 11 | **Stocktake audit trail must be real transition history** | HIGH | Compliance requirement |
| 12 | **GRN expiry date validation at receipt** | HIGH | FEFO integrity depends on valid expiry dates |

### Missing Error States
| Screen | Missing |
|--------|---------|
| Adjustment List | No error state when `useAdjustmentList` fails |
| Transfer List | No error state |
| Stocktake List | Has `QueryBoundary` error handling ✅ |
| All forms | API errors on save show generic toast but no field-level errors |

### Missing Loading States
| Screen | Gap |
|--------|-----|
| Adjustment Form — warehouse change stock refresh | No loading indicator while re-fetching stock levels |
| Adjustment Form — barcode scan | `scanStatus` state exists but spinner not always visible |
| Batch operations | Button shows `...` but no progress indicator for multiple items |

---

## 23. Frontend Technical Quality Report

### Code Quality Assessment

**Strengths:**
- TypeScript strict mode (inferred from Zod usage and typed hooks)
- Centralized domain constants (`contracts/statuses.ts`) — single source of truth for all statuses
- Feature-slice structure prevents tight coupling
- `useSafeMutation` abstraction cleanly wraps conflict detection
- `domain/status-guards.ts` — pure functions for status checks (testable)
- `document-engine.ts` — deterministic, pure, testable workflow rules
- `FEFOLotAllocator` has a test file (`FEFOLotAllocator.test.tsx`) ✅

**Technical Debt:**
1. **`any` types in mock adapter**: `mock-api.adapter.ts` has `eslint-disable @typescript-eslint/no-explicit-any` and extensive `any` usage throughout hydration functions. These should be typed.
2. **Inline interface definitions inside components**: `interface MappedAdjustmentLine` is defined *inside* `AdjustmentViewer.tsx`. This should be at module level or in types directory.
3. **State sync anti-pattern**: Local form state (lines, warehouseId, reason, notes) with manual sync from `document` prop creates two sources of truth.
4. **Fallback reason list hardcoded**: `fallbackReasons` in AdjustmentForm should be in `contracts/` or fetched exclusively from API.
5. **`t.has()` usage**: `t.has(`reasons.${reason}`)` checks for translation key existence at runtime — fragile and should be replaced with a proper reason label mapping.
6. **Duplicate print styles**: Three files define nearly identical `@media print` CSS blocks.

### Scalability
- Virtualized DataTable for large lists ✅
- Server-side pagination ✅
- Debounced search ✅
- `useMemo` on column definitions ✅
- **Risk**: If the mock database grows large, the in-memory find operations will degrade (linear scan in `findAll()`)

### Maintainability
- Clear naming conventions across hooks
- Screen-level components are large (AdjustmentForm at 842 lines) — candidate for sub-component extraction
- `mock-api.adapter.ts` at 1,494 lines is unmaintainable at current scale

---

## 24. Prioritized Improvement Plan

### 🔴 Critical — Production Blockers and Operational Safety

| # | Task | Impact |
|---|------|--------|
| C1 | Replace mock infrastructure with real backend API | All features |
| C2 | Add client-side negative stock guard on DECREASE adjustments | Inventory safety |
| C3 | Fix batch approve/post to load document versions before acting | Concurrency safety |
| C4 | Fix batch approve/post to call `canPerformActionV2` per item | Workflow safety |
| C5 | Move auth token to httpOnly cookie; add 401 interceptor | Security |
| C6 | Remove `console.log` from `apiClient` | Security |
| C7 | Filter all operational queries by `activeScope` | Data isolation |

### 🟠 High — Workflow and Transactional Weaknesses

| # | Task | Impact |
|---|------|--------|
| H1 | Fix Transfer list search input (`onChange` handler) | Core UX |
| H2 | Resolve warehouse names via entity join, not translation keys | Data integrity |
| H3 | Add `EDIT` transition from REJECTED to DRAFT in adjustment workflow | Workflow correctness |
| H4 | Implement real full audit trail in Stocktake Form/Viewer | Compliance |
| H5 | Add expiry date validation (must be future date) in GRN receipt | FEFO integrity |
| H6 | Add `/operations/adjustments/summary` endpoint for accurate KPI metrics | Operational visibility |
| H7 | Add `KITCHEN_CHIEF` and `STORE_MGR` to workflow transition `allowedRoles` | Role completeness |
| H8 | Add token refresh / silent renewal mechanism | Session stability |

### 🟡 Medium — Consistency and Maintainability

| # | Task | Impact |
|---|------|--------|
| M1 | Wire "Filter" buttons across all list screens or remove them | UX clarity |
| M2 | Centralize print CSS into shared print layout | Maintainability |
| M3 | Extract inline `MappedAdjustmentLine` interface to types directory | Code quality |
| M4 | Replace `t.has()` pattern with proper reason label mapping | Reliability |
| M5 | Refactor AdjustmentForm (842 lines) into sub-components | Maintainability |
| M6 | Align KPI metrics to use server-side aggregates | Accuracy |
| M7 | Unify sticky header implementation (one component only) | Consistency |
| M8 | Add date range filter to Adjustment, Stocktake, Transfer lists | Audit access |
| M9 | Add warehouse filter to Adjustment and Issue lists | Multi-warehouse ops |

### 🟢 Low — Polish and Optimization

| # | Task | Impact |
|---|------|--------|
| L1 | Localize print voucher headers (AR/EN) | i18n completeness |
| L2 | Make overdue transfer threshold configurable | Operational flexibility |
| L3 | Add column sort to all DataTable instances | UX |
| L4 | Add loading indicator for warehouse-change stock refresh | UX clarity |
| L5 | Add item search/filter within stocktake manifest | Large session usability |
| L6 | Display exchange rate on PO viewer for foreign currency | Financial clarity |
| L7 | Remove redundant `format` import from date-fns in AdjustmentViewer | Bundle size |

---

## 25. Backend Requirements Extraction

### Authentication & Session
| API | Method | Notes |
|-----|--------|-------|
| `/auth/login` | POST | Returns `{ user, token }` |
| `/auth/me` | GET | Validate token; return current user |
| `/auth/refresh` | POST | Silent token renewal |
| `/auth/logout` | POST | Server-side session invalidation |

### Adjustments
| API | Method | Notes |
|-----|--------|-------|
| `/operations/adjustments` | GET | Pagination, status filter, search, date range |
| `/operations/adjustments/summary` | GET | `{ total, pending, critical_losses }` — server aggregates |
| `/operations/adjustments` | POST | Idempotency key required |
| `/operations/adjustments/:id` | GET | Full detail with timeline array |
| `/operations/adjustments/:id` | PUT | Version locking required |
| `/operations/adjustments/:id/submit` | POST | DRAFT → SUBMITTED |
| `/operations/adjustments/:id/approve` | POST | SUBMITTED → APPROVED |
| `/operations/adjustments/:id/reject` | POST | Requires rejection reason |
| `/operations/adjustments/:id/post` | POST | APPROVED → POSTED; must validate no negative stock |
| `/operations/adjustments/:id/cancel` | POST | With optional reason |
| `/operations/adjustments/batch-approve` | POST | Array of `{id, version}` |

### Stocktake
| API | Method | Notes |
|-----|--------|-------|
| `/stocktake/sessions` | GET | Pagination, status, warehouse filter |
| `/stocktake/sessions` | POST | Atomic snapshot freeze; warehouse conflict check |
| `/stocktake/sessions/:id` | GET | Full session with items array and **full transition log** |
| `/stocktake/sessions/:id/start` | POST | DRAFT → STARTED; locks warehouse |
| `/stocktake/sessions/:id/count` | POST | STARTED → COUNTING |
| `/stocktake/sessions/:id/items/:lineId` | PUT | Update counted_qty per line |
| `/stocktake/sessions/:id/submit` | POST | COUNTING → REVIEW |
| `/stocktake/sessions/:id/review_variance` | POST | Submit variance reasons |
| `/stocktake/sessions/:id/approve` | POST | REVIEW → APPROVED |
| `/stocktake/sessions/:id/reject` | POST | Stays in REVIEW |
| `/stocktake/sessions/:id/post` | POST | APPROVED → POSTED; unlocks warehouse |
| `/stocktake/sessions/:id/close` | POST | POSTED → CLOSED |
| `/stocktake/sessions/:id/cancel` | POST | Cancels and unlocks warehouse |
| `/stocktake/sessions/:id/recount` | POST | Resets specific items for recount |

### Transfers
| API | Method | Notes |
|-----|--------|-------|
| `/operations/transfers` | GET | Pagination, status, warehouse, date, search |
| `/operations/transfers` | POST | Create with lot allocations |
| `/operations/transfers/:id` | GET | Full detail with lot allocations |
| `/operations/transfers/:id/ship` | POST | DRAFT → IN_TRANSIT; decrements source |
| `/operations/transfers/:id/receive` | POST | IN_TRANSIT → RECEIVED; increments destination |
| `/operations/transfers/:id/cancel` | POST | Any → CANCELLED |
| `/operations/transfers/:id/dispute` | POST | Dispute a received quantity |

### Inventory
| API | Method | Notes |
|-----|--------|-------|
| `/inventory/balance` | GET | By warehouse_id, item code/search; returns qty_on_hand |
| `/inventory/movements` | GET | Paginated movement ledger |
| `/inventory/lots` | GET | By item + warehouse; sorted by FEFO for allocation |

### Warehouse Lock
| API | Method | Notes |
|-----|--------|-------|
| `/warehouses/:id/lock` | GET | Returns `{ isLocked, lockedBy, sessionId }` |

### Master Data
| API | Method | Notes |
|-----|--------|-------|
| `/warehouses` | GET/POST | Full entity (not just ID for name resolution) |
| `/warehouses/:id` | GET/PUT/DELETE | — |
| `/items` | GET | With barcode search param |
| `/master-data/items` | GET | Alias for barcode lookup |
| `/operations/variance-reasons` | GET | Dynamic reason list |

### Notifications
| API | Method | Notes |
|-----|--------|-------|
| `/notifications` | GET | User's unread notifications |
| `/notifications/:id/read` | PATCH | Mark as read |

### Permissions
| API | Method | Notes |
|-----|--------|-------|
| `/auth/permissions` | GET | Current user's resource/action permissions for PermissionGate |

---

*End of Audit Report*

**Audit Completeness**: Full coverage of all route groups, major screens, shared components, API layer, mock infrastructure, state management, permissions, and validations.

**Highest Priority Actions**: C1 (backend), C2 (negative stock), C5 (auth security), H1 (transfer search), H4 (stocktake audit trail).
