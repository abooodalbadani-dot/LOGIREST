
const fs = require('fs');
const content = fs.readFileSync('e:/Kitchen‑Store Inventory System/src/app/[locale]/(app)/(operations)/kitchen-requests/KitchenRequestsListClient.tsx', 'utf8');
const lines = content.split('\n');
for (let line of lines) {
  if (line.includes('useTranslations')) {
    console.log('Line:', line);
    console.log('Hex:', Buffer.from(line).toString('hex'));
  }
}
