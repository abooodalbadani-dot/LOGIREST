const fs = require('fs');
const files = [
  'src/app/[locale]/(app)/(procurement)/purchase-requests/PRListClient.tsx',
  'src/app/[locale]/(app)/(procurement)/purchase-orders/POListClient.tsx',
  'src/app/[locale]/(app)/(operations)/transfers/TransferListClient.tsx',
  'src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx',
  'src/app/[locale]/(app)/(procurement)/goods-received/GRNListClient.tsx'
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let text = fs.readFileSync(f, 'utf8');
  
  text = text.replace(/from\s+'@\/components\/shared\/DataTable'/g, "from '@/components/shared/DataTable/DataTable'");
  text = text.replace(/from\s+'@\/components\/shared\/FilterPanel'/g, "from '@/components/shared/DataTable/FilterPanel'");
  text = text.replace(/from\s+'@\/components\/shared\/Pagination'/g, "from '@/components/shared/DataTable/Pagination'");

  fs.writeFileSync(f, text);
}
