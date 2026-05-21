# Contracts: Phase 3 — Data Integrity & Scope Isolation

**Date**: 2026-05-21
**Feature**: [spec.md](../spec.md)

## Summary Endpoints

Backend API contracts required for server-side KPI aggregation (P3-02).

### GET /operations/adjustments/summary

Returns aggregate counts for adjustments, filtered by scope.

**Query Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `warehouse_id` | string (UUID) | No | Filter by warehouse. If absent, returns system-wide counts. |
| `branch_id` | string (UUID) | No | Filter by branch. |

**Response** (200):
```json
{
  "total": 200,
  "pending": 45,
  "critical_losses": 12
}
```

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total matching adjustments |
| `pending` | number | Status = DRAFT or SUBMITTED |
| `critical_losses` | number | Reason = DAMAGE or THEFT, all statuses |

**Error Responses**:
- `401` — Not authenticated
- `403` — Not authorized (e.g., WH_KEEPER without active scope attempting system-wide query)

---

### GET /operations/transfers/summary

Returns aggregate counts for transfers, filtered by scope.

**Query Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `warehouse_id` | string (UUID) | No | Filter by warehouse. |
| `branch_id` | string (UUID) | No | Filter by branch. |

**Response** (200):
```json
{
  "total": 150,
  "in_transit": 35,
  "overdue_count": 8
}
```

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total matching transfers |
| `in_transit` | number | Status = IN_TRANSIT |
| `overdue_count` | number | Status = IN_TRANSIT AND days since shipped > configured threshold |

**Error Responses**:
- `401` — Not authenticated
- `403` — Not authorized

---

### GET /stocktake/sessions/summary

Returns aggregate counts for stocktake sessions, filtered by scope.

**Query Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `warehouse_id` | string (UUID) | No | Filter by warehouse. |
| `branch_id` | string (UUID) | No | Filter by branch. |

**Response** (200):
```json
{
  "total": 80,
  "in_progress": 12,
  "posted": 55
}
```

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total matching stocktake sessions |
| `in_progress` | number | Status = DRAFT, STARTED, COUNTING, or REVIEWING |
| `posted` | number | Status = POSTED |

**Error Responses**:
- `401` — Not authenticated
- `403` — Not authorized

---

## Role Capabilities Contract

Centralized permission model (P3-05). This contract defines which roles can perform which actions on which document types. Both `usePermission` and `canPerformActionV2` derive their authorization from this single source of truth.

### Document Type: Adjustment

| Action | Allowed Roles |
|--------|--------------|
| `create` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR |
| `submit` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR |
| `approve` | ADMIN, APPROVER, INV_MGR, STORE_MGR |
| `reject` | ADMIN, APPROVER, INV_MGR, STORE_MGR |
| `post` | ADMIN, INV_MGR |
| `cancel` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR |
| `edit` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR |
| `view` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR, APPROVER, KITCHEN_CHIEF, PROC_OFFICER, AUDITOR, GM, VIEWER |
| `export` | ADMIN, INV_MGR, STORE_MGR, AUDITOR, GM |

### Document Type: Transfer

| Action | Allowed Roles |
|--------|--------------|
| `create` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR |
| `ship` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR |
| `receive` | ADMIN, INV_MGR, WH_KEEPER |
| `cancel` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR |
| `view` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR, APPROVER, KITCHEN_CHIEF, PROC_OFFICER, AUDITOR, GM, VIEWER |
| `export` | ADMIN, INV_MGR, STORE_MGR, AUDITOR, GM |

### Document Type: Issue

| Action | Allowed Roles |
|--------|--------------|
| `create` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR, KITCHEN_CHIEF |
| `submit` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR, KITCHEN_CHIEF |
| `post` | ADMIN, INV_MGR |
| `cancel` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR, KITCHEN_CHIEF |
| `view` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR, APPROVER, KITCHEN_CHIEF, PROC_OFFICER, AUDITOR, GM, VIEWER |
| `export` | ADMIN, INV_MGR, STORE_MGR, AUDITOR, GM |

### Document Type: Stocktake

| Action | Allowed Roles |
|--------|--------------|
| `create` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR |
| `start` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR |
| `count` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR |
| `review` | ADMIN, INV_MGR, STORE_MGR |
| `approve` | ADMIN, APPROVER, INV_MGR, STORE_MGR |
| `reject` | ADMIN, APPROVER, INV_MGR, STORE_MGR |
| `post` | ADMIN, INV_MGR |
| `close` | ADMIN, INV_MGR |
| `view` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR, APPROVER, KITCHEN_CHIEF, PROC_OFFICER, AUDITOR, GM, VIEWER |
| `export` | ADMIN, INV_MGR, STORE_MGR, AUDITOR, GM |

