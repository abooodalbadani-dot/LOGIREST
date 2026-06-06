
const en = require('e:/kitchen-store-inventory-system/messages/en.json');

function get(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

const namespace = 'operations.kitchen_request';
const key = 'title';

const val = get(en, namespace + '.' + key);
console.log(`Value for ${namespace}.${key}:`, val);

if (!val) {
  console.log('Failed to find key!');
  console.log('operations keys:', Object.keys(en.operations));
  console.log('kitchen_request keys:', Object.keys(en.operations.kitchen_request || {}));
}
