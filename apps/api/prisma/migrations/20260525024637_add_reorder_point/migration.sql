-- AlterTable
ALTER TABLE "approval_events" ALTER COLUMN "stepNumber" DROP DEFAULT,
ALTER COLUMN "userRole" DROP DEFAULT;

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "reorderPoint" DECIMAL(18,4);

-- AlterTable
ALTER TABLE "stocktake_snapshots" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reconciliation_runs" (
    "id" TEXT NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemsChecked" INTEGER NOT NULL,
    "discrepanciesFound" INTEGER NOT NULL,
    "frozenItems" TEXT[],
    "durationMs" INTEGER NOT NULL,

    CONSTRAINT "reconciliation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_events_status_createdAt_idx" ON "outbox_events"("status", "createdAt");
