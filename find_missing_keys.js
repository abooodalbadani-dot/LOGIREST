const fs = require('fs');
const path = require('path');

const en = JSON.parse(fs.readFileSync('apps/web/messages/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('apps/web/messages/ar.json', 'utf8'));

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.push(fullKey);
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    }
  }
  return keys;
}

const enKeys = getAllKeys(en);
const arKeys = getAllKeys(ar);

console.log('Keys in en but not in ar:');
enKeys.filter(k => !arKeys.includes(k)).forEach(k => console.log(k));

console.log('\nKeys in ar but not in en:');
arKeys.filter(k => !enKeys.includes(k)).forEach(k => console.log(k));
