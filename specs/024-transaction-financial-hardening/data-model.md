# Database Schema Design: Phase 2 Hardening

This document outlines the database schema updates required to support sequential document numbering and item-level freezing on drift detection.

---

## 1. Schema Changes (`schema.prisma`)

### 1.1 `DocumentSequence` Model [NEW]
This model tracks the current sequence index for each document type, calendar year, and branch location.

```prisma
model DocumentSequence {
  id              String       @id @default(uuid())
  branchId        String       @map("branch_id")
  documentType    DocumentType @map("document_type")
  year            Int
  currentSequence Int          @default(0) @map("current_sequence")
  prefix          String
  createdAt       DateTime     @default(now()) @map("created_at")
  updatedAt       DateTime     @updatedAt @map("updated_at")

  branch          Branch       @relation(fields: [branchId], references: [id], onDelete: Restrict)

  @@unique([documentType, year, branchId])
  @@map("document_sequences")
}
```

### 1.2 `Branch` Model [MODIFY]
Add relation back to the new `DocumentSequence` model.

```prisma
model Branch {
  // ... existing fields ...
  documentSequences DocumentSequence[]
}
```

### 1.3 `WarehouseItem` Model [MODIFY]
Add `isFrozen` boolean flag to support SKU-level locking.

```prisma
model WarehouseItem {
  warehouseId  String
  itemId       String
  qtyOnHand    Decimal  @default(0) @db.Decimal(18, 4)
  qtyAllocated Decimal  @default(0) @db.Decimal(18, 4)
  wac          Decimal  @default(0) @db.Decimal(18, 4)
  isFrozen     Boolean  @default(false) @map("is_frozen") // [NEW]
  updatedAt    DateTime @updatedAt

  warehouse Warehouse           @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  item      Item                @relation(fields: [itemId], references: [id], onDelete: Restrict)
  lots      WarehouseItemLot[]

  @@id([warehouseId, itemId])
  @@map("warehouse_items")
}
```

---

## 2. Validation & Business Rules

### 2.1 Unique Compound Key Constraint
A compound unique constraint `@@unique([documentType, year, branchId])` on the `DocumentSequence` table prevents duplicate sequences for the same document type, year, and branch.

### 2.2 SKU Lock Validation (`isFrozen`)
Before executing any transaction that mutates inventory (GRN post, stock adjustments, stock transfers, issues), the application must verify the `isFrozen` status of the `WarehouseItem` row:
- If `isFrozen` is `true`, reject the request with `423 LOCKED` or `400 BAD REQUEST` error.
