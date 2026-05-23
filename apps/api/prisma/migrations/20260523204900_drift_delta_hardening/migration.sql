-- CreateEnum
CREATE TYPE "LockStatus" AS ENUM ('ACTIVE', 'STALE', 'RELEASED');

-- AlterTable
ALTER TABLE "adjustment_lines" ADD COLUMN     "unitCost" DECIMAL(18,4);

-- AlterTable
ALTER TABLE "approval_events" ADD COLUMN     "comments" TEXT,
ADD COLUMN     "stepNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "userRole" "Role" NOT NULL DEFAULT 'APPROVER';

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "transfer_lines" ADD COLUMN     "varianceReason" TEXT;

-- AlterTable
ALTER TABLE "warehouse_locks" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "status" "LockStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "warehouses" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

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
CREATE INDEX "notification_logs_targetRole_isRead_idx" ON "notification_logs"("targetRole", "isRead");

-- CreateIndex
CREATE INDEX "notification_logs_warehouseId_idx" ON "notification_logs"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_prId_key" ON "purchase_orders"("prId");

-- CreateIndex
CREATE INDEX "warehouse_locks_isActive_expiresAt_idx" ON "warehouse_locks"("isActive", "expiresAt");
