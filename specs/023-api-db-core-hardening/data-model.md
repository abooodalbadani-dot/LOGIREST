# Database & State Schema: Database & API Core Hardening (Phase 1)

This document describes the schema corrections applied to align the active database with the prisma schema models.

## 1. Schema Modifications

The models `WarehouseLock` and `NotificationLog` are mapped in the database schema.

### WarehouseLock Model
We add columns and indices to support lock active states and expiration lookups.

*   `status`: enum `LockStatus` (values: `ACTIVE`, `STALE`, `RELEASED`, default: `ACTIVE`)
*   `isActive`: boolean (default: `true`)
*   Index: `@@index([isActive, expiresAt])` on table `warehouse_locks`

### NotificationLog Model
We create the `notification_logs` table to store transactional notifications and user status alerts.

*   `id`: UUID (Primary Key)
*   `targetRole`: enum `Role`
*   `warehouseId`: string (nullable)
*   `message`: string
*   `isRead`: boolean (default: `false`)
*   `createdAt`: DateTime (default: `now()`)
*   `documentType`: enum `DocumentType` (nullable)
*   `documentId`: string (nullable)
*   Index: `@@index([targetRole, isRead])`
*   Index: `@@index([warehouseId])`

---

## 2. Migration Execution (Delta SQL)

A schema migration named `0002_drift_delta_hardening` will be created under `apps/api/prisma/migrations` and run against the PostgreSQL database:

```sql
-- CreateEnum
CREATE TYPE "LockStatus" AS ENUM ('ACTIVE', 'STALE', 'RELEASED');

-- AlterTable
ALTER TABLE "warehouse_locks" 
ADD COLUMN "status" "LockStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "targetRole" "Role" NOT NULL,
    "warehouseId" TEXT,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentType" "DocumentType",
    "documentId" TEXT,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warehouse_locks_isActive_expiresAt_idx" ON "warehouse_locks"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "notification_logs_targetRole_isRead_idx" ON "notification_logs"("targetRole", "isRead");

-- CreateIndex
CREATE INDEX "notification_logs_warehouseId_idx" ON "notification_logs"("warehouseId");
```
