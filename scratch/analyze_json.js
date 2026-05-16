const fs = require('fs');
const content = fs.readFileSync('apps/web/messages/ar.json', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const match = line.match(/^(\s*)"([^"]+)":/);
  if (match) {
    const indent = match[1].length;
    const key = match[2];
    if (indent <= 4) {
      console.log(`${i+1}: ${' '.repeat(indent)}[${indent}] ${key}`);
    }
  }
}
