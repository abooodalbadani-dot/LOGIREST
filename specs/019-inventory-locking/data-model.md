# Data Model: Inventory Locking & Valuation

**Feature Branch**: `019-inventory-locking` | **Date**: 2026-05-23

This document specifies the PostgreSQL schemas, entity relationships, validation rules, and indexes supporting Phase 6 (Inventory Locking, FEFO/FIFO Allocation, and WAC Recalculation).

---

## 1. Schema Definitions & Prisma Models

The database models are defined in the schema under [schema.prisma](file:///E:/Kitchen%E2%80%91Store%20Inventory%20System/apps/api/prisma/schema.prisma):

```prisma
model WarehouseItem {
  warehouseId  String
  itemId       String
  qtyOnHand    Decimal  @default(0) @db.Decimal(18, 4)
  qtyAllocated Decimal  @default(0) @db.Decimal(18, 4)
  wac          Decimal  @default(0) @db.Decimal(18, 4)
  updatedAt    DateTime @updatedAt

  warehouse Warehouse           @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  item      Item                @relation(fields: [itemId], references: [id], onDelete: Restrict)
  lots      WarehouseItemLot[]

  @@id([warehouseId, itemId])
  @@map("warehouse_items")
}

model WarehouseItemLot {
  warehouseId  String
  itemId       String
  lotId        String
  qtyOnHand    Decimal  @default(0) @db.Decimal(18, 4)
  qtyAllocated Decimal  @default(0) @db.Decimal(18, 4)
  updatedAt    DateTime @updatedAt

  warehouse     Warehouse     @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  item          Item          @relation(fields: [itemId], references: [id], onDelete: Restrict)
  lot           Lot           @relation(fields: [lotId], references: [id], onDelete: Restrict)
  warehouseItem WarehouseItem @relation(fields: [warehouseId, itemId], references: [warehouseId, itemId], onDelete: Cascade)

  @@id([warehouseId, itemId, lotId])
  @@index([warehouseId, itemId])
  @@map("warehouse_item_lots")
}

model Lot {
  id           String     @id @default(uuid())
  itemId       String
  lotNumber    String     @unique
  receivedDate DateTime   @default(now())
  expiryDate   DateTime?
  status       LotStatus  @default(ACTIVE)
  createdAt    DateTime   @default(now())

  item              Item              @relation(fields: [itemId], references: [id], onDelete: Restrict)
  grnLines          GRNLine[]
  lotAllocations    LotAllocation[]
  adjustmentLines   AdjustmentLine[]
  warehouseItemLots WarehouseItemLot[]
  stockLedgers      StockLedger[]
  stocktakeCounts   StocktakeCount[]
  stocktakeSnapshots StocktakeSnapshot[]

  @@index([itemId, expiryDate(sort: Asc)])
  @@map("lots")
}

model StockLedger {
  id             String       @id @default(uuid())
  postedAt       DateTime     @default(now())
  warehouseId    String
  itemId         String
  lotId          String?
  quantity       Decimal      @db.Decimal(18, 4)
  documentId     String
  documentType   DocumentType
  idempotencyKey String?      @unique

  warehouse Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  item      Item      @relation(fields: [itemId], references: [id], onDelete: Restrict)
  lot       Lot?      @relation(fields: [lotId], references: [id], onDelete: Restrict)

  @@index([warehouseId, itemId, postedAt(sort: Desc)])
  @@map("stock_ledger")
}

model CostLedger {
  id             String       @id @default(uuid())
  postedAt       DateTime     @default(now())
  warehouseId    String
  itemId         String
  quantity       Decimal      @db.Decimal(18, 4)
  unitPrice      Decimal      @db.Decimal(18, 4)
  newWac         Decimal      @db.Decimal(18, 4)
  documentId     String
  documentType   DocumentType
  idempotencyKey String?      @unique

  warehouse Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  item      Item      @relation(fields: [itemId], references: [id], onDelete: Restrict)

  @@index([warehouseId, itemId, postedAt(sort: Desc)])
  @@map("cost_ledger")
}
```

---

## 2. Invariants & Business Validation Rules

### Uniqueness & Key Constraints
- **WarehouseItem**: Composite primary key `[warehouseId, itemId]` guarantees only one global balance record exists for an item in a specific warehouse.
- **WarehouseItemLot**: Composite primary key `[warehouseId, itemId, lotId]` guarantees only one lot-specific balance record exists in a warehouse.
- **Lot**: `lotNumber` MUST be globally unique.
- **StockLedger / CostLedger**: `idempotencyKey` is marked `@unique` to prevent duplicate transaction postings from inserting redundant ledger rows.

### Balance Integrity (No Negative Stock)
- Before executing any stock reduction, the system must assert:
  $$\text{WarehouseItemLot.qtyOnHand} - \text{RequestedQty} \ge 0$$
- If the calculation results in a negative value, the transaction MUST abort with an `UnprocessableEntityException` (422) and trigger a full database rollback.

### Expiry Filtering
- Any query fetching lots for FEFO allocation MUST apply a filter:
  $$\text{Lot.expiryDate} \ge \text{CURRENT\_TIMESTAMP}$$
- Expired lots cannot be automatically selected for allocations.

---

## 3. Database Indexes

- **FEFO Sort Speed**:
  - `@@index([itemId, expiryDate(sort: Asc)])` on the `Lot` table. This allows the allocation query to quickly locate and sort non-expired lots for a specific item.
- **Ledger Audits**:
  - `@@index([warehouseId, itemId, postedAt(sort: Desc)])` on both `StockLedger` and `CostLedger` to speed up paginated inventory history queries.
