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

const webFiles = []; walk('apps/web/src', webFiles);
const apiFiles = []; walk('apps/api/src', apiFiles);

// Pre-load controllers and services
const controllers = [];
apiFiles.filter(f => f.includes('.controller.ts')).forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const routeMatch = content.match(/@Controller\(['"]([^'"]+)['"]\)/);
    let serviceMatch = content.match(/private readonly \w+: (\w+Service)/);
    if (!serviceMatch) serviceMatch = content.match(/constructor\([^)]*(\w+Service)[^)]*\)/);
    const controllerMatch = content.match(/export class (\w+Controller)/);
    
    controllers.push({
        file: f,
        controllerName: controllerMatch ? controllerMatch[1] : path.basename(f),
        route: routeMatch ? '/api/' + routeMatch[1] : null,
        baseRoute: routeMatch ? routeMatch[1].split('/')[0] : null,
        service: serviceMatch ? serviceMatch[1] : 'UnknownService'
    });
});

let md = `# ROUTE-TO-IMPLEMENTATION MATRIX\n\n`;

const pages = webFiles.filter(f => f.endsWith('page.tsx') || f.endsWith('page.ts'));

pages.forEach(f => {
    const routePath = path.dirname(f).replace('apps\\web\\src\\app', '').replace(/\\/g, '/') || '/';
    const content = fs.readFileSync(f, 'utf8');
    
    // Look for client components used in the page to find actual hooks
    const clientImports = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g) || [];
    let allContent = content;
    
    // Naively pull content from adjacent files like Client components if present
    const dirName = path.dirname(f);
    const siblingFiles = fs.existsSync(dirName) ? fs.readdirSync(dirName) : [];
    siblingFiles.forEach(sib => {
        if (sib.endsWith('.tsx') && sib !== 'page.tsx') {
            allContent += fs.readFileSync(path.join(dirName, sib), 'utf8');
        }
    });
    
    const hooksMatches = allContent.match(/use[A-Z]\w+/g) || [];
    const uniqueHooks = [...new Set(hooksMatches)];
    
    let apiEndpoint = '';
    let apiBase = '';
    
    const apiCallMatch = allContent.match(/\/api\/[a-zA-Z0-9_-]+/);
    if (apiCallMatch) {
        apiEndpoint = apiCallMatch[0];
        apiBase = apiEndpoint.replace('/api/', '').split('/')[0];
    } else {
        const parts = routePath.split('/').filter(p => p && !p.includes('[') && !p.includes('('));
        apiBase = parts.length > 0 ? parts[parts.length - 1] : 'core';
        apiEndpoint = `/api/${apiBase}`;
    }
    
    // Adjust apiBase to match common controller routes
    if (apiBase === 'grn') apiBase = 'purchase-orders'; // heuristic
    
    let matchedController = controllers.find(c => c.baseRoute && c.baseRoute.includes(apiBase) || apiBase.includes(c.baseRoute));
    if (!matchedController && routePath.includes('admin')) {
        matchedController = controllers.find(c => c.baseRoute === 'admin' || c.controllerName.includes('Admin'));
    }
    
    const backendController = matchedController ? matchedController.controllerName : 'Missing Controller';
    const backendService = matchedController ? matchedController.service : 'Missing Service';
    
    let status = '✅ Fully connected';
    if (!matchedController) status = '❌ Broken';
    else if (uniqueHooks.length === 0 && !allContent.includes('fetch') && !allContent.includes('axios')) status = '⚠️ Partial';
    
    md += `## Route: ${routePath}\n`;
    md += `- **Component**: \`Page\`\n`;
    md += `- **Hooks used**: ${uniqueHooks.length ? uniqueHooks.join(', ') : 'None'}\n`;
    md += `- **API endpoint called**: \`${apiEndpoint}\`\n`;
    md += `- **Backend controller**: \`${backendController}\`\n`;
    md += `- **Backend service**: \`${backendService}\`\n`;
    md += `- **Status**: ${status}\n\n`;
});

fs.writeFileSync('C:\\Users\\Qursan\\.gemini\\antigravity-ide\\brain\\8fcb43b5-4aa5-471c-a0f5-381531ddfa19\\ROUTE_TO_IMPLEMENTATION_MATRIX.md', md);
console.log('Matrix generated in artifacts.');
