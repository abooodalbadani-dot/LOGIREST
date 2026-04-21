const fs = require('fs');

function replaceFile(path, regex, replacement) {
  if (fs.existsSync(path)) {
    let content = fs.readFileSync(path, 'utf8');
    content = content.replace(regex, replacement);
    fs.writeFileSync(path, content);
  }
}

// 1. Remove useWarehouseLock
replaceFile('src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentDetailClient.tsx', /import \{ useWarehouseLock \} from '@\/features\/operations\/hooks\/useStocktakeSession';\n/, '');
replaceFile('src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentDetailClient.tsx', /import \{ LockBanner \} from '@\/components\/shared\/LockBanner';\n/, '');
replaceFile('src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentDetailClient.tsx', /const warehouseId = adjustment\?.warehouse_id \|\| 'wh-1';\n\s*const \{ data: lockStatus \} = useWarehouseLock\(warehouseId\);\n/, '');
replaceFile('src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentDetailClient.tsx', /<LockBanner[\s\S]*?\/>\n/g, '');
replaceFile('src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentDetailClient.tsx', /disabled=\{!!lockStatus\?.is_locked\}/g, '');

replaceFile('src/app/[locale]/(app)/(operations)/transfers/[id]/TransferDetailClient.tsx', /import \{ useWarehouseLock \} from '@\/features\/operations\/hooks\/useStocktakeSession';\n/, '');
replaceFile('src/app/[locale]/(app)/(operations)/transfers/[id]/TransferDetailClient.tsx', /import \{ LockBanner \} from '@\/components\/shared\/LockBanner';\n/, '');
replaceFile('src/app/[locale]/(app)/(operations)/transfers/[id]/TransferDetailClient.tsx', /\/\/ For simplicity, we assume we check lock on source_warehouse_id\n\s*const sourceWarehouseId = transfer\?.source_warehouse_id \|\| 'wh-1';\n\s*const \{ data: lockStatus \} = useWarehouseLock\(sourceWarehouseId\);\n/, '');
replaceFile('src/app/[locale]/(app)/(operations)/transfers/[id]/TransferDetailClient.tsx', /<LockBanner[\s\S]*?\/>\n/g, '');
replaceFile('src/app/[locale]/(app)/(operations)/transfers/[id]/TransferDetailClient.tsx', /disabled=\{!!lockStatus\?.is_locked\}/g, '');

// 2. PostConfirmDialog warningText and DocumentReadOnlyOverlay
const detailFiles = [
  'src/app/[locale]/(app)/(operations)/adjustments/[id]/AdjustmentDetailClient.tsx',
  'src/app/[locale]/(app)/(operations)/transfers/[id]/TransferDetailClient.tsx',
  'src/app/[locale]/(app)/(procurement)/purchase-orders/[id]/PODetailClient.tsx',
  'src/app/[locale]/(app)/(procurement)/purchase-requests/[id]/PRDetailClient.tsx'
];
detailFiles.forEach(f => {
  if (fs.existsSync(f)) {
    let text = fs.readFileSync(f, 'utf8');
    text = text.replace(/<PostConfirmDialog([\s\S]*?)description=\{([^\}]+)\}\n\s*\/>/g, "<PostConfirmDialog$1description={$2}\n        warningText=\"This action cannot be undone.\"\n      />");
    text = text.replace(/\{isReadOnly && <DocumentReadOnlyOverlay \/>\}/g, '{isReadOnly && <div className="absolute inset-0 bg-background/50 z-50 pointer-events-none" />}');
    fs.writeFileSync(f, text);
  }
});

replaceFile('src/app/[locale]/(app)/(procurement)/goods-received/GRNListClient.tsx', /const columns = \[/g, "const columns: any[] = [");

const grnPage = 'src/app/[locale]/(app)/(procurement)/goods-received/[id]/page.tsx';
if (fs.existsSync(grnPage)) {
    let t = fs.readFileSync(grnPage, 'utf8');
    t = t.replace(/import .*? '@\/components\/ui\/sheet';\n/g, '');
    t = t.replace(/const t = await useTranslations/g, 'const t = await getTranslations');
    fs.writeFileSync(grnPage, t);
}
