const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
    }
  });
  return results;
}

const files = walk('c:/kitchen-store-inventory-system/apps/web/src/app/[locale]/(app)');

files.forEach(file => {
  let originalContent = fs.readFileSync(file, 'utf8');
  let content = originalContent;

  // 1. ERADICATE DUPLICATE PAGE HEADERS
  // Only for page.tsx files, remove the duplicate PageHeader that sits above the Client component.
  if (file.endsWith('page.tsx')) {
    content = content.replace(/<PageHeader[^>]*\/>/g, '');
    content = content.replace(/import\s+\{\s*PageHeader\s*\}\s+from\s+'[^']+';\r?\n?/g, '');
  }

  // 2. GLOBAL SEARCH BOX ANTI-SHRINK ARMOR
  // Target specifically the wrappers inside DataTable filters
  content = content.replace(/className=\"relative w-full sm:max-w-md flex-1 shrink-0 min-w-\[250px\]\"/g, 'className="relative w-full sm:max-w-sm shrink-0"');
  content = content.replace(/className=\"w-full ps-10 pe-4 bg-background border-border text-foreground focus:ring-operational-cyan focus:border-operational-cyan shadow-sm transition-all rounded-lg\"/g, 'className="w-full ps-10 bg-background border-border text-foreground focus:border-brand-gold shrink-0 rounded-lg transition-all"');

  // 3. PURGE ROGUE TAILWIND COLORS
  
  // Replace the View button
  content = content.replace(/<Button[^>]*className=\"[^\"]*text-(?:cyan|blue)-500[^\"]*\"[^>]*>([\s\S]*?(?:tc\('view'\)|t\('view'\))[\s\S]*?)<\/Button>/g, (match, p1) => {
    return match.replace(/className=\"[^\"]*\"/, 'className="text-xs font-bold tracking-wider text-muted-foreground hover:text-brand-gold uppercase transition-colors h-8 px-3 rounded-lg"');
  });

  // Replace the Edit button
  content = content.replace(/<Button[^>]*className=\"[^\"]*text-(?:emerald|green|status-warning)-500[^\"]*\"[^>]*>([\s\S]*?(?:tc\('edit'\)|t\('edit'\))[\s\S]*?)<\/Button>/g, (match, p1) => {
    return match.replace(/className=\"[^\"]*\"/, 'className="text-xs font-bold tracking-wider text-brand-gold hover:text-brand-gold-hover uppercase transition-colors h-8 px-3 rounded-lg"');
  });
  
  // Replace remaining text-cyan-500, text-emerald-500, text-blue-500 etc. used in badges/identifiers
  content = content.replace(/text-(cyan|emerald|blue|green)-(500|400)/g, 'text-foreground');
  content = content.replace(/bg-(cyan|emerald|blue|green)-(500|400)\/\d+/g, 'bg-muted/50');
  
  // Replace specific hardcoded text-operational-cyan in uppercase codes
  content = content.replace(/text-operational-cyan uppercase px-2\.5 py-1 bg-operational-cyan\/10/g, 'text-foreground uppercase px-2.5 py-1 bg-muted/50');

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
  }
});

// Update MetricCard and StatusBadge globally
const metricCardPath = 'c:/kitchen-store-inventory-system/apps/web/src/components/ui/metric-card.tsx';
if (fs.existsSync(metricCardPath)) {
  let mcContent = fs.readFileSync(metricCardPath, 'utf8');
  mcContent = mcContent.replace(/text: 'text-status-success',/g, "text: 'text-brand-gold',");
  mcContent = mcContent.replace(/glow: 'from-status-success\/50',/g, "glow: 'from-brand-gold/50',");
  mcContent = mcContent.replace(/bg: 'bg-status-success\/10',/g, "bg: 'bg-brand-gold/10',");
  fs.writeFileSync(metricCardPath, mcContent);
}

const statusBadgePath = 'c:/kitchen-store-inventory-system/apps/web/src/components/shared/StatusBadge.tsx';
if (fs.existsSync(statusBadgePath)) {
  let sbContent = fs.readFileSync(statusBadgePath, 'utf8');
  sbContent = sbContent.replace(/bg-status-success\/15 text-status-success hover:bg-status-success\/25/g, 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20');
  sbContent = sbContent.replace(/bg-surface-container-high text-muted-foreground/g, 'bg-muted text-foreground border border-border');
  fs.writeFileSync(statusBadgePath, sbContent);
}

console.log('Sweep completed safely.');
