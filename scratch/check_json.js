const fs = require('fs');
const pathAr = 'e:/kitchen-store-inventory-system/apps/web/messages/ar.json';
try {
  const json = JSON.parse(fs.readFileSync(pathAr, 'utf8'));
  console.log('AR common keys:', Object.keys(json.common).sort());
} catch (e) {
  console.error('Error AR:', e.message);
}
