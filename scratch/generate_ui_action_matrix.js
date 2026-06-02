const fs = require('fs');
const path = require('path');

const uiActions = ['Create', 'Edit', 'Delete', 'Submit', 'Approve', 'Reject', 'Post', 'Cancel'];

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

const webFiles = []; walk('apps/web/src/app', webFiles);

let markdown = `# UI Action Matrix\n\n`;
markdown += `| Page / Component | ${uiActions.join(' | ')} |\n`;
markdown += `|---|${uiActions.map(() => '---').join('|')}|\n`;

// Group by logical feature folders inside apps/web/src/app
const featuresMap = {};

webFiles.filter(f => f.endsWith('.tsx')).forEach(file => {
    // Determine a logical feature name from the path, e.g. apps/web/src/app/[locale]/(app)/(operations)/transfers/[id]/TransferDetailClient.tsx -> transfers
    let parts = file.split(path.sep);
    // find index of (app) or (operations) or similar
    let featureName = path.basename(file, '.tsx');
    let parentFolder = parts[parts.length - 2] || '';
    if (parentFolder.startsWith('[')) parentFolder = parts[parts.length - 3] || parentFolder; // Skip [id] folders
    
    const key = `${parentFolder} / ${featureName}`;
    if (!featuresMap[key]) featuresMap[key] = { content: '' };
    featuresMap[key].content += fs.readFileSync(file, 'utf8') + '\n';
});

Object.keys(featuresMap).forEach(key => {
    // Only include pages/components that likely have forms or details
    if (!key.toLowerCase().includes('client') && !key.toLowerCase().includes('page') && !key.toLowerCase().includes('form') && !key.toLowerCase().includes('modal')) return;

    let row = [key];
    let hasAny = false;
    
    uiActions.forEach(action => {
        // Look for buttons, e.g. <Button...>Approve</Button> or text like 'Approve' or 'Submit'
        const regex = new RegExp(`>\\s*${action}\\s*<|"${action}"|'${action}'|action="${action}"|action='${action}'`, 'i');
        if (featuresMap[key].content.match(regex)) {
            row.push('✅');
            hasAny = true;
        } else {
            row.push('❌');
        }
    });
    
    if (hasAny) {
        markdown += `| ${row.join(' | ')} |\n`;
    }
});

const outPath = 'C:\\Users\\Qursan\\.gemini\\antigravity-ide\\brain\\1f1fd828-ac0e-42db-97f9-b12eb55b8e56\\UI_ACTION_MATRIX.md';
fs.writeFileSync(outPath, markdown);
console.log('UI Action Matrix generated at:', outPath);
