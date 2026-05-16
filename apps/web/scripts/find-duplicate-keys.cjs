/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');

function findDuplicates(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(content);
  const duplicates = [];

  function checkKeys(obj, prefix = '') {
    for (const key in obj) {
      const fullKey = prefix + key;
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (key !== snakeKey && obj.hasOwnProperty(snakeKey)) {
        duplicates.push(`${fullKey} AND ${prefix + snakeKey}`);
      }
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        checkKeys(obj[key], fullKey + '.');
      }
    }
  }

  checkKeys(json);
  return duplicates;
}

const enPath = 'e:/Kitchen‑Store Inventory System/apps/web/messages/en.json';
const arPath = 'e:/Kitchen‑Store Inventory System/apps/web/messages/ar.json';

console.log('Duplicates in en.json:');
console.log(findDuplicates(enPath));

console.log('\nDuplicates in ar.json:');
console.log(findDuplicates(arPath));
