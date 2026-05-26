-- CreateTable
CREATE TABLE "audit_logs_archive" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "targetTable" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "beforeStateJson" TEXT NOT NULL,
    "afterStateJson" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_logs_archive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_ledger_archive" (
    "id" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotId" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "documentId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "idempotencyKey" TEXT,

    CONSTRAINT "stock_ledger_archive_pkey" PRIMARY KEY ("id")
);
