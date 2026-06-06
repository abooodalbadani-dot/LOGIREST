
const fs = require('fs');

const content = fs.readFileSync('e:/kitchen-store-inventory-system/messages/en.json', 'utf8');
const lines = content.split('\n');

let currentLevel = 0;
let path = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const indent = line.search(/\S/);
  if (indent === -1) continue;

  const match = line.match(/"([^"]+)":\s*{/);
  if (match) {
    const key = match[1];
    // Update path based on indentation
    while (path.length > 0 && path[path.length - 1].indent >= indent) {
      path.pop();
    }
    path.push({ key, indent });
    if (key === 'kitchen_request') {
      console.log('Found kitchen_request at line', i + 1);
      console.log('Path:', path.map(p => p.key).join('.'));
    }
  }
}
