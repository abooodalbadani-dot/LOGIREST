
const fs = require('fs');
const content = fs.readFileSync('e:/Kitchen‑Store Inventory System/messages/en.json', 'utf8');
const lines = content.split('\n');

let level = 0;
let inOperations = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('"operations": {')) {
    inOperations = true;
    level = 1;
    console.log('Operations starts at line', i + 1);
  } else if (inOperations) {
    if (line.includes('{')) level += (line.match(/{/g) || []).length;
    if (line.includes('}')) level -= (line.match(/}/g) || []).length;
    if (level === 0) {
      console.log('Operations ends at line', i + 1);
      inOperations = false;
    }
  }
}
