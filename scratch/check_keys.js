const fs = require('fs');
const path = require('path');

const arPath = path.join('E:', 'kitchen-store-inventory-system', 'apps', 'web', 'messages', 'ar.json');
const content = fs.readFileSync(arPath, 'utf8');

try {
    const data = JSON.parse(content);
    console.log('JSON parsed successfully');
    
    if (data.admin) {
        console.log('admin exists');
        if (data.admin.matrix) {
            console.log('admin.matrix exists');
            console.log('admin.matrix keys:', Object.keys(data.admin.matrix));
            console.log('admin.matrix.last_update:', data.admin.matrix.last_update);
        } else {
            console.log('admin.matrix MISSING');
        }
    } else {
        console.log('admin MISSING');
    }

    if (data.common) {
        console.log('common exists');
        console.log('common.language:', data.common.language);
    } else {
        console.log('common MISSING');
    }

} catch (e) {
    console.error('JSON parse error:', e.message);
}
