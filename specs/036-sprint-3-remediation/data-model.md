# Phase 1 Data Model: Sprint 3 Remediation and System Hardening

This document maps the entities, state transitions, and validation rules modified or verified in Sprint 3.

---

## 1. DocumentSequence (Modified)

Tracks document number sequences per branch, year, and type. Hardened with a composite database-level unique constraint to block duplicate sequence creations.

```prisma
model DocumentSequence {
  id           String       @id @default(uuid())
  documentType DocumentType
  year         Int
  branchId     String
  nextValue    Int          @default(1)
  version      Int          @default(1) // for optimistic lock

  @@unique([documentType, year, branchId])
  @@map("document_sequences")
}
```

### Uniqueness & Validation rules:
* Composite DB uniqueness constraint on `[documentType, year, branchId]`.
* Attempts to insert duplicate sequence configurations will throw a `P2002` exception at the database layer.

---

## 2. WarehouseItemLot (Verified)

Tracks the physical stock balances for a specific lot batch.

```prisma
model WarehouseItemLot {
  warehouseId String
  itemId      String
  lotId       String
  qtyOnHand   Decimal      @db.Decimal(18, 4)
  isFrozen    Boolean      @default(false)
  version     Int          @default(1)

  @@id([warehouseId, itemId, lotId])
  @@map("warehouse_item_lots")
}
```

### State transitions:
* **Frozen State**: When lot-level reconciliation drifts $> 0.001$, the `isFrozen` flag transitions to `true`. While `isFrozen` is `true`, no further ledger stock movements (IN/OUT) can be posted against this lot.

---

## 3. StockLedger (Reference)

```prisma
model StockLedger {
  id             String       @id @default(uuid())
  warehouseId    String
  itemId         String
  lotId          String
  quantity       Decimal      @db.Decimal(18, 4)
  documentType   DocumentType
  documentId     String
  postedAt       DateTime     @default(now())

  @@index([warehouseId, itemId, lotId])
  @@map("stock_ledger")
}
```

---

## 4. CostLedger (Reference)

Used to calculate and verify historical cost changes (WAC metrics).

```prisma
model CostLedger {
  id          String   @id @default(uuid())
  warehouseId String
  itemId      String
  newWac      Decimal  @db.Decimal(18, 4)
  postedAt    DateTime @default(now())

  @@index([warehouseId, itemId, postedAt(sort: Desc)])
  @@map("cost_ledger")
}
```
