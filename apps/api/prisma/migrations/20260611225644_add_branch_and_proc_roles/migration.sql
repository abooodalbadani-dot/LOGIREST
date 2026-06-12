-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'BRANCH_MGR';
ALTER TYPE "Role" ADD VALUE 'PROC_MGR';

-- DropIndex
DROP INDEX "grns_grnNumber_trgm_idx";

-- DropIndex
DROP INDEX "issues_issueNumber_trgm_idx";

-- DropIndex
DROP INDEX "items_name_trgm_idx";

-- DropIndex
DROP INDEX "items_sku_trgm_idx";

-- DropIndex
DROP INDEX "lots_lotNumber_trgm_idx";

-- DropIndex
DROP INDEX "pos_poNumber_trgm_idx";

-- DropIndex
DROP INDEX "suppliers_code_trgm_idx";

-- DropIndex
DROP INDEX "suppliers_name_trgm_idx";

-- DropIndex
DROP INDEX "transfers_transferNumber_trgm_idx";

-- CreateTable
CREATE TABLE "user_branch_scopes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "user_branch_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_branch_scopes_user_id_branch_id_key" ON "user_branch_scopes"("user_id", "branch_id");

-- AddForeignKey
ALTER TABLE "user_branch_scopes" ADD CONSTRAINT "user_branch_scopes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_branch_scopes" ADD CONSTRAINT "user_branch_scopes_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
