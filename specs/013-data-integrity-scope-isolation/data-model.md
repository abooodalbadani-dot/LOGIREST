# Data Model: Phase 3 — Data Integrity & Scope Isolation

**Date**: 2026-05-21
**Feature**: [spec.md](./spec.md)

This phase does not introduce new database entities or schema changes. It modifies how existing entities are queried, filtered, and aggregated. The entities below document the current state relevant to this phase's changes and the new contracts introduced.

---

## Existing Entities (Modified Query Behavior)

### Entity: Adjustment List Query

| Field | Type | Phase 3 Change |
|-------|------|----------------|
| `warehouse_id` | `string \| null` (query param) | **P3-01**: Now populated from `useOperationalScope().warehouseId`; previously not passed by client |
| `branch_id` | `string \| null` (query param) | **P3-01**: Now populated from `useOperationalScope().branchId`; previously not passed by client |
| `status` | `string` (query param) | Unchanged |
| `search` | `string` (query param) | Unchanged |
| `page` | `number` (query param) | Unchanged |

**Existing query key before**: `['adjustments', { status, search, page }]`
**New query key after**: `['adjustments', { status, search, page, warehouseId, branchId }]`

### Entity: Transfer List Query

| Field | Type | Phase 3 Change |
|-------|------|----------------|
| `warehouse_id` | `string \| null` (query param) | **P3-01**: New filter parameter; previously not supported at all |
| `branch_id` | `string \| null` (query param) | **P3-01**: New filter parameter; previously not supported at all |

**Existing query key before**: `['transfers', { status, page, search }]`
**New query key after**: `['transfers', { status, page, search, warehouseId, branchId }]`

### Entity: Issue List Query

| Field | Type | Phase 3 Change |
|-------|------|----------------|
| `warehouse_id` | `string \| null` (query param) | **P3-01**: New filter parameter; previously the narrowest query (only status + page) |
| `branch_id` | `string \| null` (query param) | **P3-01**: New filter parameter |

**Existing query key before**: `['issues', { status, page }]`
**New query key after**: `['issues', { status, page, warehouseId, branchId }]`

### Entity: Stocktake List Query

| Field | Type | Phase 3 Change |
|-------|------|----------------|
| `warehouse_id` | `string \| null` (query param) | **P3-01**: Already supported (passed via `initialWarehouseId`); now consistently populated from `useOperationalScope()` |

**No query key change** — scope already included.

---

## New Entities (Phase 3 Introductions)

### Entity: Operational Scope (hook return type)

Introduced by `useOperationalScope()` hook. Not a database entity — derived from `useAuth().activeScope`.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `warehouseId` | `string \| null` | `useAuth().activeScope.warehouseId` | Currently active warehouse for the session |
| `branchId` | `string \| null` | `useAuth().activeScope.branchId` | Currently active branch for the session |

**Lifecycle**: Persisted in localStorage via `AuthProvider`. Updated by the context selector UI. Read by all operational list/query hooks.

**Null handling** (per clarifications Q2):
- `warehouseId === null` for WH_KEEPER → empty state message displayed on list screens
- `warehouseId === null` for ADMIN/INV_MGR → scope not applied (all warehouses visible)
- `warehouseId === null` for detail view access → no scope restriction applied

---

### Entity: Adjustment Summary

New server-side aggregate. Returned by `GET /operations/adjustments/summary`.

| Field | Type | Description |
|-------|------|-------------|
| `total` | `number` | Total count of adjustments matching the scope and status filters |
| `pending` | `number` | Count of adjustments in DRAFT or SUBMITTED status |
| `critical_losses` | `number` | Count of adjustments with reason DAMAGE or THEFT |

**Scope-awareness**: Filtered by `warehouse_id` and `branch_id` query params when provided.
**Cache key**: `['adjustments', 'summary', { warehouseId, branchId }]`
**Invalidation**: On any adjustment mutation (create, approve, post, cancel, reject).

### Entity: Transfer Summary

New server-side aggregate. Returned by `GET /operations/transfers/summary`.

| Field | Type | Description |
|-------|------|-------------|
| `total` | `number` | Total count of transfers matching scope filter |
| `in_transit` | `number` | Count of transfers in IN_TRANSIT status |
| `overdue_count` | `number` | Count of in-transit transfers exceeding the configured overdue threshold |

