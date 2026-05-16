const fs = require('fs');
const path = require('path');

const enPath = path.resolve('apps/web/messages/en.json');
const arPath = path.resolve('apps/web/messages/ar.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.push(fullKey);
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    }
  }
  return keys;
}

const enKeys = getAllKeys(en);
const arKeys = getAllKeys(ar);

console.log('--- Missing in AR ---');
enKeys.filter(k => !arKeys.includes(k)).forEach(k => console.log(k));

console.log('\n--- Missing in EN ---');
arKeys.filter(k => !enKeys.includes(k)).forEach(k => console.log(k));
