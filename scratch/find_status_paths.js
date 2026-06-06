
const fs = require('fs');

const content = fs.readFileSync('e:/kitchen-store-inventory-system/messages/en.json', 'utf8');
const lines = content.split('\n');

let path = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const indent = line.search(/\S/);
  if (indent === -1) continue;

  const match = line.match(/"([^"]+)":\s*{/);
  if (match) {
    const key = match[1];
    while (path.length > 0 && path[path.length - 1].indent >= indent) {
      path.pop();
    }
    path.push({ key, indent });
    if (key === 'status') {
      console.log('Found status at line', i + 1, 'Path:', path.map(p => p.key).join('.'));
    }
  }
}
