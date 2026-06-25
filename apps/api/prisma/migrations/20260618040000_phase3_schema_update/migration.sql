-- CreateEnum
CREATE TYPE "ActiveStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PRStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PARTIAL', 'PARTIALLY_RECEIVED', 'FULFILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GRStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'POSTED', 'VOIDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'POSTED', 'VOIDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AdjStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'POSTED', 'VOIDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- AlterEnum
ALTER TYPE "DocumentType" ADD VALUE 'YIELD_BATCH';

-- DropIndex
DROP INDEX "outbox_events_status_createdAt_idx";

-- DropIndex
DROP INDEX "purchase_orders_prId_key";

-- AlterTable
ALTER TABLE "adjustments" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "postedAt" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "AdjStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "code" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "currencies" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "symbol" TEXT;

-- AlterTable
ALTER TABLE "goods_received_notes" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "fxRate" DECIMAL(18,6),
ADD COLUMN     "fx_rate_captured_at" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "postedAt" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "GRStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "grn_lines" ADD COLUMN     "unitPriceBase" DECIMAL(18,4),
ADD COLUMN     "unitPriceForeign" DECIMAL(18,4);

-- AlterTable
ALTER TABLE "inventory_issues" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "postedAt" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "IssueStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "outbox_events" DROP COLUMN "status",
ADD COLUMN     "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "warehouseId" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "POStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "purchase_requests" ADD COLUMN     "departmentId" TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "PRStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "yield_batches" ALTER COLUMN "input_qty" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "output_qty" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "waste_qty" SET DATA TYPE DECIMAL(18,4),
ALTER COLUMN "yield_pct" SET DATA TYPE DECIMAL(10,4),
ALTER COLUMN "standard_yield" SET DATA TYPE DECIMAL(10,4),
ALTER COLUMN "efficiency" SET DATA TYPE DECIMAL(10,4);

-- DropTable
DROP TABLE "document_counters";

-- CreateIndex
CREATE UNIQUE INDEX "categories_code_key" ON "categories"("code");

-- CreateIndex
CREATE INDEX "goods_received_notes_status_idx" ON "goods_received_notes"("status");

-- CreateIndex
CREATE INDEX "outbox_events_dead_lettered_status_createdAt_idx" ON "outbox_events"("dead_lettered", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "stocktake_counts_sessionId_itemId_lotId_key" ON "stocktake_counts"("sessionId", "itemId", "lotId");

-- CreateIndex
CREATE INDEX "warehouse_item_lots_warehouseId_itemId_qtyOnHand_idx" ON "warehouse_item_lots"("warehouseId", "itemId", "qtyOnHand");

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_issues" ADD CONSTRAINT "inventory_issues_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

