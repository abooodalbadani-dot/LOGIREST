const fs = require('fs');

function replaceAll(file, replacements) {
  if (!fs.existsSync(file)) return;
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

// 1. BranchFormClient.tsx
replaceAll('apps/web/src/app/[locale]/(app)/master-data/branches/BranchFormClient.tsx', [
  [/name_ar: '',\r?\n\s+name_en: '',/g, 'name: \'\','],
  [/name_en/g, 'name'],
  [/\{td\('fields\.name_ar'\)\}.*?id="branch-name-ar".*?\{td\(\`validation\.\$\{errors\.name_ar\.message\}\`\)\}<\/p>\}/gs, ''], // Try to remove name_ar div, but easier to just use JS to find and replace.
]);

// Actually I'll use a more precise replacement for BranchFormClient
let branchForm = fs.readFileSync('apps/web/src/app/[locale]/(app)/master-data/branches/BranchFormClient.tsx', 'utf8');
branchForm = branchForm.replace(/name_ar: '',\r?\n\s+name_en: '',/, "name: '',");
branchForm = branchForm.replace(/name_en/g, "name");
branchForm = branchForm.replace(/<div className="space-y-2">\s*<Label htmlFor="branch-name-ar"[\s\S]*?<\/div>/, "");
fs.writeFileSync('apps/web/src/app/[locale]/(app)/master-data/branches/BranchFormClient.tsx', branchForm);


// 2. BranchListClient.tsx
replaceAll('apps/web/src/app/[locale]/(app)/master-data/branches/BranchListClient.tsx', [
  [/<span className="font-bold text-label-sm">\{row\.original\.name_en\}<\/span>\r?\n\s+<span className="text-label-xs text-muted-foreground\/60" dir="rtl">\{row\.original\.name_ar\}<\/span>/, '<span className="font-bold text-label-sm">{row.original.name}</span>'],
]);

// 3. issue-form.tsx
replaceAll('apps/web/src/features/operations/components/issue-form.tsx', [
  [/uom_id:/g, 'uomId:'],
  [/\{ id: f\.item\.id, code: f\.item\.code, name_ar: f\.item\.name_ar, name_en: f\.item\.name_en, primary_uom: \{ code: f\.item\.primary_uom\.code \} \}/g, '{ id: f.item.id, code: f.item.code, name_ar: f.item.name_ar, name_en: f.item.name_en, primary_uom: { id: f.item.primary_uom.id, code: f.item.primary_uom.code } }'],
  [/item: \{ id: i\.item_id, code: i\.item_code, name: i\.item_name, primary_uom: \{ code: '' \} \}/g, 'item: { id: i.item_id, code: i.item_code, name_ar: i.item_name, name_en: i.item_name, primary_uom: { id: "", code: "" } }']
]);

// 4. useLotsByItem.ts
replaceAll('apps/web/src/features/operations/hooks/useLotsByItem.ts', [
  [/warehouse_id:/g, 'warehouseId:']
]);

// 5. mock-api.adapter.ts
replaceAll('apps/web/src/infrastructure/mock/mock-api.adapter.ts', [
  [/warehouse_id/g, 'warehouseId'],
  [/to_warehouseId/g, 'toWarehouseId']
]);

// 6. seeds/master-data.seed.ts
replaceAll('apps/web/src/infrastructure/mock/seeds/master-data.seed.ts', [
  [/warehouse_id:/g, 'warehouseId:']
]);

// 7. grn-form.tsx
let grnContent = fs.readFileSync('apps/web/src/features/purchasing/components/grn-form.tsx', 'utf8');
// Fix missing uomId
grnContent = grnContent.replace(/uomId: f\.uom_id as any, itemId: f\.item\.id as any, qty: f\.qty as any,/, 'uomId: (f as any).uom_id || f.uomId, itemId: f.item.id as any, qty: f.qty as any,');
// Actually, earlier I did: 
// `lot: f.lot ? ... : null, uomId: f.uom_id as any, ...`
// Let's just make sure uomId is in the mapped object.
// The error says: Property 'uomId' is missing in type '{ ... }'
grnContent = grnContent.replace(/lot: f\.lot \? \{ id: f\.lot\.id, lotNumber: f\.lot\.lotNumber, expiry_date: f\.lot\.expiry_date \} : null,/g, 'lot: f.lot ? { id: f.lot.id, lotNumber: f.lot.lotNumber, expiryDate: f.lot.expiry_date, isExpired: false } : null, uomId: (f as any).uom_id || (f as any).uomId, itemId: f.item.id, qty: f.qty, unitCost: f.unit_cost,');
fs.writeFileSync('apps/web/src/features/purchasing/components/grn-form.tsx', grnContent);

console.log('Done fix-ts-5.js');
