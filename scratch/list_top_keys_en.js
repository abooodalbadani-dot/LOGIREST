const fs = require('fs');
const path = require('path');

const enPath = path.join('E:', 'Kitchen‑Store Inventory System', 'apps', 'web', 'messages', 'en.json');
const content = fs.readFileSync(enPath, 'utf8');
const data = JSON.parse(content);
console.log('Top level keys:', Object.keys(data));
if (data.master_data) {
    console.log('master_data keys:', Object.keys(data.master_data));
}
