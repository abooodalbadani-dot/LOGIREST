-- Add CHECK constraints for non-negative quantities
ALTER TABLE "warehouse_items"
  ADD CONSTRAINT warehouse_items_qty_on_hand_nonneg CHECK ("qtyOnHand" >= 0),
  ADD CONSTRAINT warehouse_items_qty_allocated_nonneg CHECK ("qtyAllocated" >= 0);

ALTER TABLE "warehouse_item_lots"
  ADD CONSTRAINT warehouse_item_lots_qty_on_hand_nonneg CHECK ("qtyOnHand" >= 0);

ALTER TABLE "outbox_events"
  ADD CONSTRAINT outbox_events_status_valid CHECK ("status" IN ('PENDING', 'SUCCEEDED', 'FAILED'));