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

  const regex = /<FilterPanel[^>]*onFilterChange=[\s\S]*?\/>/;
  
  if (regex.test(text)) {
    let options = "";
    if (f.includes('purchase-requests') || f.includes('purchase-orders')) {
        options = `            <option value="DRAFT">{tCommon('status.draft')}</option>
            <option value="APPROVED">{tCommon('status.approved')}</option>
            <option value="REJECTED">{tCommon('status.rejected')}</option>`;
        if (f.includes('purchase-orders')) {
            options += `\n            <option value="POSTED">{tCommon('status.posted')}</option>`;
        }
    } else {
        options = `            <option value="DRAFT">{tCommon('status.draft')}</option>
            <option value="POSTED">{tCommon('status.posted')}</option>`;
    }

    const replacement = `<FilterPanel onReset={() => { setStatus(''); setPage(1); }}>
          <select 
            value={status} 
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-surface-2 border border-surface-3 rounded w-full md:w-64"
          >
            <option value="">{tCommon('status.all') || 'All Statuses'}</option>
${options}
          </select>
        </FilterPanel>`;

    text = text.replace(regex, replacement);
    fs.writeFileSync(f, text);
  }
}
