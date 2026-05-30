# Database Schema & Data Models: LogiRest Risk Remediation

This document defines the schema models, relationships, and index specifications required for the database layer of the risk remediation tasks.

---

## 1. Prisma Model Additions

### PasswordResetToken (TASK-002)
Used to track single-use secure password reset flows.
```prisma
model PasswordResetToken {
  id          String    @id @default(uuid())
  userId      String    @map("user_id")
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash   String    @unique @map("token_hash")
  expiresAt   DateTime  @map("expires_at")
  usedAt      DateTime? @map("used_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@map("password_reset_tokens")
  @@index([userId])
  @@index([expiresAt])
}
```

### YieldBatch (TASK-004)
Replaces volatile in-memory operation logs with persistent database records.
```prisma
model YieldBatch {
  id            String     @id @default(uuid())
  recipeName    String     @map("recipe_name")
  category      String
  warehouseId   String?    @map("warehouse_id")
  warehouse     Warehouse? @relation(fields: [warehouseId], references: [id])
  inputQty      Float      @map("input_qty")
  outputQty     Float      @map("output_qty")
  wasteQty      Float      @map("waste_qty")
  yieldPct      Float      @map("yield_pct")
  standardYield Float      @map("standard_yield")
  efficiency    Float
  createdAt     DateTime   @default(now()) @map("created_at")

  @@map("yield_batches")
  @@index([warehouseId])
}
```

---

## 2. Model Extensions

### User (TASK-007)
Extended to support failed login lockout parameters.
```prisma
model User {
  // Existing fields...
  failedLoginAttempts  Int                  @default(0) @map("failed_login_attempts")
  lockedUntil          DateTime?            @map("locked_until")
  passwordResetTokens  PasswordResetToken[]
}
```

### KitchenRequest (TASK-003)
Extended to link kitchen requisitions directly to inventory deductions.
```prisma
model KitchenRequest {
  // Existing fields...
  issueId        String?         @unique @map("issue_id")
  inventoryIssue InventoryIssue? @relation(fields: [issueId], references: [id])
}
```

---

## 3. Database Indexes (TASK-013, TASK-016)

The following indices are added to Prisma schema to eliminate full-table scans during high-frequency API operations and nightly reconciliation audits:

* **`GoodsReceivedNote`**:
  ```prisma
  @@index([status])
  ```
* **`StockLedger`**:
  ```prisma
  @@index([documentId])
  ```
* **`CostLedger`**:
  ```prisma
  @@index([documentId])
  @@index([documentId, documentType])
  ```
* **`WarehouseLock`**:
  ```prisma
  @@index([warehouseId, isActive])
  ```

---

## 4. Raw SQL Database Check Constraints (TASK-011)

To protect physical stock from application-level calculation bugs that produce impossible inventories, raw SQL check constraints are executed in migrations:

```sql
-- Enforce non-negative inventory balances on physical items
ALTER TABLE warehouse_items ADD CONSTRAINT chk_qty_on_hand_non_negative CHECK (qty_on_hand >= 0);

-- Enforce non-negative inventory balances on specific lots
ALTER TABLE warehouse_item_lots ADD CONSTRAINT chk_lot_qty_on_hand_non_negative CHECK (qty_on_hand >= 0);

-- Enforce non-negative fulfilled request quantities
ALTER TABLE kitchen_request_items ADD CONSTRAINT chk_quantity_fulfilled_non_negative CHECK (quantity_fulfilled >= 0);
```
