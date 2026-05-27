-- Create composite index on stock_ledger
CREATE INDEX IF NOT EXISTS "stock_ledger_warehouseId_itemId_idx" ON "stock_ledger"("warehouseId", "itemId");

-- Create composite index on outbox_events
CREATE INDEX IF NOT EXISTS "outbox_events_status_createdAt_idx" ON "outbox_events"("status", "createdAt");
