-- CreateIndex
CREATE INDEX "lot_allocations_transferLineId_idx" ON "lot_allocations"("transferLineId");

-- CreateIndex
CREATE INDEX "lot_allocations_issueLineId_idx" ON "lot_allocations"("issueLineId");
