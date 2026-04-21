const fs = require('fs');
const files = [
  'src/app/[locale]/(app)/(procurement)/purchase-requests/PRListClient.tsx',
  'src/app/[locale]/(app)/(procurement)/purchase-orders/POListClient.tsx',
  'src/app/[locale]/(app)/(operations)/transfers/TransferListClient.tsx',
  'src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx',
  'src/app/[locale]/(app)/(operations)/issues/IssueListClient.tsx',
  'src/app/[locale]/(app)/(operations)/goods-received/GRNListClient.tsx'
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let text = fs.readFileSync(f, 'utf8');
  
  text = text.replace(/data\.meta\.pagination\.total_pages/g, 'data.meta.total_pages');
  
  if (text.includes('<Button asChild>')) {
     if (!text.includes('buttonVariants')) {
        text = text.replace(/import \{ Button \} from '([^']+)'/, 'import { Button, buttonVariants } from \'$1\'');
     }
     text = text.replace(/<Button\s+asChild>\s*<Link([^>]*)>/g, '<Link$1 className={buttonVariants({ variant: \'default\' })}>');
     text = text.replace(/<\/Link>\s*<\/Button>/g, '</Link>');
  }
  
  text = text.replace(/onRowClick=\{\(row\) =>/g, 'onRowClick={(row: any) =>');
  
  fs.writeFileSync(f, text);
}
