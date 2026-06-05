const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  const fullPath = path.join('src', filePath);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  for (const [search, replace] of replacements) {
    // using split join to replace all occurrences
    content = content.split(search).join(replace);
  }
  fs.writeFileSync(fullPath, content);
}

const mapReplacements = [
  ['(kr: any)', '(kr: Record<string, unknown>)'],
  ['(adj: any)', '(adj: Record<string, unknown>)'],
  ['(issue: any)', '(issue: Record<string, unknown>)'],
  ['(transfer: any)', '(transfer: Record<string, unknown>)'],
  ['(pr: any)', '(pr: Record<string, unknown>)'],
  ['(grn: any)', '(grn: Record<string, unknown>)'],
  ['(po: any)', '(po: Record<string, unknown>)'],
  ['(session: any)', '(session: Record<string, unknown>)'],
  
  ['(line: any)', '(line: Record<string, unknown>)'],
  ['(item: any)', '(item: Record<string, unknown>)'],
  ['(d: any)', '(d: Record<string, unknown>)'],
  ['(c: any)', '(c: Record<string, unknown>)'],
  ['(snapshot: any)', '(snapshot: Record<string, unknown>)'],
  ['(req as any)', '(req as Record<string, unknown>)'],
  ['(sum: number, line: any)', '(sum: number, line: Record<string, unknown>)'],
  ['(la: any)', '(la: Record<string, unknown>)'],
  
  ['(kr.items || [])', '((kr.items as Record<string, unknown>[]) || [])'],
  ['(adj.lines || [])', '((adj.lines as Record<string, unknown>[]) || [])'],
  ['(issue.lines || [])', '((issue.lines as Record<string, unknown>[]) || [])'],
  ['(transfer.lines || [])', '((transfer.lines as Record<string, unknown>[]) || [])'],
  ['(pr.lines || [])', '((pr.lines as Record<string, unknown>[]) || [])'],
  ['(grn.lines || [])', '((grn.lines as Record<string, unknown>[]) || [])'],
  ['(po.lines || [])', '((po.lines as Record<string, unknown>[]) || [])'],
  ['(session.snapshots || [])', '((session.snapshots as Record<string, unknown>[]) || [])'],
  ['(line.lotAllocations || [])', '((line.lotAllocations as Record<string, unknown>[]) || [])'],
  
  ['body.lines?.map', '(body.lines as Record<string, unknown>[])?.map']
];

const files = [
  'modules/kitchen-requests/kitchen-requests.controller.ts',
  'modules/operations/adjustments/adjustments.controller.ts',
  'modules/operations/issues/issues.controller.ts',
  'modules/operations/transfers/transfers.controller.ts',
  'modules/purchase-requests/purchase-requests.controller.ts',
  'modules/purchasing/grn/grn.controller.ts',
  'modules/purchasing/purchase-orders/po.controller.ts',
  'modules/reports/reports.controller.ts',
  'modules/search/search.controller.ts',
  'modules/stocktake/stocktake.controller.ts'
];

files.forEach(f => replaceInFile(f, mapReplacements));
