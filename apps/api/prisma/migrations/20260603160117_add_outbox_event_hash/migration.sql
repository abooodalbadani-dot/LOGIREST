/*
  Warnings:

  - The primary key for the `document_counters` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `date_key` on the `document_counters` table. All the data in the column will be lost.
  - Added the required column `branch_code` to the `document_counters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `year` to the `document_counters` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "document_counters" DROP CONSTRAINT "document_counters_pkey",
DROP COLUMN "date_key",
ADD COLUMN     "branch_code" TEXT NOT NULL,
ADD COLUMN     "year" INTEGER NOT NULL,
ADD CONSTRAINT "document_counters_pkey" PRIMARY KEY ("doc_type", "branch_code", "year");

-- AlterTable
ALTER TABLE "outbox_events" ADD COLUMN     "documentId" TEXT,
ADD COLUMN     "event_hash" VARCHAR(64);

-- CreateIndex
CREATE INDEX "document_counters_doc_type_branch_code_year_idx" ON "document_counters"("doc_type", "branch_code", "year");

-- CreateIndex
CREATE UNIQUE INDEX outbox_event_hash_unique ON "outbox_events"("event_hash") WHERE event_hash IS NOT NULL;
