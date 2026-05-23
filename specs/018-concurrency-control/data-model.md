# Data Model: Concurrency Control (Phase 5)

This document describes the database schemas and fields utilized by the concurrency control and locking mechanisms.

---

## 1. IdempotencyLog Entity

The `idempotency_logs` table stores API request headers and cached response payloads.

### Schema Definitions (Prisma)
```prisma
model IdempotencyLog {
  key          String   @id
  responseBody String
  statusCode   Int
  createdAt    DateTime @default(now())

  @@map("idempotency_logs")
}
```

### Table Properties
* **Key (`key`)**: `String`, Primary Key. The client-provided UUID v4 idempotency key.
* **ResponseBody (`responseBody`)**: `String` (Text). The JSON-stringified response payload returned by the successfully executed controller handler.
* **StatusCode (`statusCode`)**: `Int`. The HTTP status code (e.g. 200, 201) returned by the handler. A code of `102` denotes that the operation is currently "Processing".
* **CreatedAt (`createdAt`)**: `DateTime`. Default `now()`. Used to compute TTL expiration (24-hour cutoff).

---

## 2. WarehouseLock Entity

The `warehouse_locks` table stores operational lock snapshots configured on individual warehouses.

### Schema Definitions (Prisma)
```prisma
model WarehouseLock {
  id          String   @id @default(uuid())
  warehouseId String
  lockType    LockType
  lockedById  String
  expiresAt   DateTime
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  warehouse Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  lockedBy  User      @relation(fields: [lockedById], references: [id], onDelete: Restrict)

  @@map("warehouse_locks")
}

enum LockType {
  STOCKTAKE
  MANUAL
}
```

### Table Properties
* **ID (`id`)**: `String` (UUID v4), Primary Key.
* **Warehouse ID (`warehouseId`)**: `String` (UUID v4), Foreign Key. Links to the `warehouses` table.
* **Lock Type (`lockType`)**: `LockType` Enum (`STOCKTAKE` or `MANUAL`).
* **Locked By User ID (`lockedById`)**: `String` (UUID v4), Foreign Key. Links to the `users` table.
* **Expires At (`expiresAt`)**: `DateTime`. The timestamp when the lock is scheduled to expire.
* **Is Active (`isActive`)**: `Boolean`. Default `true`. If `true`, the warehouse is locked (even if `expiresAt` is in the past, indicating a stale state).
* **Created At (`createdAt`)**: `DateTime`. Default `now()`.

---

## 3. AuditLog Entity

The `audit_logs` table store immutable tracking entries for high-severity administrative overrides.

### Schema Definitions (Prisma)
```prisma
model AuditLog {
  id              String   @id @default(uuid())
  userId          String
  action          String
  targetTable     String
  targetId        String
  beforeStateJson String
  afterStateJson  String
  ipAddress       String?
  createdAt       DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@map("audit_logs")
}
```

### Table Properties
* **ID (`id`)**: `String` (UUID v4), Primary Key.
* **User ID (`userId`)**: `String` (UUID v4), Foreign Key. ID of the administrator executing the override.
* **Action (`action`)**: `String` (e.g., `FORCE_UNLOCK`).
* **Target Table (`targetTable`)**: `String` (e.g., `warehouse_locks`).
* **Target ID (`targetId`)**: `String` (UUID v4). ID of the modified lock.
* **Before State (`beforeStateJson`)**: `String` (JSON). State of the lock before deactivation.
* **After State (`afterStateJson`)**: `String` (JSON). Includes override reason notes.
* **IP Address (`ipAddress`)**: `String` (Optional). Request origin IP.
