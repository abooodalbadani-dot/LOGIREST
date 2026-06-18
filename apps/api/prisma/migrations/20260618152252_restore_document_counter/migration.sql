-- CreateTable
CREATE TABLE "document_counters" (
    "doc_type" TEXT NOT NULL,
    "branch_code" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "document_counters_pkey" PRIMARY KEY ("doc_type","branch_code","year")
);

-- CreateIndex
CREATE INDEX "document_counters_doc_type_branch_code_year_idx" ON "document_counters"("doc_type", "branch_code", "year");
