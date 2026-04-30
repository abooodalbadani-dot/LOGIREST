const fs = require('fs');

const en = JSON.parse(fs.readFileSync('messages/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('messages/ar.json', 'utf8'));

function compare(enObj, arObj, path = '') {
  const missingInAr = [];
  const missingInEn = [];

  for (const key in enObj) {
    if (!(key in arObj)) {
      missingInAr.push(path + key);
    } else if (typeof enObj[key] === 'object' && !Array.isArray(enObj[key])) {
      const subDiff = compare(enObj[key], arObj[key], path + key + '.');
      missingInAr.push(...subDiff.missingInAr);
      missingInEn.push(...subDiff.missingInEn);
    }
  }

  for (const key in arObj) {
    if (!(key in enObj)) {
      missingInEn.push(path + key);
    }
  }

  return { missingInAr, missingInEn };
}

const diff = compare(en.operations.stocktake, ar.operations.stocktake, 'operations.stocktake.');
console.log('Missing in AR:', diff.missingInAr);
console.log('Missing in EN:', diff.missingInEn);
