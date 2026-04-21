const fs = require('fs');

const files = [
  'src/app/[locale]/(app)/(procurement)/purchase-requests/PRListClient.tsx',
  'src/app/[locale]/(app)/(procurement)/purchase-orders/POListClient.tsx',
  'src/app/[locale]/(app)/(operations)/transfers/TransferListClient.tsx',
  'src/app/[locale]/(app)/(operations)/adjustments/AdjustmentListClient.tsx',
  'src/app/[locale]/(app)/(operations)/issues/IssueListClient.tsx'
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let text = fs.readFileSync(f, 'utf8');
  text = text.replace(/key:\s*'([^']+)',/g, "accessorKey: '$1',");
  text = text.replace(/const columns = \[/g, "const columns: any[] = [");
  text = text.replace(/currentPage=\{page\}/g, "page={page}");
  fs.writeFileSync(f, text);
}

let dtPath = 'src/components/shared/DataTable/DataTable.tsx';
if (fs.existsSync(dtPath)) {
  let text = fs.readFileSync(dtPath, 'utf8');
  if (!text.includes('onRowClick?:')) {
    text = text.replace(/filters\?:\s*React\.ReactNode;/g, "filters?: React.ReactNode;\n  onRowClick?: (row: T) => void;");
  }
  
  if (!text.includes('row.original')) {
    text = text.replace(/<tr key=\{row\.id\} className="border-b border-surface-3 hover:bg-surface-2 transition-colors">/g, 
        '<tr key={row.id} className={`border-b border-surface-3 hover:bg-surface-2 transition-colors ${onRowClick ? "cursor-pointer" : ""}`} onClick={() => onRowClick && onRowClick(row.original)}>'
    );
    text = text.replace(/filters\n\}: DataTableProps<T>/g, 'filters,\n  onRowClick\n}: DataTableProps<T>');
  }
  fs.writeFileSync(dtPath, text);
}
