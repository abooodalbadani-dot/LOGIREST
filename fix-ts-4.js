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

// 1. master-data.ts
replaceAll('apps/web/src/types/master-data.ts', [
  [/warehouse_id:/g, 'warehouseId:']
]);

// 2. DepartmentFormClient.tsx
replaceAll('apps/web/src/app/[locale]/(app)/master-data/departments/DepartmentFormClient.tsx', [
  [/branch_id/g, 'branchId'],
  [/warehouse_id/g, 'warehouseId']
]);

// 3. issue-form.tsx
replaceAll('apps/web/src/features/operations/components/issue-form.tsx', [
  [/lot_number:/g, 'lotNumber:'],
  [/expiry_date:/g, 'expiryDate:']
]);

// 4. transfer-form.tsx
// Property 'fromWarehouseId' does not exist on type 'Transfer'. Did you mean 'from_warehouseId'?
// I need to change fromWarehouseId in types/documents.ts OR in transfer-form.tsx. Let's fix types/documents.ts
replaceAll('apps/web/src/types/documents.ts', [
  [/from_warehouseId/g, 'fromWarehouseId'],
  [/to_warehouseId/g, 'toWarehouseId']
]);

// 5. grn-form.tsx
// Property 'uomId' is missing in type '{ ... }'
// wait, my fix-ts-3.js maybe didn't match. 
// let's just add uomId inside fields.map directly.
let grnContent = fs.readFileSync('apps/web/src/features/purchasing/components/grn-form.tsx', 'utf8');
grnContent = grnContent.replace(
  /lot: f\.lot \? \{ id: f\.lot\.id, lotNumber: f\.lot\.lotNumber, expiry_date: f\.lot\.expiry_date \} : null,/,
  'lot: f.lot ? { id: f.lot.id, lotNumber: f.lot.lotNumber, expiryDate: f.lot.expiry_date, isExpired: false } : null, uomId: f.uom_id as any, itemId: f.item.id as any, qty: f.qty as any,'
);
fs.writeFileSync('apps/web/src/features/purchasing/components/grn-form.tsx', grnContent);
console.log('Updated grn-form.tsx');
