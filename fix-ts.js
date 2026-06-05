const fs = require('fs');

function fixMock() {
  const file = 'apps/web/src/infrastructure/mock/mock-api.adapter.ts';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/s\.warehouse_id === \(body as HydrationBody\)\?\.warehouse_id/g, 's.warehouseId === (body as HydrationBody)?.warehouseId');
  fs.writeFileSync(file, c);
}

function fixGRNForm() {
  const file = 'apps/web/src/features/purchasing/components/grn-form.tsx';
  let c = fs.readFileSync(file, 'utf8');
  // Need to add uomId inside the lines map
  c = c.replace(/lot: f\.lot \? \{ id: f\.lot\.id, lot_number: f\.lot\.lot_number, expiry_date: f\.lot\.expiry_date \} : null,/g, 'lot: f.lot ? { id: f.lot.id, lot_number: f.lot.lot_number, expiry_date: f.lot.expiry_date } : null,\n                      uomId: f.uom_id as any,\n                      itemId: f.item.id as any,\n                      qty: f.qty as any,');
  fs.writeFileSync(file, c);
}

function fixTransferForm() {
  const file = 'apps/web/src/features/operations/components/transfer-form.tsx';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/lines=\{transfer\?\.lines \?\? \[\]\}/g, 'lines={(transfer?.lines ?? []) as any}');
  c = c.replace(/transfer\.transfer_status/g, 'transfer.transferStatus');
  c = c.replace(/transfer\.document_number/g, 'transfer.documentNumber');
  c = c.replace(/transfer\.from_warehouse_name/g, 'transfer.fromWarehouseName');
  c = c.replace(/transfer\.to_warehouse_name/g, 'transfer.toWarehouseName');
  c = c.replace(/transfer\.shipped_at/g, 'transfer.shippedAt');
  c = c.replace(/transfer\.received_at/g, 'transfer.receivedAt');
  c = c.replace(/transfer\.variance_reason/g, 'transfer.varianceReason');
  c = c.replace(/transfer\.shipped_qty/g, 'transfer.shippedQty');
  c = c.replace(/transfer\.received_qty/g, 'transfer.receivedQty');
  c = c.replace(/line\.shipped_qty/g, 'line.shippedQty');
  c = c.replace(/line\.received_qty/g, 'line.receivedQty');
  fs.writeFileSync(file, c);
}

function fixTransferViewer() {
  const file = 'apps/web/src/features/operations/components/transfer-viewer.tsx';
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/lines=\{transfer\?\.lines \?\? \[\]\}/g, 'lines={(transfer?.lines ?? []) as any}');
  c = c.replace(/transfer\.transfer_status/g, 'transfer.transferStatus');
  c = c.replace(/transfer\.document_number/g, 'transfer.documentNumber');
  c = c.replace(/transfer\.from_warehouse_name/g, 'transfer.fromWarehouseName');
  c = c.replace(/transfer\.to_warehouse_name/g, 'transfer.toWarehouseName');
  c = c.replace(/transfer\.shipped_at/g, 'transfer.shippedAt');
  c = c.replace(/transfer\.received_at/g, 'transfer.receivedAt');
  c = c.replace(/transfer\.variance_reason/g, 'transfer.varianceReason');
  c = c.replace(/transfer\.shipped_qty/g, 'transfer.shippedQty');
  c = c.replace(/transfer\.received_qty/g, 'transfer.receivedQty');
  c = c.replace(/line\.shipped_qty/g, 'line.shippedQty');
  c = c.replace(/line\.received_qty/g, 'line.receivedQty');
  fs.writeFileSync(file, c);
}

fixMock();
fixGRNForm();
fixTransferForm();
fixTransferViewer();
