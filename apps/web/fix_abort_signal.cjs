const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

let count = 0;
walk('src', (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content.replace(/apiClient\.(get|post|put|patch|del)\(([\s\S]*?),\s*signal\s*\)/g, 'apiClient.$1($2, { signal })');
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      count++;
      console.log('Updated', filePath);
    }
  }
});
console.log('Total files updated:', count);
