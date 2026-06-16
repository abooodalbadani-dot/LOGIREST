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
      if (file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('c:/kitchen-store-inventory-system/apps/web/src/app/[locale]/(app)');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // A more robust regex that captures the input properties regardless of specific class names
  // It looks for a div containing an <input> and a <Search>
  const targetRegex = /<div className=\"relative [^\"]*\">\s*<input[\s\S]*?className=\"[^\"]*\"[^>]*>\s*(?:<\/input>)?\s*<Search className=\"[^\"]*\"\s*\/>\s*<\/div>/g;

  if (targetRegex.test(content)) {
    content = content.replace(targetRegex, (match) => {
      // Find placeholder, value, onChange
      const placeholderMatch = match.match(/placeholder=\{([^\}]+)\}/) || match.match(/placeholder=\"([^\"]+)\"/);
      const valueMatch = match.match(/value=\{([^\}]+)\}/);
      const onChangeMatch = match.match(/onChange=\{([^}]+)\}/);
      
      const placeholderStr = placeholderMatch ? placeholderMatch[0] : '';
      const valueStr = valueMatch ? valueMatch[0] : '';
      const onChangeStr = onChangeMatch ? onChangeMatch[0] : '';

      return `<div className="relative w-full sm:max-w-md flex-1 shrink-0 min-w-[250px]">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
         ${placeholderStr}
         ${valueStr}
         ${onChangeStr}
         className="w-full ps-10 pe-4 bg-background border-border text-foreground focus:ring-operational-cyan focus:border-operational-cyan shadow-sm transition-all rounded-lg"
        />
       </div>`;
    });
    
    // Ensure Input is imported
    if (!content.includes('import { Input }') && !content.includes('import {Input}')) {
      content = content.replace(/(import .* from .*;)/, "$1\nimport { Input } from '@/components/ui/input';");
    }
    
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
