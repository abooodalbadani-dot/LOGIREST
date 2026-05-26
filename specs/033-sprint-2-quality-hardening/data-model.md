# Data Model & Schema Design: Sprint 2 Quality Hardening

This document outlines the database and data model definitions required for the Sprint 2 quality hardening tasks.

## 1. AuditLog Schema Integration

The system uses a shared `AuditLog` model to track immutable actions. The schema is defined in Prisma as:

```prisma
model AuditLog {
  id              String   @id @default(uuid())
  userId          String?  // Made optional to support logging for non-existent users
  action          String   // Action types: "LOGIN_FAILED", "UNFREEZE_ITEM", etc.
  targetTable     String   // Target entity table (e.g., "users", "warehouse_items")
  targetId        String   // Unique key or details of the target (e.g., username, sku)
  beforeStateJson String?  // Snapshot before operation
  afterStateJson  String?  // Snapshot after operation (e.g., failed reason details)
  ipAddress       String?  // Authenticated/requested client IP address
  createdAt       DateTime @default(now())

  @@map("audit_logs")
}
```

### Unsuccessful Login Integration
- When a login attempt fails, a new record is created in `audit_logs`.
- **Fields**:
  - `action`: `'LOGIN_FAILED'`
  - `targetTable`: `'users'`
  - `targetId`: Captured email address attempted
  - `userId`: Resolved matching user ID (if email exists in DB), otherwise `null`
  - `afterStateJson`: JSON payload containing `{ reason: 'INVALID_CREDENTIALS', email }` or `{ reason: 'INACTIVE_USER', email }`
  - `ipAddress`: Requesting IP address

---

## 2. OutboxEvent State Enforcement

The system uses an asynchronous `outbox_events` ledger for guaranteed delivery. This sprint adds a PostgreSQL check constraint on the status.

### Prisma Definition

```prisma
enum OutboxStatus {
  PENDING
  SUCCEEDED
  FAILED
}

model OutboxEvent {
  id         String       @id @default(uuid())
  eventType  String
  payload    String
  status     OutboxStatus @default(PENDING) // Database CHECK constraint applied here
  attempts   Int          @default(0)
  lastError  String?
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  @@map("outbox_events")
}
```

### Database CHECK Constraint
A native database check constraint is applied via raw SQL:

```sql
ALTER TABLE "outbox_events"
  ADD CONSTRAINT "chk_outbox_events_status_valid"
  CHECK ("status" IN ('PENDING', 'SUCCEEDED', 'FAILED'));
```

---

## 3. WarehouseItem Frozen State

To handle reconciliation discrepancies, warehouse items can be frozen. The admin dashboard manages items matching `isFrozen = true`.

### Prisma Definition

```prisma
model WarehouseItem {
  warehouseId String
  itemId      String
  qtyOnHand   Decimal @db.Decimal(12, 4)
  qtyAllocated Decimal @db.Decimal(12, 4)
  isFrozen    Boolean @default(false) // Filtered by frozen-items dashboard
  
  // Relations and indexes...
  @@id([warehouseId, itemId])
  @@map("warehouse_items")
}
```
