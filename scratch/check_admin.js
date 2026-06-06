const fs = require('fs');
const path = require('path');

const arPath = path.join('E:', 'kitchen-store-inventory-system', 'apps', 'web', 'messages', 'ar.json');
const content = fs.readFileSync(arPath, 'utf8');
const data = JSON.parse(content);

console.log('admin type:', typeof data.admin);
if (typeof data.admin === 'object') {
    console.log('admin keys:', Object.keys(data.admin));
    if (data.admin.matrix) {
        console.log('admin.matrix keys:', Object.keys(data.admin.matrix));
    } else {
        console.log('admin.matrix is missing!');
    }
} else {
    console.log('admin is NOT an object!');
}
