const fs = require('fs');
const path = 'apps/web/messages/ar.json';
const content = fs.readFileSync(path, 'utf8');
try {
  const json = JSON.parse(content);
  console.log('Top level keys:', Object.keys(json));
  if (json.common) {
    console.log('common keys count:', Object.keys(json.common).length);
    console.log('common.barcode_scanner:', json.common.barcode_scanner);
    console.log('common.status:', json.common.status);
    console.log('common.statuses:', json.common.statuses ? 'exists' : 'missing');
  }
  if (json.master_data && json.master_data.common) {
    console.log('master_data.common exists');
  }
} catch (e) {
  console.error('JSON Parse Error:', e.message);
  // Try to find where it's broken
}
