const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath, callback);
    } else {
      callback(fullPath);
    }
  }
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Replace {row.original.someName || row.original.someId} with {row.original.someName || '—'}
  const regex = /\|\|\s*row\.original\.[a-zA-Z]+Id(?!\s*\|\|)/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, "|| '—'");
    changed = true;
  }
  
  // Also handle cases like: {row.original.warehouseName || row.original.warehouseId || '—'}
  const regex2 = /\|\|\s*row\.original\.[a-zA-Z]+Id\s*\|\|\s*'—'/g;
  if (regex2.test(content)) {
    content = content.replace(regex2, "|| '—'");
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

walk('apps/web/src', processFile);
