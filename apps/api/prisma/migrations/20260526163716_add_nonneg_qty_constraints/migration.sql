-- Enforce non-negative stock at database level
ALTER TABLE "warehouse_items"
  ADD CONSTRAINT "chk_warehouse_items_qty_on_hand_nonneg"
  CHECK ("qty_on_hand" >= 0);

ALTER TABLE "warehouse_items"
  ADD CONSTRAINT "chk_warehouse_items_qty_allocated_nonneg"
  CHECK ("qty_allocated" >= 0);

ALTER TABLE "warehouse_item_lots"
  ADD CONSTRAINT "chk_warehouse_item_lots_qty_on_hand_nonneg"
  CHECK ("qty_on_hand" >= 0);

-- Validate outbox statuses at database level
ALTER TABLE "outbox_events"
  ADD CONSTRAINT "chk_outbox_events_status_valid"
  CHECK ("status" IN ('PENDING', 'SUCCEEDED', 'FAILED'));