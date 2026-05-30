-- AlterTable user failed login lockout fields
ALTER TABLE "users" ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "locked_until" TIMESTAMP(3);

-- CreateTable PasswordResetToken
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable YieldBatch
CREATE TABLE "yield_batches" (
    "id" TEXT NOT NULL,
    "recipe_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "input_qty" DOUBLE PRECISION NOT NULL,
    "output_qty" DOUBLE PRECISION NOT NULL,
    "waste_qty" DOUBLE PRECISION NOT NULL,
    "yield_pct" DOUBLE PRECISION NOT NULL,
    "standard_yield" DOUBLE PRECISION NOT NULL,
    "efficiency" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "yield_batches_pkey" PRIMARY KEY ("id")
);

-- AlterTable KitchenRequest to link to InventoryIssue
ALTER TABLE "kitchen_requests" ADD COLUMN "issue_id" TEXT;

-- CreateIndex PasswordResetToken uniques & indexes
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
CREATE INDEX "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");

-- CreateIndex YieldBatch index
CREATE INDEX "yield_batches_warehouse_id_idx" ON "yield_batches"("warehouse_id");

-- CreateIndex KitchenRequest issue_id unique index
CREATE UNIQUE INDEX "kitchen_requests_issue_id_key" ON "kitchen_requests"("issue_id");

-- CreateIndex GoodsReceivedNote status index
CREATE INDEX "goods_received_notes_status_idx" ON "goods_received_notes"("status");

-- CreateIndex StockLedger documentId index
CREATE INDEX "stock_ledger_documentId_idx" ON "stock_ledger"("documentId");

-- CreateIndex CostLedger documentId and documentType indexes
CREATE INDEX "cost_ledger_documentId_idx" ON "cost_ledger"("documentId");
CREATE INDEX "cost_ledger_documentId_documentType_idx" ON "cost_ledger"("documentId", "documentType");

-- CreateIndex WarehouseLock warehouseId and isActive index
CREATE INDEX "warehouse_locks_warehouseId_isActive_idx" ON "warehouse_locks"("warehouseId", "isActive");

-- AddForeignKey constraints
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "yield_batches" ADD CONSTRAINT "yield_batches_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "kitchen_requests" ADD CONSTRAINT "kitchen_requests_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "inventory_issues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- TASK-011: Database Non-Negative Quantity Check Constraints
ALTER TABLE "warehouse_items" ADD CONSTRAINT "chk_qty_on_hand_non_negative" CHECK ("qtyOnHand" >= 0);
ALTER TABLE "warehouse_item_lots" ADD CONSTRAINT "chk_lot_qty_on_hand_non_negative" CHECK ("qtyOnHand" >= 0);
ALTER TABLE "kitchen_request_items" ADD CONSTRAINT "chk_quantity_fulfilled_non_negative" CHECK ("quantityFulfilled" >= 0);
