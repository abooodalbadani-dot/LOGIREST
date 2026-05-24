-- AlterTable
ALTER TABLE "warehouse_items" ADD COLUMN     "is_frozen" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "document_type" "DocumentType" NOT NULL,
    "year" INTEGER NOT NULL,
    "current_sequence" INTEGER NOT NULL DEFAULT 0,
    "prefix" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_document_type_year_branch_id_key" ON "document_sequences"("document_type", "year", "branch_id");

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
