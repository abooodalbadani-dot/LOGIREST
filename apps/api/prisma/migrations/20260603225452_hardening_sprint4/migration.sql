-- AlterTable
ALTER TABLE "audit_logs_archive" ADD COLUMN     "integrity_hash" VARCHAR(64);

-- AlterTable
ALTER TABLE "cost_ledger" ADD COLUMN     "archived_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "cost_ledger_archive" ADD COLUMN     "integrity_hash" VARCHAR(64);

-- AlterTable
ALTER TABLE "outbox_events" ADD COLUMN     "dead_lettered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "retry_history" JSONB;

-- AlterTable
ALTER TABLE "stock_ledger_archive" ADD COLUMN     "cost_ledger_entries" JSONB,
ADD COLUMN     "integrity_hash" VARCHAR(64);

-- Enable pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN trigram indexes
CREATE INDEX IF NOT EXISTS "items_name_trgm_idx" ON "items" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "items_sku_trgm_idx" ON "items" USING gin ("sku" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "suppliers_name_trgm_idx" ON "suppliers" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "suppliers_code_trgm_idx" ON "suppliers" USING gin ("code" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "lots_lotNumber_trgm_idx" ON "lots" USING gin ("lotNumber" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "grns_grnNumber_trgm_idx" ON "goods_received_notes" USING gin ("grnNumber" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "pos_poNumber_trgm_idx" ON "purchase_orders" USING gin ("poNumber" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "transfers_transferNumber_trgm_idx" ON "transfers" USING gin ("transferNumber" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "issues_issueNumber_trgm_idx" ON "inventory_issues" USING gin ("issueNumber" gin_trgm_ops);
