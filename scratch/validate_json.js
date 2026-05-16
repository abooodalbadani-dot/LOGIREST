const fs = require('fs');
const path = require('path');

const arPath = path.join('apps', 'web', 'messages', 'ar.json');
try {
  const content = fs.readFileSync(arPath, 'utf8');
  const json = JSON.parse(content);
  console.log('JSON Parse Success');
  console.log('common.language:', json.common ? json.common.language : 'UNDEFINED');
  console.log('admin.matrix.last_update:', json.admin && json.admin.matrix ? json.admin.matrix.last_update : 'UNDEFINED');
} catch (e) {
  console.error('JSON Parse Error:', e.message);
}
