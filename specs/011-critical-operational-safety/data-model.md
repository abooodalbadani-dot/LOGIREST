# Data Model: Phase 1 — Critical Operational Safety

**Date**: 2026-05-21  
**Feature**: [spec.md](./spec.md)

This phase does not introduce new database entities or schema changes. It modifies validation logic and operation sequencing on existing entities. The entities below document the current state relevant to this phase's changes.

---

## Entity: Adjustment Line

Represents a single row within an inventory adjustment document.

| Field | Type | Description | Phase 1 Relevance |
|-------|------|-------------|-------------------|
| `id` | string (UUID) | Unique line identifier | |
| `direction` | `'INCREASE'` \| `'DECREASE'` | Whether stock is added or removed | P1-01: Only DECREASE lines can produce negative stock |
| `qty_before` | number | Stock on hand before this adjustment (fetched from `/inventory/balance`) | P1-01: Compared against `qty_adjusted` to detect negative stock. Defaults to 0 if null. |
| `qty_adjusted` | number | The quantity delta (positive value for both directions) | P1-01: If `qty_adjusted > qty_before` on a DECREASE line, the adjustment is blocked |
| `qty_after` | number (derived) | Computed: `direction === 'INCREASE' ? qty_before + qty_adjusted : qty_before - qty_adjusted` | P1-01: Must be >= 0 for all DECREASE lines |
| `item.code` | string | Item/barcode identifier | |
| `item.name` | string | Display name | |

**Validation rule (new, P1-01)**:
```
∀ line ∈ lines: line.direction === 'DECREASE' ⟹ line.qty_adjusted ≤ (line.qty_before ?? 0)
```

---

## Entity: Adjustment Document

Represents a complete inventory adjustment (header + lines).

| Field | Type | Description | Phase 1 Relevance |
|-------|------|-------------|-------------------|
| `id` | string (UUID) | Unique document identifier | P1-02: Used to pre-fetch version before batch actions |
| `version` | number | Optimistic concurrency token; increments on every modification | P1-02: Must be sent with every mutation; batch operations must pre-fetch current versions |
| `status` | `DRAFT` \| `SUBMITTED` \| `APPROVED` \| `POSTED` \| `REJECTED` \| `CANCELLED` | Workflow lifecycle state | P1-03: Only SUBMITTED adjustments are eligible for batch APPROVE; only APPROVED are eligible for POST |
| `lines` | AdjustmentLine[] | Line items in the adjustment | P1-01: Validated for negative stock |
| `warehouse_id` | string | Target warehouse | |
| `created_at` | string (ISO datetime) | Creation timestamp | |
| `created_by` | string | User who created the document | |

**Batch operation contract (modified, P1-02 + P1-03)**:
```
Pre-condition: ∀ id ∈ selectedIds: document.status is eligible for the requested action
Pre-condition: version is pre-fetched immediately before each mutation call
Post-condition: Each mutation sends the correct document version
Post-condition: 409 (version conflict) on any item → skip + report in failure summary
```

---

## Entity: User Session

Represents the authenticated user context validated by the server.

| Field | Type | Description | Phase 1 Relevance |
|-------|------|-------------|-------------------|
| `id` | string (UUID) | User identifier | |
| `name` | string | Display name | P1-04: Returned by `/auth/me`, used to update local state |
| `role` | `ADMIN` \| `INV_MGR` \| `WH_KEEPER` \| `APPROVER` \| `KITCHEN_CHIEF` | User's current role | P1-04: Must reflect server-side role changes immediately |
| `scopes` | Scope[] | Assigned warehouse/branch/department scopes | P1-04: Must reflect server-side scope changes immediately |
| `token` | string (JWT, HttpOnly cookie) | Session authentication token | P1-04: Validated via `GET /auth/me` on every mount |

**Session lifecycle (modified, P1-04)**:
```
On mount:
  1. Read token from HttpOnly cookie
  2. Decode JWT payload for preliminary user data
  3. Call GET /auth/me to validate session server-side (10s timeout)
     - 200: Update local state with server-returned user object → set isLoading(false)
     - 401: Clear local state, redirect to /login?reason=expired
     - Timeout/network error: Redirect to /login?reason=verification_failed
  4. isLoading remains true until step 3 resolves
```

---

## Entity: Workflow Transition Rule

Defines which actions are permitted from a given document status for each document type.

| Attribute | Type | Description | Phase 1 Relevance |
|-----------|------|-------------|-------------------|
| `documentType` | `'ADJUSTMENT'` \| `'PR'` \| `'PO'` \| ... | Type of operational document | P1-03: Batch filter applies to ADJUSTMENT type |
| `fromStatus` | DocumentStatus | Current status of the document | P1-03: Used to determine eligibility |
| `action` | `'SUBMIT'` \| `'APPROVE'` \| `'POST'` \| `'CANCEL'` \| `'REJECT'` \| `'EDIT'` | Requested workflow action | P1-03: 'APPROVE' and 'POST' for batch operations |
| `allowedRoles` | Role[] | Roles authorized to execute this action | P1-03: Must include user's current role |
| `targetStatus` | DocumentStatus | Status after the action completes | |

**Eligibility function**: `canPerformActionV2(documentType, status, action, role) → boolean`

---

## State Transitions (ADJUSTMENT)

```
DRAFT ──[SUBMIT]──→ SUBMITTED ──[APPROVE]──→ APPROVED ──[POST]──→ POSTED (terminal)
  │                      │                       │
  └──[CANCEL]──→ CANCELLED (terminal)            └──[REJECT]──→ REJECTED
                                                  │
                                                  └──[CANCEL]──→ CANCELLED
```

**Phase 1 constraint**: Batch APPROVE is only valid on SUBMITTED documents. Batch POST is only valid on APPROVED documents. DRAFT, POSTED, CANCELLED, and REJECTED documents are excluded from both batch actions.
