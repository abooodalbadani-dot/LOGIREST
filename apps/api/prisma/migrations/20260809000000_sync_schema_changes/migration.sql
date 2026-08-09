-- AlterEnum
ALTER TYPE "AdjustmentReason" ADD VALUE 'OPENING_STOCK';

-- AlterTable
ALTER TABLE "adjustment_lines" ADD COLUMN     "snapshot_qty_before" DECIMAL(18,4),
ADD COLUMN     "uom_id" TEXT;

-- AlterTable
ALTER TABLE "barcode_mappings" ADD COLUMN     "uom_id" TEXT;

-- AlterTable
ALTER TABLE "goods_received_notes" ADD COLUMN     "currencyId" TEXT,
ADD COLUMN     "supplierId" TEXT,
ALTER COLUMN "poId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "grn_lines" ADD COLUMN     "uom_id" TEXT;

-- AlterTable
ALTER TABLE "inventory_issue_lines" ADD COLUMN     "uom_id" TEXT;

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "minStockLevel" DECIMAL(18,4);

-- AlterTable
ALTER TABLE "kitchen_request_items" ADD COLUMN     "uom_id" TEXT;

-- AlterTable
ALTER TABLE "po_lines" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "uom_id" TEXT;

-- AlterTable
ALTER TABLE "pr_lines" ADD COLUMN     "uom_id" TEXT;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "exchange_rate" DECIMAL(18,6) NOT NULL DEFAULT 1,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "purchase_requests" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "currencyId" TEXT,
ADD COLUMN     "paymentTerms" TEXT DEFAULT 'NET_30';

-- AlterTable
ALTER TABLE "transfer_lines" ADD COLUMN     "uom_id" TEXT;

-- CreateTable
CREATE TABLE "uom_conversions" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "fromUomId" TEXT NOT NULL,
    "toUomId" TEXT NOT NULL,
    "factor" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "uom_conversions_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "barcode_mappings" ADD CONSTRAINT "barcode_mappings_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "units_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uom_conversions" ADD CONSTRAINT "uom_conversions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uom_conversions" ADD CONSTRAINT "uom_conversions_fromUomId_fkey" FOREIGN KEY ("fromUomId") REFERENCES "units_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uom_conversions" ADD CONSTRAINT "uom_conversions_toUomId_fkey" FOREIGN KEY ("toUomId") REFERENCES "units_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pr_lines" ADD CONSTRAINT "pr_lines_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "units_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_lines" ADD CONSTRAINT "po_lines_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "units_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_received_notes" ADD CONSTRAINT "goods_received_notes_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_lines" ADD CONSTRAINT "grn_lines_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "units_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_issue_lines" ADD CONSTRAINT "inventory_issue_lines_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "units_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_lines" ADD CONSTRAINT "transfer_lines_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "units_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adjustment_lines" ADD CONSTRAINT "adjustment_lines_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "units_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_request_items" ADD CONSTRAINT "kitchen_request_items_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "units_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

