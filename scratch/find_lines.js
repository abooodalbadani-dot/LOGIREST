const fs = require('fs');

function findLines(lang) {
  const filePath = `apps/web/messages/${lang}.json`;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  
  let commonStart = -1;
  let fieldsStart = -1;
  let inCommon = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('"common": {')) {
      commonStart = i + 1;
      inCommon = true;
    }
    if (inCommon && line.includes('"fields": {')) {
      fieldsStart = i + 1;
      break;
    }
  }
  
  console.log(`${lang}.json: "common" starts at line ${commonStart}, nested "fields" starts at line ${fieldsStart}`);
  if (fieldsStart !== -1) {
    for (let j = fieldsStart - 1; j < fieldsStart + 10; j++) {
      console.log(`  ${j+1}: ${lines[j]}`);
    }
  }
}

findLines('en');
findLines('ar');
