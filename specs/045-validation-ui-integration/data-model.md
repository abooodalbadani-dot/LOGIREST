# Data Model Design: Sprint 2: Automated Validation & UI Integration

This document defines the schema enhancements, validation constraints, and entity state lifecycles for Phase 1.

---

## 1. Schema Enhancements (Prisma Schema)

We will introduce a quarantine flag `isFrozen` on the `WarehouseItem` entity.

### Entity: `WarehouseItem`
Enhance the existing `WarehouseItem` model in the database schema:

```prisma
model WarehouseItem {
  id           String      @id @default(uuid())
  itemId       String      @map("item_id")
  warehouseId  String      @map("warehouse_id")
  qtyOnHand    Decimal     @db.Decimal(12, 4) @map("qty_on_hand")
  qtyAllocated Decimal     @db.Decimal(12, 4) @map("qty_allocated")
  isFrozen     Boolean     @default(false) @map("is_frozen") // [NEW] Quarantine flag
  createdAt    DateTime    @default(now()) @map("created_at")
  updatedAt    DateTime    @updatedAt @map("updated_at")

  // Relationships
  item         Item        @relation(fields: [itemId], references: [id])
  warehouse    Warehouse   @relation(fields: [warehouseId], references: [id])
  lots         WarehouseItemLot[]

  @@unique([itemId, warehouseId], name: "item_warehouse_unique")
  @@map("warehouse_items")
}
```

---

## 2. Invariant Validation Equations

The validation engine executes raw SQL checks to enforce three physical mathematical equations:

### Equation 1: Item Ledger Parity
For a given `itemId` and `warehouseId`:
$$\text{WarehouseItem.qtyOnHand} = \sum \text{StockLedger.quantity}$$
- *SQL Check*:
  ```sql
  SELECT wi.item_id, wi.warehouse_id, wi.qty_on_hand, SUM(sl.quantity) as ledger_sum
  FROM warehouse_items wi
  LEFT JOIN stock_ledger sl ON wi.item_id = sl.item_id AND wi.warehouse_id = sl.warehouse_id
  GROUP BY wi.item_id, wi.warehouse_id, wi.qty_on_hand
  HAVING wi.qty_on_hand != COALESCE(SUM(sl.quantity), 0);
  ```

### Equation 2: Lot Ledger Parity
For a given `lotId`, `itemId`, and `warehouseId`:
$$\text{WarehouseItemLot.qtyOnHand} = \sum \text{StockLedger.quantity}$$
- *SQL Check*:
  ```sql
  SELECT wil.lot_id, wil.item_id, wil.warehouse_id, wil.qty_on_hand, SUM(sl.quantity) as ledger_sum
  FROM warehouse_item_lots wil
  LEFT JOIN stock_ledger sl ON wil.lot_id = sl.lot_id AND wil.item_id = sl.item_id AND wil.warehouse_id = sl.warehouse_id
  GROUP BY wil.lot_id, wil.item_id, wil.warehouse_id, wil.qty_on_hand
  HAVING wil.qty_on_hand != COALESCE(SUM(sl.quantity), 0);
  ```

### Equation 3: Lot-to-Item Aggregation Parity
For a given `itemId` and `warehouseId`:
$$\text{WarehouseItem.qtyOnHand} = \sum \text{WarehouseItemLot.qtyOnHand}$$
- *SQL Check*:
  ```sql
  SELECT wi.item_id, wi.warehouse_id, wi.qty_on_hand, SUM(wil.qty_on_hand) as lot_sum
  FROM warehouse_items wi
  LEFT JOIN warehouse_item_lots wil ON wi.item_id = wil.item_id AND wi.warehouse_id = wil.warehouse_id
  GROUP BY wi.item_id, wi.warehouse_id, wi.qty_on_hand
  HAVING wi.qty_on_hand != COALESCE(SUM(wil.qty_on_hand), 0);
  ```

---

## 3. Workflow State Transitions

Unified status transitions mapped in `packages/shared-types`:

### Entity: `StockTransfer`
Updates the transition map to allow receipt.
```
DRAFT ──(Ship)──> IN_TRANSIT ──(Confirm Receipt)──> RECEIVED
```
- **Transition Check**:
  - Allowed from status: `IN_TRANSIT`
  - Target status: `RECEIVED`
  - Permitted Roles: `WH_KEEPER`, `INV_MGR`, `ADMIN` (scoped to destination warehouse)

### Entity: `InventoryIssue`
Enforces post transition from draft.
```
DRAFT ──(Submit)──> POSTED ──(Void)──> VOIDED
```
- **Transition Check**:
  - Allowed from status: `DRAFT`
  - Target status: `POSTED`
  - Permitted Roles: `WH_KEEPER`, `INV_MGR`, `ADMIN` (scoped to issuing warehouse)
