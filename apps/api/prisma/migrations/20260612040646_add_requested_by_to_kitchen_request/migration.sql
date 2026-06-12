-- AlterTable
ALTER TABLE "kitchen_requests" ADD COLUMN     "requested_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "kitchen_requests" ADD CONSTRAINT "kitchen_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
