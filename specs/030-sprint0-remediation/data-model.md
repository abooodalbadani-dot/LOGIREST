# Data Model: Sprint 0 Readiness Hardening

This document outlines the database modifications and constraint schema details required for Sprint 0.

## Database Constraints

### 1. Non-Negative Inventory Check Constraints (PostgreSQL Raw SQL)
Check constraints will be added directly to the inventory tables.

#### Table: `warehouse_items`
- **Constraint Name**: `chk_warehouse_items_qty_on_hand_nonneg`
  - **SQL**: `CHECK ("qty_on_hand" >= 0)`
- **Constraint Name**: `chk_warehouse_items_qty_allocated_nonneg`
  - **SQL**: `CHECK ("qty_allocated" >= 0)`

#### Table: `warehouse_item_lots`
- **Constraint Name**: `chk_warehouse_item_lots_qty_on_hand_nonneg`
  - **SQL**: `CHECK ("qty_on_hand" >= 0)`

### 2. Outbox Status Validation Check Constraints
Ensures the status field contains only valid state machine keys.

#### Table: `outbox_events`
- **Constraint Name**: `chk_outbox_events_status_valid`
  - **SQL**: `CHECK ("status" IN ('PENDING', 'SUCCEEDED', 'FAILED'))`

---

## State Machine Updates

All status enums for posted inventory transactions must support the `VOIDED` state:

### Affected Enums (Prisma Schema):
- `PurchaseOrderStatus`
- `GoodsReceivedNoteStatus`
- `InventoryIssueStatus`
- `TransferStatus`
- `AdjustmentStatus`
- `KitchenRequestStatus`

### Transition Definitions:
- `POSTED` → `VOIDED` (via `VOID` action, permitted only for roles: `ADMIN`, `INV_MGR`)
- `RECEIVED` → `VOIDED` (for Transfers, via `VOID` action, permitted only for roles: `ADMIN`, `INV_MGR`)
- `VOIDED` is a terminal state (no outgoing transitions allowed).

---

## Ledger Reversal Entries Shape

When voiding a document, offsetting ledger lines are appended with inverse values.

### `StockLedger` Reversal Entry:
- `qty`: `-OriginalQuantity`
- `transactionType`: `REVERSAL` or original type (e.g. `ISSUE`) with negative value.
- `documentId`: Reference to the voided document.

### `CostLedger` Reversal Entry:
- `value`: `-OriginalValue`
- `unitCost`: Original cost recorded.
- `documentId`: Reference to the voided document.
