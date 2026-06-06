const fs = require('fs');
const path = require('path');

const arPath = path.join('E:', 'kitchen-store-inventory-system', 'apps', 'web', 'messages', 'ar.json');
const content = fs.readFileSync(arPath, 'utf8');
const data = JSON.parse(content);
console.log('Top level keys:', Object.keys(data));
if (data.master_data) {
    console.log('master_data keys:', Object.keys(data.master_data));
}
