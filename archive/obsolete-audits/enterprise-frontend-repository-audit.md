# Enterprise Frontend Repository Audit

**Audited Repository:** Kitchen-Store Inventory System (apps/web/)
**Audit Type:** Functional, Operational, Architectural, Production-Readiness
**Date:** 2026-05-20
**Audit Scope:** Full frontend source code — routes, components, hooks, API layer, permissions, mock data, workflows, types, state management

---

## Table of Contents

1. [System UI Overview](#1-system-ui-overview)
2. [Domain Map](#2-domain-map)
3. [Route Structure](#3-route-structure)
4. [Workflow Map](#4-workflow-map)
5. [API Dependency Map](#5-api-dependency-map)
6. [State Management Analysis](#6-state-management-analysis)
7. [Permission Analysis](#7-permission-analysis)
8. [Validation Consistency Analysis](#8-validation-consistency-analysis)
9. [UX Consistency Report](#9-ux-consistency-report)
10. [Operational Risk Report](#10-operational-risk-report)
11. [Production Readiness Report](#11-production-readiness-report)
12. [Frontend Technical Quality Report](#12-frontend-technical-quality-report)
13. [Mock Data & Temporary Logic Audit](#13-mock-data--temporary-logic-audit)
14. [Screen-by-Screen Analysis](#14-screen-by-screen-analysis)
15. [Component Inventory Audit](#15-component-inventory-audit)
16. [Backend Requirements Extraction](#16-backend-requirements-extraction)
17. [Prioritized Improvement Plan](#17-prioritized-improvement-plan)

---

## 1. System UI Overview

### Architecture Quality

The frontend follows a **Next.js App Router architecture** with:
- **Internationalized routing** via `next-intl` (locale prefix `/[locale]`)
- **Route groups** for domain separation: `(operations)`, `(procurement)`, `(auth)`
- **Client components** throughout (`'use client'` in almost all feature pages)
- **Zod schemas** at the API boundary for runtime type validation
- **TanStack Query** for server state management with 60s stale time
- **`useSafeMutation`** wrapper for concurrency conflict detection
- **Two-tier permission system**: RBAC `PermissionGate` + document workflow `ActionGuard`
- **Dual mock system**: Legacy static mocks + new generic repository-based mock adapter

### Strengths
- Strong Zod validation at the API boundary (prevents malformed data from entering the app)
- Consistent use of `useSafeMutation` for conflict detection (106 usages)
- Well-structured route organization by domain
- Good separation between API hooks (`features/*/api/`) and business logic hooks (`features/*/hooks/`)
- Comprehensive RBAC permission matrix with 42 resources and 9 roles
- Conflict detection and resolution pipeline (ConflictBus → ConflictProvider → ConflictDialog)
- Warehouse lock awareness integrated into stocktake, adjustment, and GRN flows

### Weaknesses
- **Three conflicting type systems**: `types/documents.ts` (Zod canonical), `features/*/types/index.ts` (static interfaces), and `features/*/hooks/use*.ts` inline Zod schemas — all with different field names for the same concepts
- **Widespread mock data** in production-facing components (8 components use hardcoded/mock data as primary source)
- **Dead code**: `useBeginCounting`, `Can` component, `useNetworkStatus` hook, `api/usePurchaseRequests.ts`, `api/usePurchaseOrders.ts`, shared `ConflictDialog`
- **Inconsistent API hook patterns**: Some hooks use real `apiClient`, others use inline mock data
- **No offline operations capability**: Network status banner is purely informational
- **Hardcoded values**: Warehouse IDs, currency codes, translation key patterns assumed in multiple components

### Workflow Organization
- Operations (stocktake, adjustments, transfers, issues, kitchen requests, yield management)
- Procurement (purchase requests, purchase orders, goods received notes, landed cost)
- Inventory (balance, lots, movements, scan mode, expired override)
- Master Data (branches, warehouses, departments, items, suppliers, UoMs, categories, currencies, barcodes)
- Admin (users, roles, settings, audit logs, restaurant profile)
- Communications (notifications, email outbox, templates)
- Dashboard, Reports, Search, Profile, Context Selector

### UX Maturity
- **Loading states**: Consistently implemented via `LoadingSkeleton`, `PageSkeleton`, `TableSkeleton`
- **Error states**: `ErrorState` with retry button used throughout
- **Empty states**: `EmptyState` component available but underutilized
- **Confirmation dialogs**: `PostConfirmDialog`, `ConfirmationDialog` used for destructive/high-impact actions
- **Language support**: Full RTL/LTR with Arabic/English translations
- **Print support**: `print:hidden` global classes in AppShell

---

## 2. Domain Map

```
┌─────────────────────────────────────────────────────────────┐
│                   AUTH & USER MANAGEMENT                     │
│  Login · Forgot Password · Reset Password · Profile · RBAC  │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                     DASHBOARD                               │
│  Admin · Kitchen · Store Manager · Procurement Dashboards   │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                     OPERATIONS                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │Stocktake │  │Adjustment│  │ Transfer │  │   Issue    │  │
│  │DRAFT→POST│  │DRAFT→POST│  │DRAFT→POST│  │DRAFT→POST  │  │
│  │+Count    │  │+FEFO Lots│  │+Ship/Recv│  │+FEFO Alloc │  │
│  │+Variance │  │+Scan     │  │+Dispute  │  │+Scan       │  │
│  │+Approve  │  │+CreateLot│  │+Scan     │  │            │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│  ┌──────────────────┐  ┌─────────────────────────────────┐  │
│  │ Kitchen Requests │  │       Yield Management           │  │
│  │ DRAFT→FULFILLED  │  │    New Batch · List · Detail     │  │
│  └──────────────────┘  └─────────────────────────────────┘  │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    PROCUREMENT                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PR          │  │  PO          │  │  GRN         │      │
│  │  DRAFT→POST  │  │  DRAFT→POST  │  │  DRAFT→POST  │      │
│  │  +Approve    │  │  +Approve    │  │  +Scan Mode  │      │
│  │  +Convert PO │  │  +Import PR  │  │  +Lot Entry  │      │
│  │              │  │  +Email      │  │  +FX Capture  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         ┌──────────────────────────────────────────┐        │
│         │          Landed Cost                      │        │
│         │          (Mock data only)                  │        │
│         └──────────────────────────────────────────┘        │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                     INVENTORY                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Stock Balance│  │ Lot Balance  │  │   Movements      │   │
│  │ Per Warehouse│  │ Per Lot      │  │   Audit Trail    │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│  ┌────────────────┐┌──────────────────┐                      │
│  │  Scan Mode     ││  Expired Override│                      │
│  │  Barcode Scan  ││  (Mock data only)│                      │
│  └────────────────┘└──────────────────┘                      │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                   MASTER DATA                               │
│  Branches · Warehouses · Departments · Items · Suppliers    │
│  UoMs · Categories · Currencies · FX Rates · Barcodes       │
│  Import Wizard (Items · Barcodes · UoMs)                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  ADMIN │ COMMS │ REPORTS │ SEARCH │ PROFILE                 │
│  Users │ Notifs │ Variety │ Global│ Password                │
│  Roles │ Email  │ Reports │ Search│                         │
│  Audit │ Tmp    │ Export  │       │                         │
│  Settings│      │         │       │                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Route Structure

```
/[locale]/
├── (auth)/
│   ├── login/
│   ├── forgot-password/
│   └── reset-password/
├── (app)/
│   ├── (operations)/
│   │   ├── adjustments/         (list, new, [id]/viewer+form)
│   │   ├── issues/              (list, new, [id]/viewer, scan-mode)
│   │   ├── kitchen-requests/    (list, new, [id]/viewer+form)
│   │   ├── stocktake/           (list, archive, new, [id]/viewer+form)
│   │   │   └── [id]/            (start, count, variance, approve, post)
│   │   ├── transfers/           (list, hub, new, [id]/viewer)
│   │   │   └── [id]/            (ship, receive, dispute)
│   │   └── yield-management/    (list, new)
│   ├── (procurement)/
│   │   ├── goods-received/      (list, new, [id]/viewer, post, scan-mode)
│   │   ├── landed-cost/         (mock-only)
│   │   ├── purchase-orders/     (list, new, [id]/viewer+form, approve)
│   │   └── purchase-requests/   (list, new, [id]/viewer+form, approve, edit)
│   ├── admin/                   (users, roles, audit-logs, settings, mail, profile)
│   ├── communications/          (notifications, email-outbox, templates)
│   ├── context-selector/
│   ├── dashboard/
│   ├── inventory/               (balance, lots, movements, scan-mode, expired-override, transfers/hub)
│   ├── master-data/             (all CRUD entities + import wizard)
│   ├── profile/
│   ├── reports/                 (7 report types)
│   └── search/
```

---

## 4. Workflow Map

### 4.1 Stocktake Workflow
```
DRAFT ──START──> STARTED ──COUNT──> COUNTING ──SUBMIT──> REVIEW ──APPROVE──> APPROVED ──POST──> POSTED ──CLOSE──> CLOSED
  │                  │                       │                │
  └──CANCEL──> CANCELLED                     │                └──CANCEL──> CANCELLED
                     │                       │
                     └──CANCEL──> CANCELLED   └──REVIEW_VARIANCE──> stays REVIEW
                                              └──COUNT──> stays COUNTING

⚠️ CRITICAL BUG: START→COUNTING transition broken.
   Start API transitions to STARTED, but count page only accepts COUNTING.
   `useBeginCounting` hook exists but is never called (dead code).
```

### 4.2 Adjustment Workflow
```
DRAFT ──SUBMIT──> SUBMITTED ──APPROVE──> APPROVED ──POST──> POSTED
  │                    │                      │               │
  └──CANCEL (no UI)    └──REJECT               └──CANCEL (no UI)
```

### 4.3 Transfer Workflow
```
DRAFT ──SHIP──> IN_TRANSIT ──RECEIVE──> RECEIVED ──POST──> POSTED
  │                                              │
  └──CANCEL (no UI)                              └──DISPUTE (mock, no UI)

⚠️ CRITICAL: Ship scan data (`scannedLines`) NEVER sent to backend.
   Barcode scanning is purely cosmetic.
```

### 4.4 Issue Workflow
```
DRAFT ──SUBMIT──> SUBMITTED ──POST──> POSTED
  │                    │
  └──CANCEL (no UI)    └──CANCEL (no UI)

⚠️ SUBMIT action engine-defined but NO UI implements it.
   Workflow skips directly DRAFT→POSTED.
```

### 4.5 Procurement Workflow
```
PR: DRAFT ──SUBMIT──> SUBMITTED ──APPROVE──> APPROVED ──[Convert to PO]──> PO
     │                    │                      │
     └──CANCEL (no UI)    └──REJECT               └──CANCEL (no UI)

PO: DRAFT ──SUBMIT──> SUBMITTED ──APPROVE──> APPROVED ──[Create GRN]──> GRN
     │                    │                      │
     └──CANCEL (no UI)    └──REJECT               └──CANCEL (no UI)

GRN: DRAFT ──POST──> POSTED
      │
      └──CANCEL (no UI)
```

### 4.6 Missing Workflow Implementations
| Action | Status | Risk |
|--------|--------|------|
| CANCEL on any document type | **Never implemented** in any UI | HIGH — users cannot abort documents |
| Issue SUBMIT | Defined in engine, no UI | HIGH — DRAFT→POSTED without review |
| Stocktake COUNT transition | Hook exists but dead code | CRITICAL — workflow broken |
| Transfer CANCEL | Defined in engine, no UI | MEDIUM |
| PR→PO conversion auto-pricing | Sets unit_price: 0 on import | MEDIUM |
| PO→GRN fulfillment tracking | No PARTIAL/FULFILLED logic | MEDIUM |

---

## 5. API Dependency Map

### 5.1 Operations Endpoints

| Endpoint | Method | Used By | Priority |
|----------|--------|---------|----------|
| `/stocktake/sessions` | GET/POST | Stocktake List + Create | Critical |
| `/stocktake/sessions/:id` | GET/PUT | Stocktake Detail | Critical |
| `/stocktake/sessions/:id/start` | POST | Start Stocktake | Critical |
| `/stocktake/sessions/:id/submit` | POST | Complete Counting | Critical |
| `/stocktake/sessions/:id/review_variance` | POST | Submit Variances | Critical |
| `/stocktake/sessions/:id/approve` | POST | Approve Stocktake | Critical |
| `/stocktake/sessions/:id/reject` | POST | Reject Stocktake | Critical |
| `/stocktake/sessions/:id/post` | POST | Post Stocktake | Critical |
| `/stocktake/sessions/:id/items/:lineId` | PUT | Update Count | Critical |
| `/stocktake/sessions/:id/variance/export` | GET | Export CSV | Medium |
| `/operations/adjustments` | GET/POST | Adjustment List + Create | Critical |
| `/operations/adjustments/:id` | GET/PUT | Adjustment Detail | Critical |
| `/operations/adjustments/:id/submit` | POST | Submit Adjustment | Critical |
| `/operations/adjustments/:id/approve` | POST | Approve Adjustment | Critical |
| `/operations/adjustments/:id/reject` | POST | Reject Adjustment | Critical |
| `/operations/adjustments/:id/post` | POST | Post Adjustment | Critical |
| `/operations/transfers` | GET/POST | Transfer List + Create | Critical |
| `/operations/transfers/:id` | GET/PUT | Transfer Detail | Critical |
| `/operations/transfers/:id/ship` | POST | Ship Transfer | Critical |
| `/operations/transfers/:id/receive` | POST | Receive Transfer | Critical |
| `/operations/transfers/:id/post` | POST | Post Transfer | Critical |
| `/operations/transfers/:id/dispute` | POST | Dispute Transfer | Low (mock only) |
| `/operations/issues` | GET/POST | Issue List + Create | Critical |
| `/operations/issues/:id` | GET/PUT | Issue Detail | Critical |
| `/operations/issues/:id/post` | POST | Post Issue | Critical |
| `/operations/lots-available` | GET | Lot Selection | High |
| `/operations/kitchen-requests` | GET/POST | Kitchen Requests | Medium |
| `/operations/kitchen-requests/:id` | GET/PUT | Kitchen Request Detail | Medium |
| `/operations/kitchen-requests/:id/:action` | POST | Workflow Actions | Medium |
| `/inventory/balance` | GET | Stock Balance | High |
| `/inventory/warehouses/:id/lock` | GET | Warehouse Lock Check | High |
| `/inventory/movements` | GET | Movements List | Medium |

### 5.2 Procurement Endpoints

| Endpoint | Method | Used By | Priority |
|----------|--------|---------|----------|
| `/procurement/purchase-requests` | GET/POST | PR List + Create | Critical |
| `/procurement/purchase-requests/:id` | GET/PUT | PR Detail | Critical |
| `/procurement/purchase-requests/:id/submit` | POST | Submit PR | Critical |
| `/procurement/purchase-requests/:id/approve` | POST | Approve PR | Critical |
| `/procurement/purchase-requests/:id/reject` | POST | Reject PR | Critical |
| `/procurement/purchase-orders` | GET/POST | PO List + Create | Critical |
| `/procurement/purchase-orders/:id` | GET/PUT | PO Detail | Critical |
| `/procurement/purchase-orders/:id/submit` | POST | Submit PO | Critical |
| `/procurement/purchase-orders/:id/approve` | POST | Approve PO | Critical |
| `/procurement/purchase-orders/:id/reject` | POST | Reject PO | Critical |
| `/procurement/purchase-orders/:id/post` | POST | Post PO | Critical |
| `/procurement/purchase-orders/:id/email` | POST | Email PO | Medium |
| `/procurement/grns` | GET/POST | GRN List + Create | Critical |
| `/procurement/grns/:id` | GET/PUT | GRN Detail | Critical |
| `/procurement/grns/:id/post` | POST | Post GRN | Critical |

### 5.3 Master Data Endpoints

| Endpoint | Method | Priority |
|----------|--------|----------|
| `/branches`, `/warehouses`, `/departments` | CRUD | Critical |
| `/items`, `/master-data/items` | CRUD + barcode lookup | Critical |
| `/master-data/barcodes/check-duplicate` | GET | High |
| `/suppliers`, `/categories`, `/units-of-measure` | CRUD | High |
| `/currencies`, `/currencies/fx-rates` | CRUD | High |
| `/master-data/variance-reasons` | GET | Medium |

### 5.4 Admin & Configuration Endpoints

| Endpoint | Method | Priority |
|----------|--------|----------|
| `/admin/settings` | GET/PUT | High |
| `/admin/users`, `/admin/users/:id` | CRUD | High |
| `/admin/audit-logs` | GET | High |
| `/admin/roles` | GET | Medium |
| `/auth/login`, `/auth/forgot-password`, `/auth/reset-password` | POST | Critical |
| `/auth/profile` | GET/PUT | High |
| `/dashboard/stats` | GET | High |
| `/reports/*` (7 endpoints) | GET | Medium |

### 5.5 Mock-Only Endpoints (DANGER — no real backend equivalent)
| Endpoint | Used By | Risk |
|----------|---------|------|
| `POST /procurement/grns/:id/items/:lineId` | GRNScanClient (scan mode) | **CRITICAL** — No real backend route exists |
| All `GET /operations/transfers/hub` | TransferHubClient | HIGH — route is fully mock |
| All `GET /inventory/expired-override` | ExpiredOverrideClient | HIGH — route is fully mock |
| `POST /operations/yield/batches` | YieldManagementClient | MEDIUM — may not exist |

---

## 6. State Management Analysis

### 6.1 Architecture

The project uses **TanStack Query** as its primary state management solution, with **React Context** for auth and cross-cutting concerns. No Zustand, Redux, or other global state libraries.

### 6.2 Query Key Patterns

**Inconsistent naming conventions observed:**
| Pattern A | Pattern B | Risk |
|-----------|-----------|------|
| `['purchase-orders']` (list) | `['purchase-order', id]` (detail) | Detail invalidation mismatch |
| `['stocktakes']` (list) | `['stocktakes', id]` (detail) | Consistent |
| `['transfers']` (list) | `['transfer', id]` (detail) | **Inconsistent** — singular vs plural |
| `['adjustments']` (list) | `['adjustment', id]` (detail) | **Inconsistent** — singular vs plural |

**Key concerns:**
1. **Missing detail key invalidation**: After mutations, many hooks invalidate only the list key (e.g., `['purchase-orders']`) without also invalidating the detail key (`['purchase-order', id]`). This means open detail pages show stale data until the user navigates away and back.
2. **`INITIAL_*` query data seeding**: 5+ feature hooks seed `setQueryData` with hardcoded arrays when API fetch fails. This introduces fake production-like data into the cache.
3. **Double invalidation**: Several hooks redundantly call both `invalidateQueries` and `setQueryData` on mutation success.

### 6.3 Optimistic Updates

Used extensively in master data hooks. Pattern:
1. `setQueryData(...)` to optimistically update cache
2. Call API
3. On error, rollback
4. `invalidateQueries(...)` to sync with server

**Risk**: Optimistic updates do NOT send `version` for conflict detection in some master data mutations. If two users edit the same record, the last write wins silently.

### 6.4 Cache Configuration
- `staleTime: 60_000` (1 min) — Reasonable
- `gcTime: 300_000` (5 min) — Reasonable
- `retry: 1` — Minimal; failed queries retry once
- `MutationCache.onError` intercepts `ConflictError` and emits to `conflictBus`

### 6.5 Stale Data Risks

| Scenario | Risk |
|----------|------|
| Stocktake count page | If user navigates away and back, local counts are reset to API values |
| Mutations that don't invalidate detail keys | Detail pages show stale data |
| `INITIAL_*` fallback cache seeding | Users see fake data when API is down |
| List pagination without `keepPreviousData` | Flash loading on filter change |

---

## 7. Permission Analysis

### 7.1 Two Permission Systems

The project has **two separate, overlapping permission systems**:

#### System 1: RBAC Permission Matrix (`PermissionGate`)
- Defined in `types/rbac.ts` with 42 resources × 16 actions × 9 roles
- Used via `<PermissionGate action="..." resource="..." />` 
- 252 usages across the codebase
- Works on the resource-action-role model

#### System 2: Document Workflow Engine (`ActionGuard`)
- Defined in `core/workflow/document-engine.ts`
- Used via `<ActionGuard documentType="..." action="..." />`
- 59 usages
- Works on the document-status-action-role model

#### Consistency Risks
1. **SAME ACTION, DIFFERENT CHECKS**: E.g., `StocktakeApproveClient.tsx` uses both `canPerformActionV2` AND `PermissionGate` for the same approve action. These two systems could disagree.
2. **DUPLICATE ROLE DEFINITIONS**: Both systems define their own role types. No shared type guarantees consistency.
3. **`ActionGuard` default role**: Every usage passes `user?.role || 'WH_KEEPER'`. When `user.role` is null, it defaults to `WH_KEEPER` (warehouse keeper) which is **permissive** rather than **denying**. This is a dangerous fallback.
4. **`ProtectedRoute` with `roles` prop**: Bypasses the entire permission matrix and checks only role inclusion. If a developer uses this instead of checking specific actions, routes may be over- or under-exposed.

### 7.2 Permission Bypasses
1. **Client-side only**: All permission checks are purely UI gating. Any endpoint can be called directly regardless of UI permission checks.
2. **Role string coercion**: `usePermission` casts `user.role as keyof typeof PERMISSION_MATRIX` without guard. Unknown roles crash at runtime.
3. **Missing `Cancel` permission check**: Cancel action exists in the engine but no UI implements it, so no permission checks exist for it.

### 7.3 Dead Code
- `<Can />` component — zero usages. Identical in function to `PermissionGate`.

---

## 8. Validation Consistency Analysis

### 8.1 API Boundary Validation (Zod Schemas)

| Area | Consistency | Issues |
|------|-------------|--------|
| Stocktake schemas | Good | Uses `ALL_DOCUMENT_STATUSES` instead of stocktake-specific statuses |
| Adjustment schemas | Fair | `reason` field uses `.or(z.string())` defeating the enum |
| PR/PO/GRN schemas | **Poor** | Three different type systems with different field names |
| Master data schemas | Good | Consistent Zod schemas in `types/master-data.ts` |

### 8.2 Form Validation

| Pattern | Used In | Issues |
|---------|---------|--------|
| 10-char minimum notes | Adjustment create + edit | Zod allows empty; UI enforces — mismatch |
| 15-char minimum rejection | Approve screens | UI-only; API mutations don't enforce min |
| Positive quantity | All line item forms | No max bound; no over-receiving check |
| Non-negative prices | PO/GRN forms | Allows zero prices |
| Lot number required | Lot entry dialogs | Good |
| Future expiry date | Lot entry dialogs | Date picker disables past dates — Good |
| Confirmation keyword | Post screens | Single point of failure (translation key) |

### 8.3 Business Validation Gaps

| Missing Validation | Impact | Severity |
|-------------------|--------|----------|
| **All items counted** before stocktake submit | Partial stocktake can be submitted | HIGH |
| **Over-receiving check** (received_qty ≤ ordered_qty) | Can receive more than ordered | HIGH |
| **All lines allocated** before issue submit | Partial issue can be submitted | MEDIUM |
| **Stock availability** before adjustment/issue | Can adjust/issue negative stock | MEDIUM |
| **Duplicate detection** for same item lines | Same item can appear on multiple lines | MEDIUM |
| **FEFO enforcement** on issue lot allocation | Oldest lots may not be picked first | MEDIUM |
| **Lot exists** on backend for local lot creation | Locally created lots may not exist on server | MEDIUM |
| **Whitespace-only rejection** prevention | Rejection reason "          " passes | LOW |

### 8.4 Schema Consistency Issues

| Field Concept | Type System 1 (`types/documents.ts`) | Type System 2 (`features/*/types/`) | Type System 3 (Inline Zod) |
|--------------|--------------------------------------|-------------------------------------|---------------------------|
| PR department | `requested_by_dept` | `department_id` | `department_id` |
| PR expected date | `required_by_date` | `expected_date` | `expected_date` |
| PO currency | `currency_id` | `currency_code` | `currency_id` |
| PO delivery date | `expected_delivery_date` | `expected_date` | `expected_date` |
| PO line price | `unit_price` | `unit_price` | `unit_cost` |
| GRN line lot | `lot: {id, lot_number, ...}` | `lotNumber` (string) | `lot: {id, lot_number, ...}` |
| Document status | `DocumentStatus` (broad enum) | `PR_STATUS` enum | `ALL_DOCUMENT_STATUSES` |

**Impact**: Components that mix types (e.g., `GRNViewer.tsx` using `types/documents.ts` types while data comes from `useGRN` with inline Zod types) rely on `as unknown as` casts that suppress type errors but break at runtime when field names mismatch.

---

## 9. UX Consistency Report

### 9.1 Layout Consistency

| Element | Assessment |
|---------|------------|
| Page headers | Consistent `PageHeader` with title, actions, back button |
| Form footers | Consistent `FormFooter` with cancel/save pattern |
| Dialog patterns | Consistent rounded `[2rem]` style, glass/transparent surfaces |
| Card borders | Consistent `border-none shadow-none` on surface containers |
| Status badges | Consistent `StatusBadge` with configurable color maps |
| Metric cards | Consistent `MetricCard` with icon, color, label, value |
| Loading skeletons | Multiple variants (`LoadingSkeleton`, `PageSkeleton`, `TableSkeleton`, `InlineLoader`) |
| Table patterns | Two table systems: `DataTable` (generic) and `DocumentLineItemTable` (documents) |

### 9.2 Inconsistencies

| Pattern | Inconsistent Usage | Impact |
|---------|-------------------|--------|
| **List search inputs** | Functional in GRN list, decorative in PR/PO/Adjustment/Stocktake lists | Users confused why typing does nothing |
| **Filter buttons** | Many list pages have decorative filter buttons with no dropdown | Prominent UI with no function |
| **View toggle** | Issue list has decorative grid/list toggle | Misleading |
| **Warehouse name resolution** | Some use `useWarehouses()` hook, others use hardcoded ternary (`wh-1 ? 'Main' : 'Kitchen'`), others use translation key lookup from raw ID | Inconsistent; some break with custom warehouses |
| **Currency display** | Some hardcode `'SAR'`, others use `currency_id` from data, others use `currency_code` | Different format in different places |
| **Status timeline** | Stocktake/adjustment viewers show single entry (current status); GRN viewer shows full audit log | Missing full timeline in operations documents |
| **Rejection character count** | Some rejection dialogs show character counter (approve screens), others don't (variance reasons) | Inconsistent feedback |

### 9.3 Error Handling Consistency

| Pattern | Assessment |
|---------|------------|
| `ErrorState` with retry | Consistent across list/detail fetch failures |
| Mutation error toasts | **Inconsistent**: Many `useSafeMutation` calls have **no `onError` handler** (errors silently swallowed) |
| 409 Conflict handling | Well-structured via `conflictBus` → `ConflictProvider` → `ConflictDialog` everywhere |
| `toast.error` fallback | Many places use `common('error')` generic translation — not specific error messages |

### 9.4 RTL/LTR Consistency
- All directional icons use `locale === 'ar' ? 'rotate-180 ml-2' : 'mr-2'` pattern
- Text alignment uses `text-start`/`text-end` (logical properties) — correct
- Data tables use `dir="ltr"` for numeric content — correct

---

## 10. Operational Risk Report

### 🔴 Critical Risks (Production Blocking)

| # | Risk | File(s) | Impact |
|---|------|---------|--------|
| R1 | **Stocktake workflow broken after START** — Start transitions to STARTED, count page only accepts COUNTING. User redirected to detail page. | StocktakeStartClient, StocktakeCountClient | **Cannot count stocktake** |
| R2 | **GRN scan mode uses mock API** — `GRNScanClient` + `useUpdateGRNLine` backed by mock data. No real backend endpoint exists. | `api/useGoodsReceipts.ts`, `GRNScanClient.tsx` | **Scan mode non-functional in production** |
| R3 | **Issue form uses mock create** — `issue-form.tsx` imports from `api/useIssues.ts` (mock) instead of `hooks/useCreateIssue.ts` (real API) | `issue-form.tsx` | **Issue creation is entirely fake** |
| R4 | **Scanned ship data never sent to backend** — `TransferShipClient` maintains `scannedLines` state but only sends `{ id, version }` on ship | `TransferShipClient.tsx`, `useShipTransfer.ts` | **Ship scanning is cosmetic** |
| R5 | **8 components use mock/hardcoded data as primary source** — UserFormClient, ExpiredOverrideClient, LotBalanceClient, FEFOLotAllocator, TransferHubClient (x2), YieldManagementClient, LandedCostClient | Multiple | **Production displays fake data** |

### 🟠 High Risks

| # | Risk | File(s) | Impact |
|---|------|---------|--------|
| R6 | **Hardcoded warehouses** in AdjustmentForm + AdjustmentViewer (wh-1/wh-2 only) | `AdjustmentForm.tsx`, `AdjustmentViewer.tsx` | **Adjustment breaks for non-default warehouses** |
| R7 | **`lot: z.null()` in transfer schema** — if backend ever returns lot info, entire transfer fetch crashes | `useTransfer.ts` line 31 | **Transfer detail page crashes** |
| R8 | **Issue viewer hardcoded `isPosted={true}`** — overlay always applied regardless of status | `IssueViewer.tsx` | **All issues appear posted/read-only** |
| R9 | **Partial Recount button is no-op** — dialog shows, but only toast on confirm | `StocktakeVarianceClient.tsx` | **Misleading UX — button does nothing** |
| R10 | **Field names differ across type systems** — `department_id` vs `requested_by_dept`, `currency_code` vs `currency_id`, etc. | Multiple | **Runtime data corruption** |
| R11 | **No Cancel action on any document** — CANCEL exists in engine, zero UI implementation | All | **Users cannot abort documents** |
| R12 | **Offline count edits silently lost** — inputs enabled but autosave disabled when offline | `StocktakeCountClient.tsx` | **Lost work, no warning** |
| R13 | **`ActionGuard` defaults to WH_KEEPER** when user.role is null — grants instead of denies | `ActionGuard.tsx` usage pattern | **Permission bypass risk** |
| R14 | **`useBeginCounting` dead code** — hook exists but never called. Workflow impossible without it | `useStocktakes.ts` | **Stocktake workflow gap** |
| R15 | **PR list renders `created_by` not in schema** — field will be undefined | `PRListClient.tsx` | **Broken column display** |
| R16 | **PO list renders `currency_code` not in schema** — field will be undefined | `POListClient.tsx` | **Broken column display** |

### 🟡 Medium Risks

| # | Risk | Details |
|---|------|---------|
| R17 | Post confirmation keyword is translation key — single point of failure | `StocktakePostClient.tsx` |
| R18 | Reject action not gated by permission in ApproveClient | `StocktakeApproveClient.tsx` |
| R19 | `ALL_DOCUMENT_STATUSES` used instead of domain-specific statuses | Multiple Zod schemas |
| R20 | Inconsistent pagination shapes across list hooks | `useIssueList` vs `useTransferList` |
| R21 | `INITIAL_*` arrays seed query cache with fake data | 5+ feature hooks |
| R22 | No `keepPreviousData` on list queries | Multiple list pages |
| R23 | No validation that ALL stocktake items are counted before submit | `StocktakeCountClient.tsx` |
| R24 | `UserFormClient.tsx` uses mock data for cascading dropdowns | Active production component |
| R25 | Duplicate `TransferHubClient.tsx` in two locations | Code duplication |
| R26 | No lot allocation in main GRN form (`toast.info` stub) | `grn-form.tsx` |
| R27 | `useSafeMutation` conflict detection expects Axios-like error shape | May not match actual API errors |
| R28 | PR/PO list decorative search inputs | UX confusion |
| R29 | Metrics computed from current page only, not full dataset | All list pages |
| R30 | PR/PO/GRN viewers hardcoded `isPosted={true}` overlay | All viewers |

### 🟢 Low Risks

| # | Risk | Details |
|---|------|---------|
| R31 | `Can` component dead code | Zero usages, should be removed |
| R32 | `useNetworkStatus` hook dead code | Not used anywhere |
| R33 | Two `ConflictDialog` implementations | One is dead code |
| R34 | `api/usePurchaseRequests.ts` + `api/usePurchaseOrders.ts` dead mock code | Not imported |
| R35 | Currency hardcoded to SAR in 3 components | Not configurable |
| R36 | Whitespace-only rejection reasons pass validation | LOW |
| R37 | `StatusTimeline` shows single entry in operations viewers | Not an actual timeline |
| R38 | No version/optimistic locking sent in some master data mutations | Silent last-write-wins |

---

## 11. Production Readiness Report

### What Blocks Production Deployment

| # | Blocker | Severity | Resolution Required |
|---|---------|----------|-------------------|
| 1 | **Stocktake workflow broken** — cannot start → count cycle | BLOCKER | Fix START→COUNTING transition: either call `useBeginCounting` or update count page guard |
| 2 | **GRN scan mode mock-only** — no real backend endpoint | BLOCKER | Implement backend endpoint or remove scan mode from production routing |
| 3 | **Issue creation mock-only** — `issue-form.tsx` uses mock hook | BLOCKER | Re-wire to `hooks/useCreateIssue.ts` |
| 4 | **Transfer ship scan is cosmetic** — data never sent | HIGH | Add scanned line data to ship payload OR remove scanning UX |
| 5 | **8 components with fake data** — UserForm, ExpiredOverride, LotBalance, FEFOLotAllocator, TransferHub, YieldManagement, LandedCost | HIGH | Replace each with real API integration or gate behind feature flags |
| 6 | **Hardcoded warehouses in Adjustment workflow** | HIGH | Replace with `useWarehouses()` hook |
| 7 | **Type system fragmentation** — field name mismatches cause runtime errors | HIGH | Unify type system across all layers |

### What Is Production-Ready

| Area | Status |
|------|--------|
| Master Data CRUD (branches, warehouses, departments, items, suppliers, UoMs, categories, currencies) | ✅ Good — consistent patterns, real API integration |
| Dashboard basics | ✅ Good — real stats API, multiple dashboard variants |
| Conflict detection & resolution | ✅ Good — `useSafeMutation` + conflict bus |
| Error boundaries | ✅ Good — `GlobalErrorBoundary` + `ErrorBoundary` |
| Loading states | ✅ Good — multiple skeleton variants |
| Print support | ✅ Good — `print:hidden` classes |
| RTL/LTR | ✅ Good — logical properties throughout |
| Audit logs (admin) | ✅ Good |
| GRN list with search/sort/pagination | ✅ Good — best-implemented list page |
| Procurement hooks (PR, PO, GRN APIs) | ✅ Good — consistent patterns, conflict detection |

### What Needs Moderate Work

| Area | Status | Work Required |
|------|--------|---------------|
| Stocktake workflow | 🟡 Partial | Fix START→COUNTING, implement recount, remove dead code |
| Adjustment workflow | 🟡 Partial | Fix hardcoded warehouses, wire cancel, wire batch actions |
| Transfer workflow | 🟡 Partial | Wire ship scan data, implement cancel, remove mock hub |
| Issue workflow | 🟡 Partial | Fix mock create, implement SUBMIT flow, fix posted overlay |
| PR/PO workflow | 🟡 Partial | Implement cancel, wire search, fix viewer overlays |
| GRN workflow | 🟡 Partial | Fix scan mode, implement lot allocation in main form |
| Notifications | 🟡 Partial | Templates CRUD looks well-implemented |
| Reports | 🟡 Partial | 7 report pages, some use real hooks |

### What Is Not Production-Ready

| Area | Status | Work Required |
|------|--------|---------------|
| Transfer Hub | 🔴 Not ready | Fully mock — must implement real API or remove route |
| Expired Override | 🔴 Not ready | Fully mock — must implement backend feature |
| Yield Management | 🔴 Not ready | Mock data — must implement API |
| Landed Cost | 🔴 Not ready | Mock data — must implement API |
| Lot Balance movements | 🔴 Not ready | Mock data — must implement API |
| FEFO Lot Allocator | 🔴 Not ready | Hardcoded lot data — must connect to real lots |

---

## 12. Frontend Technical Quality Report

### 12.1 Maintainability

| Aspect | Assessment |
|--------|------------|
| **Component organization** | Good — feature-grouped under `features/`, page components under route tree |
| **Duplication** | **High** — `purchase-request-form.tsx` duplicated in both `features/purchasing/components/` and `app/.../PRForm.tsx`. Same for POForm and GRNForm. `TransferHubClient` duplicated in `operations/` and `inventory/`. |
| **Dead code** | Moderate — `useBeginCounting`, `Can`, `useNetworkStatus`, mock API files, legacy `ConflictDialog` all unused |
| **File sizes** | Some files too large: `AdjustmentForm.tsx` (784 lines), `AdjustmentCreateClient.tsx` (726 lines), `GRNScanClient.tsx` (large), `mock-api.adapter.ts` (1400+ lines) |
| **Reusable patterns** | Good — `StatusBadge`, `PageHeader`, `FormFooter`, `SmartCombobox`, `ScanInput`, `DocumentLineItemTable`, `MetricCard`, `DataTable` all well-designed |

### 12.2 Scalability

| Aspect | Assessment |
|--------|------------|
| **API layer** | Good — single `apiClient` with Zod validation, mock switching at the adapter level |
| **State management** | Good — TanStack Query with 60s stale time scales well |
| **Permission system** | Good — declarative, matrix-based, extendable |
| **Internationalization** | Good — `next-intl` with separate `en.json`/`ar.json` files (~3600 lines each) |
| **Potential bottleneck** | All mocks resolved through single `mock-api.adapter.ts` (1400+ lines) — will become unmaintainable as routes grow |

### 12.3 Abstraction Quality

| Aspect | Assessment |
|--------|------------|
| **API hooks** | Good — separated from business logic hooks |
| **Map layer** | Excellent — `stocktakeMapper.ts` provides clean camelCase ViewModel |
| **Mappers missing** | **Notable gap** — only stocktake has a mapper. Adjustments, transfers, issues, PR, PO, GRN all use raw API types mixed with ViewModels |
| **Form schemas** | Good — separate Zod form schemas from API schemas (master data) |
| **Consistent hook pattern** | Varied — some hooks take `id` as closure parameter, others via mutation function |

### 12.4 Technical Debt

| Debt | Location | Severity | Resolution |
|------|----------|----------|------------|
| Three conflicting type systems | `types/documents.ts`, `features/*/types/`, inline Zod | HIGH | Unify to single canonical Zod source |
| Duplicated form implementations | PRForm, POForm in app/ vs features/ | HIGH | Consolidate to single shared component |
| Mock data in production components | 8+ components | CRITICAL | Replace with real API calls |
| Dead code | Multiple files | MEDIUM | Remove unused exports and components |
| Large files | mock-api.adapter.ts (1400+), AdjustmentForm.tsx (784) | MEDIUM | Split into smaller modules |
| `as unknown as` type casts | Multiple files | HIGH | Fix type definitions instead of bypassing |
| Inconsistent query key patterns | Transfer/adjustment (list vs detail) | LOW | Standardize naming convention |
| Hardcoded SAR currency | 3 stocktake components | MEDIUM | Use currency from settings/context |
| Non-standard pagination shapes | `useIssueList` vs `useTransferList` | LOW | Standardize on `paginatedSchema` helper |
| Transfer schema `lot: z.null()` | `useTransfer.ts` | HIGH | Change to proper nullable object |

---

## 13. Mock Data & Temporary Logic Audit

### 13.1 Mock API Layer

| System | Location | Status | Migration |
|--------|----------|--------|-----------|
| **Legacy static mocks** | `lib/api/mocks/*.ts` | 🟡 Active (fallback) | Ready for removal |
| **Repository-based mocks** | `infrastructure/mock/*.ts` | 🟢 Active (primary) | Ready for removal when backend ready |
| **Mock adapter** | `mock-api.adapter.ts` (1400+ lines) | 🟢 Active | Contains real business logic (hydrate, lock check, inventory manifestation) — must be migrated to backend |

### 13.2 Components Using Mock/Hardcoded Data as Primary Source

| Component | Mock Data | Risk Level | Migration Path |
|-----------|-----------|------------|----------------|
| `UserFormClient.tsx` | `MOCK_BRANCHES`, `MOCK_WAREHOUSES`, `MOCK_DEPARTMENTS` | 🔴 CRITICAL | Replace with `useBranches()`, `useWarehouses()`, `useDepartments()` |
| `ExpiredOverrideClient.tsx` | `MOCK_OVERRIDES` | 🔴 CRITICAL | Implement full feature or gate behind flag |
| `LotBalanceClient.tsx` | `MOCK_MOVEMENTS` | 🔴 CRITICAL | Connect to real API |
| `FEFOLotAllocator.tsx` | `MOCK_AVAILABLE_LOTS` | 🔴 CRITICAL | Connect to `useLotsByItem` or similar |
| `TransferHubClient.tsx` (both copies) | `MOCK_TRANSFERS` | 🔴 CRITICAL | Connect to `useTransferList` |
| `YieldManagementClient.tsx` | `MOCK_YIELD_DATA` | 🔴 CRITICAL | Connect to backend API |
| `LandedCostClient.tsx` | `MOCK_ITEMS` | 🔴 CRITICAL | Connect to backend API |

### 13.3 Components Using Fallback Arrays

| Component | Fallback | Risk Level |
|-----------|----------|------------|
| `AdjustmentCreateClient.tsx` | `fallbackReasons` | 🟡 MEDIUM — shows correct data if API is unavailable |
| `AdjustmentForm.tsx` | `fallbackReasons` | 🟡 MEDIUM — same |
| Multiple feature hooks | `INITIAL_*` arrays (categories, FX rates, UoMs, suppliers, barcodes) | 🟡 MEDIUM — seeds cache with fake data on API failure |

### 13.4 Temporary Frontend Logic

| Logic | Location | Operational Risk |
|-------|----------|-----------------|
| Client-side FIFO lot allocation | `AdjustmentCreateClient.tsx` | 🟡 MEDIUM — complex, may produce incorrect allocations |
| Local lot creation (not persisted) | `AdjustmentCreateClient.tsx` | 🟡 MEDIUM — lot references may not exist on server |
| `'Current User'` in optimistic updates | 4+ mutation hooks | 🔴 HIGH — timeline shows incorrect user |
| `handleApprove` without comment | All approve screens | 🟡 MEDIUM — no audit trail for approvals |
| `confirmKeyword` from translation | All post screens | 🟡 MEDIUM — single point of failure |

---

## 14. Screen-by-Screen Analysis

### 14.1 Stocktake Screens

#### SCREEN: Stocktake List (`StocktakeListClient.tsx`)
- **Purpose**: Browse and filter stocktake sessions
- **Status**: 🟡 Partial — search decorative, metrics from current page only
- **Critical Issues**: None
- **Missing**: Search functionality, column filters, export

#### SCREEN: Stocktake Create (`stocktake-form.tsx`)
- **Purpose**: Create new stocktake session
- **Status**: 🟢 Good — wizard-like flow, warehouse selection, session naming
- **Critical Issues**: None

#### SCREEN: Stocktake Start (`StocktakeStartClient.tsx`)
- **Purpose**: Verify readiness and start counting
- **Status**: 🟡 Partial — checks warehouse lock, pending documents
- **Critical Issues**: ⚠️ Navigates to count page after START but count page rejects STARTED status
- **Missing**: Auto-call `useBeginCounting` after start

#### SCREEN: Stocktake Count (`StocktakeCountClient.tsx`)
- **Purpose**: Enter counted quantities per item
- **Status**: 🔴 Critical bugs — workflow broken, offline edits lost
- **Critical Issues**: 
  1. ⚠️ Redirects away when status is STARTED (not COUNTING)
  2. ⚠️ Offline edits silently lost
- **Missing**: Progress indicator, recount, all-items-validation, `useBeginCounting`

#### SCREEN: Stocktake Variance (`StocktakeVarianceClient.tsx`)
- **Purpose**: Enter variance reasons per item with discrepancy
- **Status**: 🟡 Partial — properly shows discrepancies toggle
- **Critical Issues**: ⚠️ "Partial Recount" button is no-op
- **Missing**: Working recount, bulk reason apply, nav fix (backHref dead-end)

#### SCREEN: Stocktake Approve (`StocktakeApproveClient.tsx`)
- **Purpose**: Review variances and approve/reject
- **Status**: 🟢 Good — threshold awareness, metric cards, approval confirmation
- **Issues**: Reject action not gated by permission, SAR hardcoded, commentless approve

#### SCREEN: Stocktake Post (`StocktakePostClient.tsx`)
- **Purpose**: Finalize stocktake and update inventory
- **Status**: 🟢 Good — keyword confirmation, summary display
- **Issues**: Confirm keyword from translations = single point of failure

### 14.2 Inventory & Master Data Screens

#### SCREEN: Stock Balance (`StockBalanceClient.tsx`)
- **Purpose**: View current stock levels per warehouse
- **Status**: 🟡 Partial — uses real API
- **Missing**: Filter by item/lot/expiry

#### SCREEN: Lot Balance (`LotBalanceClient.tsx`)
- **Purpose**: View lot-level balances
- **Status**: 🔴 Not ready — uses `MOCK_MOVEMENTS` as direct display data

#### SCREEN: Expired Override (`ExpiredOverrideClient.tsx`)
- **Purpose**: Override expired lot status (write-off)
- **Status**: 🔴 Not ready — fully mock, no API calls

#### SCREEN: Inventory Scan Mode (`ScannerClient.tsx`)
- **Purpose**: Barcode-based inventory lookup
- **Status**: 🟢 Good — real API, sound effects, lot selection

### 14.3 Procurement Screens

#### SCREEN: PR List (`PRListClient.tsx`)
- **Purpose**: Browse purchase requests
- **Status**: 🟡 Partial — real API, but search decorative, `created_by` missing from schema
- **Critical Issues**: ⚠️ `created_by` column renders undefined

#### SCREEN: PR Approve (`PRApprovalClient.tsx`)
- **Purpose**: Approve/reject purchase requests
- **Status**: 🟢 Good — confirmation dialogs, "Generate PO" link, RBAC

#### SCREEN: PO List (`POListClient.tsx`)
- **Purpose**: Browse purchase orders
- **Status**: 🟡 Partial — search decorative, `currency_code` missing from schema
- **Critical Issues**: ⚠️ `currency_code` column renders undefined

#### SCREEN: PO Approve (`POApproveClient.tsx`)
- **Purpose**: Approve/reject purchase orders
- **Status**: 🟢 Good — budget placeholder, confirmation dialogs

#### SCREEN: GRN List (`GRNListClient.tsx`)
- **Purpose**: Browse goods received notes
- **Status**: 🟢 Good — search, sort, pagination, virtualized table — best list UX

#### SCREEN: GRN Scan Mode (`GRNScanClient.tsx` + `LotEntryModal.tsx`)
- **Purpose**: Scan barcodes and enter lot info for received goods
- **Status**: 🔴 Not ready — uses mock API layer, different type system from main GRN form
- **Critical Issues**: ⚠️ Entirely mock-backed. No real backend endpoint exists.

### 14.4 Operations Screens

#### SCREEN: Adjustment Create (`AdjustmentCreateClient.tsx`)
- **Purpose**: Create inventory adjustments
- **Status**: 🟢 Good — scan, FIFO suggestion, custom item creation, lot creation
- **Issues**: Local lot creation not persisted; stock check required

#### SCREEN: Adjustment Edit (`AdjustmentForm.tsx`)
- **Purpose**: Edit existing adjustments
- **Status**: 🔴 Critical bugs — hardcoded warehouses, lot_allocations stripped from update
- **Critical Issues**: ⚠️ `warehouseItems` hardcoded to `wh-1`/`wh-2`

#### SCREEN: Issue Create (`issue-form.tsx`)
- **Purpose**: Create stock issue requests
- **Status**: 🔴 Not ready — uses mock create hook, mock lock check
- **Critical Issues**: ⚠️ `useCreateIssue` imported from mock file

#### SCREEN: Transfer Create (`TransferNewClient.tsx`)
- **Purpose**: Create warehouse transfers
- **Status**: 🟢 Good — real API, lot allocation support

#### SCREEN: Transfer Ship (`TransferShipClient.tsx`)
- **Purpose**: Scan and ship transfer items
- **Status**: 🔴 Critical — scan data never sent to backend
- **Critical Issues**: ⚠️ `scannedLines` purely cosmetic

#### SCREEN: Transfer Receive (`TransferReceiveClient.tsx`)
- **Purpose**: Receive and verify transferred items
- **Status**: 🟡 Partial — state set during render (anti-pattern), no lot-level receive
- **Issues**: Default "receive all" rather than "scan up"; React anti-pattern in render

#### SCREEN: Transfer Hub (`TransferHubClient.tsx`)
- **Purpose**: Transfer dashboard with KPIs
- **Status**: 🔴 Not ready — 100% mock data

---

## 15. Component Inventory Audit

### 15.1 Reusable Components Quality

| Component | Usage Count | Quality | Issues |
|-----------|-------------|---------|--------|
| `PageHeader` | ~30 | 🟢 Excellent | None |
| `FormFooter` | ~15 | 🟢 Good | None |
| `StatusBadge` | ~40 | 🟢 Excellent | None |
| `SmartCombobox` | ~20 | 🟢 Good | None |
| `ScanInput` | ~10 | 🟢 Good | None |
| `DocumentLineItemTable` | ~15 | 🟢 Good | Complex interface |
| `PostConfirmDialog` | ~12 | 🟢 Good | None |
| `DataTable` | ~10 | 🟢 Good | Virtualization support |
| `MetricCard` | ~10 | 🟢 Good | None |
| `PermissionGate` | 252 | 🟢 Good | Widely used |
| `ActionGuard` | 59 | 🟢 Good | Default role concern |
| `LoadingSkeleton` | ~30 | 🟢 Good | Multiple variants |
| `ErrorState` | ~25 | 🟢 Good | With retry |
| `EmptyState` | ~5 | 🟡 Fair | Underutilized |
| `DocumentExportMenu` | ~5 | 🟡 New | Recently added |
| `StickyGlassHeader` | ~5 | 🟡 New | Recently added |
| `FEFOLotAllocator` | ~3 | 🔴 Critical | Hardcoded mock data |
| `GlassModal` | ~2 | 🟡 Fair | Rarely used |
| `ConflictDialog` (duplicate) | 2 versions | 🟡 Fair | One is dead code |

### 15.2 Component Duplication

| Duplicate | Locations | Resolution |
|-----------|-----------|------------|
| `purchase-request-form.tsx` | `features/purchasing/components/` + `app/.../PRForm.tsx` | Consolidate to shared component |
| `purchase-order-form.tsx` | `features/purchasing/components/` + `app/.../POForm.tsx` | Consolidate to shared component |
| `grn-form.tsx` | `features/purchasing/components/` + `app/.../GRNForm.tsx` (inline in page) | Consolidate to shared component |
| `TransferHubClient.tsx` | `operations/transfers/hub/` + `inventory/transfers/hub/` | Consolidate to shared component |
| `ConflictDialog` | `core/concurrency/` + `components/shared/` | Remove dead copy |
| `useItems` | `features/items/api/` + `features/items/hooks/` | Consolidate |
| `useWarehouses` | `features/warehouses/api/` + `features/warehouses/hooks/` | Consolidate |

---

## 16. Backend Requirements Extraction

### 16.1 API Contracts Required

All endpoints listed in [Section 5](#5-api-dependency-map) must be implemented. Additionally:

### 16.2 Entity Requirements

| Entity | Required Fields | Validations |
|--------|----------------|-------------|
| StocktakeSession | id, session_number, session_name, warehouse_id, status, items[], snapshot_at, version, created_at, started_at, posted_at | Status enum (6 values), version for optimistic lock |
| StocktakeItem | id, item_id, item_name, barcode, uom, snapshot_qty, counted_qty, variance, variance_reason, unit_cost | counted_qty nullable, variance_reason nullable |
| Adjustment | id, document_number, warehouse_id, reason, notes, lines[], status, version, timeline[] | reason enum, notes min 10, lines count > 0 |
| Transfer | id, document_number, from_warehouse_id, to_warehouse_id, lines[], status, timeline[] | Lot allocations optional, shipped/received qty |
| Issue | id, document_number, warehouse_id, destination_dept_id, lines[], status, timeline[] | Lot allocations (FEFO), allocated_qty tracked |
| PurchaseRequest | id, document_number, department_id, expected_date, lines[], status, version | Approve/reject workflow, Convert to PO |
| PurchaseOrder | id, document_number, supplier_id, currency_id, expected_delivery_date, lines[], status, version | Approve/reject workflow, email dispatch |
| GoodsReceiptNote | id, document_number, po_id?, warehouse_id, supplier_id, currency_id, fx_rate, lines[], status, version, timeline[] | Lot entries, FX capture, PO over-receiving check |

### 16.3 Backend Business Logic Requirements

| Logic | Required For | Description |
|-------|-------------|-------------|
| **Inventory manifestation** | Stocktake POST, Adjustment POST, Issue POST, Transfer POST, GRN POST | Update `qty_available` on lots |
| **Inventory movement recording** | Same as above | Write movements to immutable audit trail |
| **Warehouse locking** | Stocktake START → warehouse locked | Prevent edits to inventory during stocktake |
| **FEFO allocation** | Issue creation | Suggest oldest-expiry lots first |
| **Currency/FX handling** | PO, GRN | Track base currency amounts, capture rate at posting |
| **Stocktake snapshot freeze** | Stocktake creation | Capture current inventory levels at creation time |
| **Version conflict detection** | All PUT/POST mutations | Return 409 on version mismatch |
| **Idempotency support** | All POST mutations | Accept `X-Idempotency-Key` header |
| **Pagination** | All list endpoints | Standard `{ data: [...], meta: { page, page_size, total, total_pages } }` |
| **RESTful naming** | All endpoints | Snake_case field names in API responses |

### 16.4 Permission Requirements

| System | Components | Implementation |
|--------|-----------|----------------|
| **Resource-level RBAC** | PermissionGate, usePermission | Matrix-based: role × resource × action |
| **Document workflow** | ActionGuard, canPerformActionV2 | Status-based: document_type × status × action × role |
| **Backend enforcement** | All APIs | **Must mirror frontend checks exactly** — all frontend gates are purely UI |

---

## 17. Prioritized Improvement Plan

### 🔴 Critical (Production Blockers — Immediate)

| # | Task | Area | Effort |
|---|------|------|--------|
| 1 | **Fix stocktake START→COUNTING transition**: Either call `useBeginCounting` after start, or update count page guard to accept STARTED | Stocktake | 2h |
| 2 | **Replace issue-form mock create with real hook**: Import from `hooks/useCreateIssue.ts` instead of `api/useIssues.ts` | Issues | 1h |
| 3 | **Wire ship scan data to backend**: Add `lines` array with `{ line_id, scanned_qty }` to ship mutation payload | Transfers | 3h |
| 4 | **Implement real GRN scan mode backend endpoint**: Create `PUT /procurement/grns/:id/items/:lineId` or remove scan mode | GRN | 4h |
| 5 | **Replace mock data in 8 production components**: UserFormClient, ExpiredOverride, LotBalance, FEFOLotAllocator, TransferHub (x2), YieldManagement, LandedCost | Multiple | 12h |
| 6 | **Fix hardcoded warehouses in Adjustment workflow**: Replace ternary with `useWarehouses()` hook | Adjustments | 2h |
| 7 | **Remove `'Current User'` from optimistic updates**: Pass real user identity to mutation hooks | All documents | 4h |

### 🟠 High (Workflow & Transactional Weaknesses — This Week)

| # | Task | Area | Effort |
|---|------|------|--------|
| 8 | **Unify type system**: Eliminate `types/documents.ts` vs `features/*/types/` fragmentation | Architecture | 8h |
| 9 | **Implement Cancel action** for all document types (PR, PO, GRN, Stocktake, Adjustment, Transfer, Issue) | All workflows | 8h |
| 10 | **Fix `lot: z.null()` in transfer schema** — change to nullable object | Transfers | 1h |
| 11 | **Fix IssueViewer hardcoded `isPosted={true}`** — make dynamic based on status | Issues | 1h |
| 12 | **Add `created_by` and `currency_code`** to PR/PO summary schemas | Procurement | 1h |
| 13 | **Fix StocktakeApproveClient reject permission** — gate REJECT action via engine | Stocktake | 1h |
| 14 | **Add offline edit warning** to StocktakeCountClient — disable inputs or warn | Stocktake | 2h |
| 15 | **Fix AdjustForm lot_allocations** — include in update payload | Adjustments | 2h |
| 16 | **Wire search inputs** on all list pages (PR, PO, Adjustment, Stocktake lists) | Lists | 4h |
| 17 | **Add `keepPreviousData`** to all list queries for smooth pagination | Lists | 2h |

### 🟡 Medium (Consistency & Maintainability — This Sprint)

| # | Task | Area | Effort |
|---|------|------|--------|
| 18 | **Remove dead code**: `Can`, `useNetworkStatus`, mock API files, legacy ConflictDialog, `useBeginCounting` | Cleanup | 2h |
| 19 | **Consolidate duplicated form components**: PRForm, POForm, GRNForm, TransferHubClient | Architecture | 6h |
| 20 | **Fix `StocktakeVarianceClient` back-navigation dead-end** | Stocktake | 1h |
| 21 | **Add `handleApprove` with comment support** to all approve screens | All documents | 3h |
| 22 | **Narrow status enums** from `ALL_DOCUMENT_STATUSES` to domain-specific | Types | 2h |
| 23 | **Normalize mutation hook id patterns** — consistent closure vs mutate parameter | Architecture | 3h |
| 24 | **Add pessimistic locking checks** to all master data mutations | Master Data | 4h |
| 25 | **Replace hardcoded SAR currency** with configurable base currency | Stocktake | 2h |
| 26 | **Add error toast handlers** to all mutations that silently swallow errors | All hooks | 2h |
| 27 | **Wire batch action buttons** in AdjustmentListClient | Adjustments | 3h |
| 28 | **Add `PaginatedResponse` schema consistency** across all list hooks | Architecture | 3h |
| 29 | **Add confirmation keyword fallback** for posting | Post screens | 1h |

### 🟢 Low (Polish & Optimization — Next Sprint)

| # | Task | Area | Effort |
|---|------|------|--------|
| 30 | **Fix whitespace-only rejection prevention** — add `.trim()` length check before `.length` check | Approve screens | 0.5h |
| 31 | **Replace `as unknown as` type casts** with proper type definitions | Multiple | 4h |
| 32 | **Add character counter to variance reason textareas** | Stocktake | 1h |
| 33 | **Add `StatusTimeline` with full audit log** to operations viewers | All operations | 4h |
| 34 | **Add `is_custom` flag support** to Adjustment update payload | Adjustments | 1h |
| 35 | **Add detail key invalidation** after mutations in all hooks | Architecture | 2h |
| 36 | **Remove `INITIAL_*` query data seeding** — replace with proper empty handling | Feature hooks | 3h |
| 37 | **Add `ALL_STOCKTAKE_STATUSES`** enum and use in schemas | Types | 1h |
| 38 | **Standardize pagination URL state** across all list pages | Lists | 4h |
| 39 | **Consolidate `useItems` and `useWarehouses`** dual implementations | Architecture | 2h |
| 40 | **Add lot-level receive granularity** for transfers with lot allocations | Transfers | 4h |

---

*End of Audit Report*

*This audit was performed by direct source code analysis of the frontend repository at `E:\kitchen-store-inventory-system\apps\web\src`. All findings are based on actual code inspection, not assumptions or visual review.*
