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

let brokenFiles = [];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Check if we have onChange={...} followed by className where a closing brace might be missing
  // Specifically: onChange={(e) => { ... } className=
  if (content.match(/onChange=\{\([^)]*\)\s*=>\s*\{[^}]+\}\s+className/)) {
    brokenFiles.push(file);
    // Add the missing } before className
    content = content.replace(/(onChange=\{\([^)]*\)\s*=>\s*\{[^}]+\})\s+(className)/g, '$1} $2');
    fs.writeFileSync(file, content);
  }
});
console.log('Fixed broken files: ' + brokenFiles.length);
console.log(brokenFiles.join('\n'));
