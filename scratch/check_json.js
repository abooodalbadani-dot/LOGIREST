
const fs = require('fs');
const path = require('path');

try {
  const en = JSON.parse(fs.readFileSync('e:/Kitchen‑Store Inventory System/messages/en.json', 'utf8'));
  console.log('en.json is valid');
  console.log('operations.kitchen_request:', !!en.operations?.kitchen_request);
  
  const ar = JSON.parse(fs.readFileSync('e:/Kitchen‑Store Inventory System/messages/ar.json', 'utf8'));
  console.log('ar.json is valid');
  console.log('operations.kitchen_request:', !!ar.operations?.kitchen_request);
} catch (e) {
  console.error('JSON Error:', e.message);
  // Try to find where it fails
}
