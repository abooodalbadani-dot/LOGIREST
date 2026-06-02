const fs = require('fs');
const path = require('path');

function walk(dir, out) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
        if (f === 'node_modules' || f === '.next' || f === 'archive' || f === 'dist') continue;
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) walk(p, out);
        else out.push(p);
    }
}

const allFiles = [];
walk('apps', allFiles);
walk('packages', allFiles);

const modules = [];
const controllers = [];
const services = [];
const pages = [];
const hooks = [];
const routes = [];
const workflows = [];
const models = [];

const prismaContent = fs.existsSync('apps/api/prisma/schema.prisma') 
    ? fs.readFileSync('apps/api/prisma/schema.prisma', 'utf8') 
    : '';

const modelRegex = /^model\s+(\w+)\s+\{/gm;
let match;
while ((match = modelRegex.exec(prismaContent)) !== null) {
    models.push(match[1]);
}

allFiles.forEach(f => {
    const base = path.basename(f);
    const lower = base.toLowerCase();
    
    if (f.includes('.module.ts')) modules.push(f.replace(/\\/g, '/'));
    if (f.includes('.controller.ts')) controllers.push(f.replace(/\\/g, '/'));
    if (f.includes('.service.ts')) services.push(f.replace(/\\/g, '/'));
    if (lower.includes('workflow') && f.endsWith('.ts') && !f.includes('test') && !f.includes('spec')) workflows.push(f.replace(/\\/g, '/'));
    if (base === 'page.tsx' || base === 'page.ts') {
        const route = path.dirname(f).replace('apps\\web\\src\\app', '').replace(/\\/g, '/');
        pages.push(route || '/');
        routes.push(route || '/');
    }
    if (base.startsWith('use') && (f.endsWith('.ts') || f.endsWith('.tsx'))) hooks.push(base);
    
    // Attempt to extract backend routes from controllers
    if (f.includes('.controller.ts')) {
        const content = fs.readFileSync(f, 'utf8');
        const routeMatch = content.match(/@Controller\(['"]([^'"]+)['"]\)/);
        if (routeMatch) {
            routes.push('/api/' + routeMatch[1]);
        }
    }
});

const md = `# CODEBASE MAP

## Modules
${modules.map(m => '- ' + m).sort().join('\n')}

## Controllers
${controllers.map(c => '- ' + c).sort().join('\n')}

## Services
${services.map(s => '- ' + s).sort().join('\n')}

## Routes
${[...new Set(routes)].map(r => '- ' + r).sort().join('\n')}

## Models
${models.map(m => '- ' + m).sort().join('\n')}

## Workflows
${workflows.map(w => '- ' + w).sort().join('\n')}

## Frontend Pages
${pages.map(p => '- ' + p).sort().join('\n')}

## Hooks
${[...new Set(hooks)].map(h => '- ' + h).sort().join('\n')}
`;

fs.writeFileSync('CODEBASE_MAP.md', md);
console.log('CODEBASE_MAP.md generated successfully.');
