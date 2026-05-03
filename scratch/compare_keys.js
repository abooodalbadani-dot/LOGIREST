
const fs = require('fs');

function getKeys(obj, prefix = '') {
  let keys = [];
  for (let key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getKeys(obj[key], prefix + key + '.'));
    } else {
      keys.push(prefix + key);
    }
  }
  return keys;
}

const en = JSON.parse(fs.readFileSync('e:/Kitchen‑Store Inventory System/messages/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('e:/Kitchen‑Store Inventory System/messages/ar.json', 'utf8'));

const enKitchenKeys = getKeys(en.operations.kitchen_request);
const arKitchenKeys = getKeys(ar.operations.kitchen_request);

console.log('--- Keys in EN but not AR ---');
enKitchenKeys.forEach(k => {
  if (!arKitchenKeys.includes(k)) console.log(k);
});

console.log('--- Keys in AR but not EN ---');
arKitchenKeys.forEach(k => {
  if (!enKitchenKeys.includes(k)) console.log(k);
});

const enCommonStatusKeys = getKeys(en.common.status);
const arCommonStatusKeys = getKeys(ar.common.status);

console.log('--- Common Status Keys in EN but not AR ---');
enCommonStatusKeys.forEach(k => {
  if (!arCommonStatusKeys.includes(k)) console.log(k);
});

console.log('--- Common Status Keys in AR but not EN ---');
arCommonStatusKeys.forEach(k => {
  if (!enCommonStatusKeys.includes(k)) console.log(k);
});
