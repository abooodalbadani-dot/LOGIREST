# Data Model: Inventory Transactions (Phase 7)

This document describes the data structures, relationships, and validation rules for inventory ledger models.

## 1. Schema Definition

Refer to the primary Prisma schema in `apps/api/prisma/schema.prisma`. The key models involved are:

### StockLedger (T5: Immutable Ledger)
Tracks every individual inventory movement. Append-only.
- `id` (UUID, Primary Key)
- `transactionType` (String: `GRN_IN`, `ISSUE_OUT`, `TRANSFER_OUT`, `TRANSFER_IN`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `STOCKTAKE_ADJ`)
- `documentType` (Enum: `PR`, `PO`, `GRN`, `ISSUE`, `TRANSFER`, `ADJUSTMENT`, `STOCKTAKE`, `KITCHEN_REQUEST`)
- `documentId` (String, links to source document)
- `documentLineId` (String, links to source document line item)
- `warehouseId` (String, FK to Warehouse)
- `itemId` (String, FK to Item)
- `lotId` (String, optional, FK to Lot)
- `qtyChange` (Decimal, negative for stock reductions)
- `resultingQtyOnHand` (Decimal)
- `unitCost` (Decimal)
- `totalCost` (Decimal)
- `postedByUserId` (String, FK to User)
- `postedAt` (DateTime, default: now)
- `idempotencyKey` (String, optional, unique)

### CostLedger (T5: Immutable Cost History)
Logs WAC recalculations. Append-only.
- `id` (UUID, Primary Key)
- `itemId` (String)
- `warehouseId` (String)
- `oldWac` (Decimal)
- `newWac` (Decimal)
- `triggerType` (String: `GRN_POST`, `ADJUSTMENT_POST`)
- `triggerId` (String, ID of source document)
- `recordedAt` (DateTime, default: now)

### WarehouseItem (T3: Live Item Balance)
- `warehouseId` (String)
- `itemId` (String)
- `onHandQty` (Decimal)
- `reservedQty` (Decimal)
- `weightedAvgCost` (Decimal)
- `lastUpdatedAt` (DateTime)
- *Composite PK*: `[warehouseId, itemId]`

### WarehouseItemLot (T3: Live Lot Balance)
- `warehouseId` (String)
- `itemId` (String)
- `lotId` (String)
- `onHandQty` (Decimal)
- `reservedQty` (Decimal)
- `expiryDate` (DateTime, optional)
- `receivedDate` (DateTime)
- *Composite PK*: `[warehouseId, itemId, lotId]`

---

## 2. Validation & Invariants

### 2.1 Negative Stock Check
- Enforced inside `prisma.$transaction` after locking row(s).
- **Condition**: `currentQty - deductQty < 0`
- **Scope**:
  - For batched items: `WarehouseItemLot.onHandQty` MUST remain `>= 0`.
  - For all items: `WarehouseItem.onHandQty` MUST remain `>= 0`.
- **Failure**: Throw `422 Unprocessable Entity` ("Insufficient stock").

### 2.2 Warehouse Lock Guard
- Before writing any stock change to `WarehouseItem` or `WarehouseItemLot` in warehouse `W`:
- Query `WarehouseLock` where `warehouseId = W AND isActive = true`.
- If lock exists (whether active or expired/stale):
  - Block the transaction.
  - Throw `423 Locked`.
  - Stale locks (created > 72 hours ago) MUST continue to block and require a manual Admin unlock.
