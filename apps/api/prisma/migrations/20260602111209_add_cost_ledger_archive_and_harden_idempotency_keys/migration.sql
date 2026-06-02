/*
  Warnings:

  - Made the column `idempotencyKey` on table `cost_ledger` required. This step will fail if there are existing NULL values in that column.
  - Made the column `idempotencyKey` on table `stock_ledger` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "LandedCostStatus" AS ENUM ('DRAFT', 'PROCESSING', 'POSTED');

-- CreateEnum
CREATE TYPE "AllocationMethod" AS ENUM ('VALUE', 'QUANTITY', 'WEIGHT', 'VOLUME');

-- AlterTable
ALTER TABLE "cost_ledger" ALTER COLUMN "idempotencyKey" SET NOT NULL;

-- AlterTable
ALTER TABLE "stock_ledger" ALTER COLUMN "idempotencyKey" SET NOT NULL;

-- CreateTable
CREATE TABLE "landed_cost_vouchers" (
    "id" TEXT NOT NULL,
    "voucherNumber" TEXT NOT NULL,
    "allocationMethod" "AllocationMethod" NOT NULL,
    "totalAllocatedCost" DECIMAL(18,4) NOT NULL,
    "status" "LandedCostStatus" NOT NULL DEFAULT 'DRAFT',
    "currencyId" TEXT NOT NULL,
    "exchangeRate" DECIMAL(18,6) NOT NULL DEFAULT 1.0,
    "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "landed_cost_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landed_cost_allocation_lines" (
    "id" TEXT NOT NULL,
    "landedCostVoucherId" TEXT NOT NULL,
    "grnLineId" TEXT NOT NULL,
    "allocatedCost" DECIMAL(18,4) NOT NULL,
    "adjustedUnitCost" DECIMAL(18,4) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "landed_cost_allocation_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landed_cost_grn_relations" (
    "id" TEXT NOT NULL,
    "landedCostVoucherId" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,

    CONSTRAINT "landed_cost_grn_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_ledger_archive" (
    "id" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "newWac" DECIMAL(18,4) NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "idempotencyKey" TEXT,

    CONSTRAINT "cost_ledger_archive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "landed_cost_vouchers_voucherNumber_key" ON "landed_cost_vouchers"("voucherNumber");

-- CreateIndex
CREATE UNIQUE INDEX "landed_cost_grn_relations_landedCostVoucherId_grnId_key" ON "landed_cost_grn_relations"("landedCostVoucherId", "grnId");

-- AddForeignKey
ALTER TABLE "landed_cost_vouchers" ADD CONSTRAINT "landed_cost_vouchers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landed_cost_allocation_lines" ADD CONSTRAINT "landed_cost_allocation_lines_landedCostVoucherId_fkey" FOREIGN KEY ("landedCostVoucherId") REFERENCES "landed_cost_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landed_cost_allocation_lines" ADD CONSTRAINT "landed_cost_allocation_lines_grnLineId_fkey" FOREIGN KEY ("grnLineId") REFERENCES "grn_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landed_cost_grn_relations" ADD CONSTRAINT "landed_cost_grn_relations_landedCostVoucherId_fkey" FOREIGN KEY ("landedCostVoucherId") REFERENCES "landed_cost_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landed_cost_grn_relations" ADD CONSTRAINT "landed_cost_grn_relations_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "goods_received_notes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