**Scope-awareness**: Filtered by `warehouse_id` and `branch_id` query params when provided.
**Cache key**: `['transfers', 'summary', { warehouseId, branchId }]`
**Invalidation**: On any transfer mutation (create, ship, receive, cancel).

### Entity: Stocktake Summary

New server-side aggregate. Returned by `GET /stocktake/sessions/summary`.

| Field | Type | Description |
|-------|------|-------------|
| `total` | `number` | Total count of stocktake sessions matching scope filter |
| `in_progress` | `number` | Count of sessions in non-terminal statuses (DRAFT, STARTED, COUNTING, REVIEWING) |
| `posted` | `number` | Count of sessions in POSTED status |

**Scope-awareness**: Filtered by `warehouse_id` and `branch_id` query params when provided.
**Cache key**: `['stocktakes', 'summary', { warehouseId, branchId }]`
**Invalidation**: On any stocktake mutation (start, count, review, approve, post, close).
**Polling**: Maintains existing 10s `refetchInterval` pattern from `useStocktakeList`.

---

### Entity: Operational Configuration

Static configuration object. Not a database entity — derived from environment variables at build time.

| Field | Type | Source | Default | Description |
|-------|------|--------|---------|-------------|
| `TRANSFER_OVERDUE_DAYS` | `number` | `NEXT_PUBLIC_TRANSFER_OVERDUE_DAYS` env var | `3` | Days after which an in-transit transfer is considered overdue |

**Validation**: Must be a positive integer. Falls back to 3 on non-numeric, negative, or unset values.
**Usage**: Consumed by the transfer summary endpoint (server-side overdue count). Read by client for display label text only.

---

### Entity: Role Capability Contract

Centralized permission mapping. Not a database entity — static TypeScript `as const` object.

| Key Level 1 | Key Level 2 | Value Type | Description |
|-------------|-------------|------------|-------------|
| `documentType` (e.g., `adjustment`) | `action` (e.g., `create`, `approve`) | `Role[]` | Roles permitted to perform this action on this document type |

**Structure**:
```
ROLE_CAPABILITIES[documentType][action] = Role[]
```

**Consumers**:
1. `usePermission` → derives `PERMISSION_MATRIX[role][resource]` from capabilities
2. `canPerformActionV2` → derives `transitionMapV2[type][status][action].allowedRoles` from capabilities

**Document types covered**: `adjustment`, `transfer`, `issue`, `stocktake`, `kitchen_request`, `pr`, `po`, `grn`
**Actions per document type**: `create`, `submit`, `approve`, `post`, `cancel`, `edit`, `reject`, `view`, `export`, `ship`, `receive`, `start`, `count`, `review`, `close`
**Roles**: `ADMIN`, `INV_MGR`, `WH_KEEPER`, `STORE_MGR`, `APPROVER`, `KITCHEN_CHIEF`, `PROC_OFFICER`, `AUDITOR`, `GM`, `VIEWER`

---

## Cache Invalidation Matrix

| Mutation Hook | Invalidated Query Keys | Phase |
|---------------|----------------------|-------|
| `useCreateWarehouse` | `['warehouses']` | P3-04 |
| `useUpdateWarehouse` | `['warehouses']` + `['warehouses', id]` | P3-04 |
| `useCreateItem` | `['items']` | P3-04 |
| `useUpdateItem` | `['items']` + `['items', id]` | P3-04 |
| `useCreateAdjustment` | `['adjustments']` + `['adjustments', 'summary']` | P3-02 |
| `useApproveAdjustment` | `['adjustments']` + `['adjustments', id]` + `['adjustments', 'summary']` | P3-02 |
| `usePostAdjustment` | `['adjustments']` + `['adjustments', id]` + `['adjustments', 'summary']` | P3-02 |
| `useCancelAdjustment` | `['adjustments']` + `['adjustments', id]` + `['adjustments', 'summary']` | P3-02 |
| `useCreateTransfer` | `['transfers']` + `['transfers', 'summary']` | P3-02 |
| `useShipTransfer` | `['transfers']` + `['transfers', id]` + `['transfers', 'summary']` | P3-02 |
| `useReceiveTransfer` | `['transfers']` + `['transfers', id]` + `['transfers', 'summary']` | P3-02 |
| Stocktake mutations | `['stocktakes']` + `['stocktakes', 'summary']` | P3-02 |

**Pattern**: Every mutation that changes a document's status also invalidates the corresponding summary query key so KPI cards reflect the update within SC-007's 3-second window.
