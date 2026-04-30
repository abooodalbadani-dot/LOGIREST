
const fs = require('fs');
const path = require('path');

const arPath = path.join(process.cwd(), 'messages', 'ar.json');
const content = fs.readFileSync(arPath, 'utf8');

function findDuplicates(jsonStr) {
  const lines = jsonStr.split('\n');
  const keys = [];
  const duplicates = [];
  
  lines.forEach((line, index) => {
    const match = line.match(/"([^"]+)":/);
    if (match) {
      const key = match[1];
      if (keys.includes(key)) {
        duplicates.push({ key, line: index + 1 });
      }
      keys.push(key);
    }
  });
  
  return duplicates;
}

const duplicates = findDuplicates(content);
if (duplicates.length > 0) {
  console.log('Found duplicates:');
  duplicates.forEach(d => console.log(`Key "${d.key}" at line ${d.line}`));
} else {
  console.log('No duplicates found.');
}
