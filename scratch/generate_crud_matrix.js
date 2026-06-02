const fs = require('fs');
const path = require('path');

const entities = [
    'Items', 'Warehouses', 'Branches', 'Departments', 'Categories',
    'Suppliers', 'UOM', 'Barcodes', 'Currencies', 'FX Rates',
    'Purchase Requests', 'Purchase Orders', 'GRNs', 'Transfers', 'Issues',
    'Adjustments', 'Stocktakes', 'Kitchen Requests', 'Yield', 'Notifications',
    'Roles', 'Users', 'Settings'
];

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

const entityMap = {
    'Items': 'item',
    'Warehouses': 'warehouse',
    'Branches': 'branch',
    'Departments': 'department',
    'Categories': 'categor',
    'Suppliers': 'supplier',
    'UOM': 'uom',
    'Barcodes': 'barcode',
    'Currencies': 'currenc',
    'FX Rates': 'rate',
    'Purchase Requests': 'purchase-request',
    'Purchase Orders': 'po',
    'GRNs': 'grn',
    'Transfers': 'transfer',
    'Issues': 'issue',
    'Adjustments': 'adjustment',
    'Stocktakes': 'stocktake',
    'Kitchen Requests': 'kitchen-request',
    'Yield': 'yield',
    'Notifications': 'notification',
    'Roles': 'role',
    'Users': 'user',
    'Settings': 'setting'
};

let markdown = `# CRUD Matrix\n\n`;
markdown += `| Entity | Create | Read | Update | Delete |\n`;
markdown += `|---|---|---|---|---|\n`;

entities.forEach(entity => {
    let c = '❌', r = '❌', u = '❌', d = '❌';
    const keyword = entityMap[entity];
    
    // Look for matching controller files
    const matchedFiles = apiFiles.filter(f => f.toLowerCase().includes(keyword) && f.endsWith('.controller.ts'));
    
    matchedFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        if (content.match(/@Post\(/) && !content.match(/@Post\('[^']*'\)/)) c = '✅'; // general post
        if (content.match(/@Get\(/)) r = '✅';
        if (content.match(/@Put\(/) || content.match(/@Patch\(/)) u = '✅';
        if (content.match(/@Delete\(/)) d = '✅';
    });
    
    markdown += `| ${entity} | ${c} | ${r} | ${u} | ${d} |\n`;
});

const outPath = 'C:\\Users\\Qursan\\.gemini\\antigravity-ide\\brain\\1f1fd828-ac0e-42db-97f9-b12eb55b8e56\\CRUD_MATRIX.md';
fs.writeFileSync(outPath, markdown);
console.log('CRUD Matrix generated at:', outPath);
