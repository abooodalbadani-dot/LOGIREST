const fs = require('fs');
const en = JSON.parse(fs.readFileSync('apps/web/messages/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('apps/web/messages/ar.json', 'utf8'));

function getKeys(obj, prefix = '') {
  let keys = [];
  for (let key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const enKeys = getKeys(en);
const arKeys = getKeys(ar);

const missingInAr = enKeys.filter(k => !arKeys.includes(k));
const missingInEn = arKeys.filter(k => !enKeys.includes(k));

console.log('Missing in ar.json:', JSON.stringify(missingInAr, null, 2));
console.log('Missing in en.json:', JSON.stringify(missingInEn, null, 2));
