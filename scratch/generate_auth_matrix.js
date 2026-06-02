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

let markdown = `# Authorization Matrix\n\n`;
markdown += `| Controller / Endpoint | Method | Route | Roles / Permissions | Status |\n`;
markdown += `|---|---|---|---|---|\n`;

apiFiles.filter(f => f.endsWith('.controller.ts')).forEach(file => {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    let controllerGuards = '';
    let controllerRoles = '';
    let controllerName = path.basename(file, '.controller.ts');
    
    // Find class-level guards/roles
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('export class')) break;
        if (lines[i].includes('@UseGuards(')) controllerGuards = lines[i].trim();
        if (lines[i].includes('@Roles(') || lines[i].includes('@Permissions(')) controllerRoles = lines[i].trim();
    }

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/@(Get|Post|Put|Patch|Delete)\(([^)]*)\)/);
        if (match) {
            const method = match[1].toUpperCase();
            const route = match[2].replace(/['"]/g, '') || '/';
            
            let endpointRoles = '';
            let isPublic = false;
            
            // Check previous lines for endpoint specific roles or public decorator
            for(let j = Math.max(0, i-5); j < i; j++) {
                if (lines[j].includes('@Roles(') || lines[j].includes('@Permissions(')) endpointRoles = lines[j].trim();
                if (lines[j].includes('@Public(') || lines[j].includes('@Public')) isPublic = true;
            }
            
            let authRequirements = endpointRoles || controllerRoles || 'Basic Auth';
            let status = (endpointRoles || controllerRoles) ? 'Secured' : 'Missing Specific Roles';
            if (isPublic) {
                authRequirements = 'Public';
                status = 'Public';
            }
            if (!controllerGuards && !isPublic && !lines.slice(Math.max(0, i-5), i).some(l => l.includes('@UseGuards'))) {
                authRequirements = 'None';
                status = 'Unsecured ❌';
            }
            
            markdown += `| ${controllerName} | ${method} | ${route} | \`${authRequirements.replace(/\|/g, '\\|')}\` | ${status} |\n`;
        }
    }
});

const outPath = 'C:\\Users\\Qursan\\.gemini\\antigravity-ide\\brain\\1f1fd828-ac0e-42db-97f9-b12eb55b8e56\\AUTHORIZATION_MATRIX.md';
fs.writeFileSync(outPath, markdown);
console.log('Authorization Matrix generated at:', outPath);
