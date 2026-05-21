# Data Model: Phase 2 — Core Workflow Fixes

**Date**: 2026-05-21  
**Feature**: [spec.md](./spec.md)

No new database entities. This phase modifies validation logic, display patterns, and workflow rules on existing entities.

---

## Entity: Transfer

Stock movement between warehouses. Added search capability.

| Field | Type | Description | Phase 2 Relevance |
|-------|------|-------------|-------------------|
| `document_number` | string | Human-readable transfer number | P2-01: Searchable by partial match |
| `source_warehouse_id` | string | Origin warehouse | P2-01: Searchable by warehouse name; P2-02: Name displayed from entity |
| `destination_warehouse_id` | string | Target warehouse | P2-01: Searchable; P2-02: Name from entity |
| `status` | TransferStatus | Workflow state | |
| `created_at` | string (ISO) | Creation timestamp | |

---

## Entity: Warehouse

Physical storage location. Names now sourced from entity data instead of translation keys.

| Field | Type | Description | Phase 2 Relevance |
|-------|------|-------------|-------------------|
| `id` | string | Unique identifier | P2-02: Key in lookup map |
| `name_en` | string | English display name | P2-02: Displayed when locale is 'en' |
| `name_ar` | string | Arabic display name | P2-02: Displayed when locale is 'ar' |
| `type` | 'main' \| 'dry' \| 'cold' \| 'virtual' \| 'transit' | Storage type | |
| `branch_id` | string | Parent branch | |
| `is_active` | boolean | Operational status | |

**Display contract (P2-02)**:
```
For each list screen (transfers, adjustments, stocktakes):
  Build warehouseMap: Map<id, { name_en, name_ar }> from useWarehouses()
  Cell renderer: warehouseMap.get(id)?.[locale === 'ar' ? 'name_ar' : 'name_en'] ?? id
```

---

## Entity: Adjustment — REJECTED State Transition

New workflow transition added.

| Transition | From | Action | To | Allowed Roles |
|-----------|------|--------|----|---------------|
| **NEW** | REJECTED | EDIT | DRAFT | ADMIN, INV_MGR, WH_KEEPER |

**Pre-condition**: Document status is REJECTED  
**Post-condition**: Status resets to DRAFT; rejection reason is displayed; user can edit and resubmit

---

## Entity: Stocktake Session — Audit Trail

Audit log array added to session data.

| Field | Type | Description | Phase 2 Relevance |
|-------|------|-------------|-------------------|
| `audit_log` | AuditEntry[] | Chronological status transitions | P2-04: Mapped to timeline display |
| `audit_log[].status` | string | Status at this point (e.g., "counted") | |
| `audit_log[].created_at` | string (ISO) | When transition occurred | Maps to timeline `at` |
| `audit_log[].user_name` | string \| null | Who performed the transition | Maps to timeline `by` |
| `audit_log[].comment` | string \| null | Optional note | |

**Timeline mapping (P2-04)**:
```
For each entry in session.audit_log:
  timeline.push({ status: entry.status, at: entry.created_at, by: entry.user_name || 'System' })
If audit_log is empty/absent:
  timeline = [{ status: 'draft', at: session.created_at, by: session.created_by }]
```

---

## Entity: GRN Lot

Received goods batch with expiry date. New validation rule added.

| Field | Type | Description | Phase 2 Relevance |
|-------|------|-------------|-------------------|
| `expiry_date` | string (ISO date) | Lot expiration date | P2-05: Must be today or in the future |

**Validation rule (P2-05)**:
```
isExpiryInPast = new Date(expiry_date) < new Date(new Date().toDateString())
  → WH_KEEPER: BLOCK with error "Expiry date cannot be in the past"
  → INV_MGR / ADMIN: WARN with override reason required
  → Today's date: ALLOW (not considered past)
```

---

## Entity: Workflow Transition Rule — Role Expansions

Roles added to existing transition rules.

### KITCHEN_CHIEF additions

| Document | Status | Action | Added Role |
|----------|--------|--------|------------|
| KITCHEN_REQUEST | DRAFT | SUBMIT | KITCHEN_CHIEF |
| KITCHEN_REQUEST | DRAFT | CANCEL | KITCHEN_CHIEF |
| KITCHEN_REQUEST | SUBMITTED | FULFILL | KITCHEN_CHIEF |
| KITCHEN_REQUEST | SUBMITTED | CANCEL | KITCHEN_CHIEF |

### STORE_MGR additions

| Document | Status | Action | Added Role | Notes |
|----------|--------|--------|------------|-------|
| ADJUSTMENT | DRAFT | SUBMIT | STORE_MGR | Same as WH_KEEPER |
| ADJUSTMENT | DRAFT | CANCEL | STORE_MGR | Same as WH_KEEPER |
| ADJUSTMENT | SUBMITTED | APPROVE | STORE_MGR | Within store scope |
| TRANSFER | DRAFT | SUBMIT | STORE_MGR | Same as WH_KEEPER |
| TRANSFER | DRAFT | CANCEL | STORE_MGR | Same as WH_KEEPER |
| STOCKTAKE | DRAFT | START | STORE_MGR | Same as WH_KEEPER |
| GRN | DRAFT | SUBMIT | STORE_MGR | Same as WH_KEEPER |

---

## State Transitions

### ADJUSTMENT (updated)

```
DRAFT ──[SUBMIT]──→ SUBMITTED ──[APPROVE]──→ APPROVED ──[POST]──→ POSTED
  │                      │                       │
  └──[CANCEL]──→ CANCELLED                       ├──[REJECT]──→ REJECTED ──[EDIT]──→ DRAFT (NEW)
                                                  │
                                                  └──[CANCEL]──→ CANCELLED
```
