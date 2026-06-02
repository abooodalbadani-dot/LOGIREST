const fs = require('fs');
const path = require('path');

const entities = [
    'Purchase Requests', 'Purchase Orders', 'GRNs', 'Transfers', 'Issues',
    'Adjustments', 'Stocktakes', 'Kitchen Requests'
];

const workflows = [
    'Submit', 'Approve', 'Reject', 'Post', 'Cancel', 'Void', 'Receive', 'Ship', 'Fulfill'
];

const entityMap = {
    'Purchase Requests': 'purchase-request',
    'Purchase Orders': 'po',
    'GRNs': 'grn',
    'Transfers': 'transfer',
    'Issues': 'issue',
    'Adjustments': 'adjustment',
    'Stocktakes': 'stocktake',
    'Kitchen Requests': 'kitchen-request'
};

function walk(dir, out) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
        if (f === 'node_modules' || f === '.next') continue;
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) walk(p, out);
        else out.push(p);
    }
}
const apiFiles = []; walk('apps/api/src', apiFiles);

let markdown = `# Workflow Matrix\n\n`;
markdown += `| Entity | ${workflows.join(' | ')} |\n`;
markdown += `|---|${workflows.map(() => '---').join('|')}|\n`;

entities.forEach(entity => {
    let row = [entity];
    const keyword = entityMap[entity];
    
    // Look for matching controller files
    const matchedFiles = apiFiles.filter(f => f.toLowerCase().includes(keyword) && f.endsWith('.controller.ts'));
    
    let content = '';
    matchedFiles.forEach(file => {
        content += fs.readFileSync(file, 'utf8') + '\n';
    });
    
    workflows.forEach(wf => {
        const wfLower = wf.toLowerCase();
        // Check for specific endpoint patterns like @Post(':id/submit') or similar routes
        const regex = new RegExp(`@(?:Post|Put|Patch)\\([^)]*${wfLower}[^)]*\\)`, 'i');
        if (content.match(regex)) {
            row.push('✅');
        } else {
            row.push('❌');
        }
    });
    
    markdown += `| ${row.join(' | ')} |\n`;
});

const outPath = 'C:\\Users\\Qursan\\.gemini\\antigravity-ide\\brain\\1f1fd828-ac0e-42db-97f9-b12eb55b8e56\\WORKFLOW_MATRIX.md';
fs.writeFileSync(outPath, markdown);
console.log('Workflow Matrix generated at:', outPath);
