-- CreateTable
CREATE TABLE "document_counters" (
    "doc_type" TEXT NOT NULL,
    "date_key" DATE NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "document_counters_pkey" PRIMARY KEY ("doc_type")
);