### Document Type: Kitchen Request

| Action | Allowed Roles |
|--------|--------------|
| `create` | ADMIN, KITCHEN_CHIEF, INV_MGR, STORE_MGR |
| `submit` | ADMIN, KITCHEN_CHIEF, INV_MGR, STORE_MGR |
| `fulfill` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR, KITCHEN_CHIEF |
| `cancel` | ADMIN, KITCHEN_CHIEF, INV_MGR, STORE_MGR |
| `view` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR, APPROVER, KITCHEN_CHIEF, PROC_OFFICER, AUDITOR, GM, VIEWER |

### Document Type: Purchase Requisition (PR)

| Action | Allowed Roles |
|--------|--------------|
| `create` | ADMIN, PROC_OFFICER, INV_MGR, STORE_MGR |
| `submit` | ADMIN, PROC_OFFICER, INV_MGR, STORE_MGR |
| `approve` | ADMIN, APPROVER, INV_MGR, STORE_MGR |
| `reject` | ADMIN, APPROVER, INV_MGR, STORE_MGR |
| `cancel` | ADMIN, PROC_OFFICER, INV_MGR, STORE_MGR |
| `view` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR, APPROVER, KITCHEN_CHIEF, PROC_OFFICER, AUDITOR, GM, VIEWER |

### Document Type: Purchase Order (PO)

| Action | Allowed Roles |
|--------|--------------|
| `create` | ADMIN, PROC_OFFICER, INV_MGR |
| `submit` | ADMIN, PROC_OFFICER, INV_MGR |
| `approve` | ADMIN, APPROVER, INV_MGR, STORE_MGR |
| `reject` | ADMIN, APPROVER, INV_MGR, STORE_MGR |
| `cancel` | ADMIN, PROC_OFFICER, INV_MGR |
| `view` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR, APPROVER, KITCHEN_CHIEF, PROC_OFFICER, AUDITOR, GM, VIEWER |

### Document Type: Goods Received Note (GRN)

| Action | Allowed Roles |
|--------|--------------|
| `create` | ADMIN, WH_KEEPER, INV_MGR, STORE_MGR |
| `post` | ADMIN, INV_MGR |
| `cancel` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR |
| `view` | ADMIN, INV_MGR, WH_KEEPER, STORE_MGR, APPROVER, KITCHEN_CHIEF, PROC_OFFICER, AUDITOR, GM, VIEWER |
| `export` | ADMIN, INV_MGR, STORE_MGR, AUDITOR, GM |

### TypeScript Contract Shape

```typescript
type DocumentType = 'adjustment' | 'transfer' | 'issue' | 'stocktake' | 'kitchen_request' | 'pr' | 'po' | 'grn';

type DocumentAction = 'create' | 'submit' | 'approve' | 'reject' | 'post' | 'cancel' | 'edit'
  | 'view' | 'export' | 'ship' | 'receive' | 'start' | 'count' | 'review' | 'close' | 'fulfill';

type Role = 'ADMIN' | 'INV_MGR' | 'WH_KEEPER' | 'STORE_MGR' | 'APPROVER'
  | 'KITCHEN_CHIEF' | 'PROC_OFFICER' | 'AUDITOR' | 'GM' | 'VIEWER';

const ROLE_CAPABILITIES: Record<DocumentType, Partial<Record<DocumentAction, readonly Role[]>>> = {
  adjustment: {
    create: ['ADMIN', 'INV_MGR', 'WH_KEEPER', 'STORE_MGR'],
    // ...
  },
  // ...
} as const;
```

---

## Operational Config Contract

Environment-based configuration consumed by the frontend (P3-03).

```typescript
// contracts/operational-config.ts
export const OPERATIONAL_CONFIG = {
  /** Days after shipping before an in-transit transfer is flagged as overdue */
  TRANSFER_OVERDUE_DAYS: Number(process.env.NEXT_PUBLIC_TRANSFER_OVERDUE_DAYS) || 3,
} as const;
```

**Environment Variable**: `NEXT_PUBLIC_TRANSFER_OVERDUE_DAYS`
**Type**: Positive integer
**Default**: `3`
**Fallback**: On `NaN`, `Infinity`, negative, or zero → default to `3`
**Scope**: Read at build time; requires application restart to take effect
