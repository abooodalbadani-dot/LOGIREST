const fs = require('fs');
const path = require('path');

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
const webFiles = []; walk('apps/web/src', webFiles);

let markdown = `# EVIDENCE-BASED ENTERPRISE SYSTEM AUDIT\n\n`;

// Phase 1 - Architecture
markdown += `## Phase 1 — Architecture Audit\n`;
markdown += `Cannot verify\n\n`;

// Phase 2 - Backend
markdown += `## Phase 2 — Backend Audit\n`;
let backendFindings = [];
apiFiles.filter(f => f.endsWith('.controller.ts')).forEach(file => {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    let hasValidationPipe = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('ValidationPipe')) hasValidationPipe = true;
        if (lines[i].match(/@(Post|Put|Patch)\(/) && !hasValidationPipe && !lines.slice(Math.max(0, i-10), i).some(l => l.includes('ValidationPipe'))) {
            // Check if there is a @Body
            if (lines.slice(i, i+10).some(l => l.includes('@Body'))) {
                backendFindings.push(`- **File**: \`${file}\`\n  **Line**: ${i+1}\n  **Route**: \`${lines[i].trim()}\`\n  **Finding**: Missing ValidationPipe on mutation endpoint.\n`);
            }
        }
    }
});
if (backendFindings.length > 0) {
    markdown += backendFindings.join('\n');
} else {
    markdown += `Cannot verify\n`;
}
markdown += `\n`;

// Phase 3 - Frontend
markdown += `## Phase 3 — Frontend Audit\n`;
let frontendFindings = [];
webFiles.filter(f => f.endsWith('.tsx')).forEach(file => {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('TODO:') || lines[i].includes('// mock')) {
            frontendFindings.push(`- **File**: \`${file}\`\n  **Line**: ${i+1}\n  **Page/Component**: \`${path.basename(file)}\`\n  **Finding**: Mock implementation or TODO found.\n`);
        }
    }
});
if (frontendFindings.length > 0) {
    markdown += frontendFindings.slice(0, 50).join('\n') + (frontendFindings.length > 50 ? `\n...and ${frontendFindings.length - 50} more findings.\n` : '');
} else {
    markdown += `Cannot verify\n`;
}
markdown += `\n`;

// Phase 4 to 7
for(let i=4; i<=7; i++) {
    markdown += `## Phase ${i} — ${['CRUD', 'Workflow', 'Inventory Engine', 'Database'][i-4]} Audit\nCannot verify\n\n`;
}

// Phase 8 - Security
markdown += `## Phase 8 — Security Audit\n`;
let securityFindings = [];
apiFiles.filter(f => f.endsWith('.controller.ts')).forEach(file => {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    let hasControllerGuard = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('@UseGuards(')) hasControllerGuard = true;
        if (lines[i].match(/@(Get|Post|Put|Patch|Delete)\(/)) {
            let hasGuard = hasControllerGuard;
            for(let j = Math.max(0, i-5); j < i; j++) {
                if (lines[j].includes('@UseGuards') || lines[j].includes('@Public')) hasGuard = true;
            }
            if (!hasGuard && !file.includes('auth.controller')) {
                securityFindings.push(`- **File**: \`${file}\`\n  **Line**: ${i+1}\n  **Route**: \`${lines[i].trim()}\`\n  **Finding**: Missing Authorization Guard.\n`);
            }
        }
    }
});
if (securityFindings.length > 0) {
    markdown += securityFindings.join('\n');
} else {
    markdown += `Cannot verify\n`;
}
markdown += `\n`;

// Phase 9 to 16
for(let i=9; i<=16; i++) {
    const titles = [
        'Testing Audit', 'Infrastructure Audit', 'User Experience Audit', 
        'Operational Readiness Audit', 'Final Findings', 'Completion Scores', 
        'Production Verdict', 'Master Remediation Plan'
    ];
    markdown += `## Phase ${i} — ${titles[i-9]}\nCannot verify\n\n`;
}

const outPath = 'C:\\Users\\Qursan\\.gemini\\antigravity-ide\\brain\\1f1fd828-ac0e-42db-97f9-b12eb55b8e56\\PHASE_BY_PHASE_AUDIT.md';
fs.writeFileSync(outPath, markdown);
console.log('Audit generated at:', outPath);
