import fs from 'fs';
import path from 'path';

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

const enPath = path.resolve('messages/en.json');
const arPath = path.resolve('messages/ar.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const enKeys = getKeys(en);
const arKeys = getKeys(ar);

const missingInAr = enKeys.filter(key => !arKeys.includes(key));
const missingInEn = arKeys.filter(key => !enKeys.includes(key));

console.log('--- Missing in ar.json ---');
missingInAr.forEach(key => {
  if (key.startsWith('procurement') || key.startsWith('operations')) {
    console.log(key);
  }
});

console.log('\n--- Missing in en.json ---');
missingInEn.forEach(key => {
  if (key.startsWith('procurement') || key.startsWith('operations')) {
    console.log(key);
  }
});
