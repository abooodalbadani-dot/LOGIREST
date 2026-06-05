const fs = require('fs');

function replaceAll(file, replacements) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  for (const [search, replace] of replacements) {
    content = content.replace(search, replace);
  }
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
}

// 1. issue-form.tsx
replaceAll('apps/web/src/features/operations/components/issue-form.tsx', [
  [/uom_id:/g, 'uomId:'],
  [/lot_allocations/g, 'lotAllocations'],
  [/\.created_at/g, '.createdAt'],
  [/\.created_by/g, '.createdBy'],
  [/\.posted_at/g, '.postedAt'],
  [/\.posted_by/g, '.postedBy'],
  [/\.document_number/g, '.documentNumber'],
  [/\.allocated_qty/g, '.allocatedQty'],
  [/\(alloc\)/g, '(alloc: any)'],
  [/\(alloc, idx\)/g, '(alloc: any, idx: number)'],
  [/\.name_en/g, '.name'], // Assuming warehouse/branch name mappings
  [/\.name_ar/g, '.name']
]);

// 2. transfer-form.tsx
replaceAll('apps/web/src/features/operations/components/transfer-form.tsx', [
  [/\.from_warehouse_id/g, '.fromWarehouseId'],
  [/\.to_warehouse_id/g, '.toWarehouseId'],
  [/\.transfer_status/g, '.transferStatus'],
  [/\.document_number/g, '.documentNumber'],
  [/\.from_warehouse_name/g, '.fromWarehouseName'],
  [/\.to_warehouse_name/g, '.toWarehouseName'],
  [/\.shipped_at/g, '.shippedAt'],
  [/\.received_at/g, '.receivedAt'],
  [/\.variance_reason/g, '.varianceReason'],
  [/\.shipped_qty/g, '.shippedQty'],
  [/\.received_qty/g, '.receivedQty']
]);

// 3. transfer-viewer.tsx
replaceAll('apps/web/src/features/operations/components/transfer-viewer.tsx', [
  [/\.transfer_status/g, '.transferStatus'],
  [/\.document_number/g, '.documentNumber'],
  [/\.from_warehouse_name/g, '.fromWarehouseName'],
  [/\.to_warehouse_name/g, '.toWarehouseName'],
  [/\.shipped_at/g, '.shippedAt'],
  [/\.received_at/g, '.receivedAt'],
  [/\.variance_reason/g, '.varianceReason'],
  [/\.shipped_qty/g, '.shippedQty'],
  [/\.received_qty/g, '.receivedQty']
]);

// 4. grn-form.tsx
// Property 'uomId' is missing ...
replaceAll('apps/web/src/features/purchasing/components/grn-form.tsx', [
  [/lot: f\.lot \? \{ id: f\.lot\.id, lot_number: f\.lot\.lot_number, expiry_date: f\.lot\.expiry_date \} : null,/g, 
  'lot: f.lot ? { id: f.lot.id, lot_number: f.lot.lot_number, expiry_date: f.lot.expiry_date } : null,\n                      uomId: f.uom_id as any,\n                      itemId: f.item.id as any,\n                      qty: f.qty as any,']
]);

// 5. mock-api.adapter.ts
// Property 'warehouseId' does not exist on type 'HydrationBody'. Did you mean 'warehouse_id'?
replaceAll('apps/web/src/infrastructure/mock/mock-api.adapter.ts', [
  [/\(body as HydrationBody\)\?\.warehouseId/g, '(body as HydrationBody)?.warehouse_id']
]);
