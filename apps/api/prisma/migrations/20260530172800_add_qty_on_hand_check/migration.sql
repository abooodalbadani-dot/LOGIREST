-- Prevent inventory lots from having a negative quantity on hand
ALTER TABLE "warehouse_item_lots"
  ADD CONSTRAINT "chk_qty_non_negative"
  CHECK ("qtyOnHand" >= 0);
