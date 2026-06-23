-- AlterTable
ALTER TABLE "kitchen_request_items" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "kitchen_requests" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "transfer_lines" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "transfers" ADD COLUMN     "notes" TEXT;
