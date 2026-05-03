
const fs = require('fs');
const content = fs.readFileSync('e:/Kitchen‑Store Inventory System/messages/en.json', 'utf8');
const en = JSON.parse(content);
console.log('Top level keys:', Object.keys(en));
console.log('Keys in operations:', Object.keys(en.operations || {}));
