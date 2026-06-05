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

// 1. WarehouseFormClient.tsx
replaceAll('apps/web/src/app/[locale]/(app)/master-data/warehouses/WarehouseFormClient.tsx', [
  [/isActive/g, 'is_active']
]);

// 2. WarehouseListClient.tsx
replaceAll('apps/web/src/app/[locale]/(app)/master-data/warehouses/WarehouseListClient.tsx', [
  [/\.isActive/g, '.is_active'],
  [/'isActive'/g, "'is_active'"]
]);

// 3. FEFOLotAllocator.tsx
replaceAll('apps/web/src/components/shared/FEFOLotAllocator/FEFOLotAllocator.tsx', [
  [/lot_id:/g, 'lotId:'],
  [/lot_number:/g, 'lotNumber:'],
  [/expiry_date:/g, 'expiryDate:'],
  [/allocated_qty:/g, 'allocatedQty:'],
  [/override_reason:/g, 'overrideReason:']
]);

// 4. issue-form.tsx
replaceAll('apps/web/src/features/operations/components/issue-form.tsx', [
  [/lot_number: any/g, 'lotNumber: any'],
  [/expiry_date: any/g, 'expiryDate: any'],
  [/\.lot_number/g, '.lotNumber'],
  [/\.expiry_date/g, '.expiryDate'],
  [/uom_id:/g, 'uomId:'],
  [/\.destination_dept_id/g, '.destinationDeptId'],
  [/\.warehouse_id/g, '.warehouseId'],
  [/lot_id:/g, 'lotId:'],
  [/allocated_qty:/g, 'allocatedQty:'],
  [/override_reason:/g, 'overrideReason:'],
  [/\.name_ar/g, '.name'],
  [/\.name_en/g, '.name']
]);

// 5. transfer-form.tsx
replaceAll('apps/web/src/features/operations/components/transfer-form.tsx', [
  [/\.from_warehouseId/g, '.from_warehouseId'],
  [/\.to_warehouseId/g, '.to_warehouseId']
]);
