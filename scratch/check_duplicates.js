const fs = require('fs');

function checkDuplicateRootKeys(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const rootKeys = [];
  lines.forEach((line, index) => {
    const match = line.match(/^  "([^"]+)":/);
    if (match) {
      rootKeys.push({ key: match[1], line: index + 1 });
    }
  });

  const seen = new Map();
  const duplicates = [];
  rootKeys.forEach(item => {
    if (seen.has(item.key)) {
      duplicates.push({ key: item.key, first: seen.get(item.key), second: item.line });
    } else {
      seen.set(item.key, item.line);
    }
  });

  if (duplicates.length > 0) {
    console.log(`Duplicates in ${filePath}:`);
    duplicates.forEach(d => {
      console.log(`  - Key "${d.key}" found at lines ${d.first} and ${d.second}`);
    });
  } else {
    console.log(`No duplicate root keys in ${filePath}`);
  }
}

checkDuplicateRootKeys('apps/web/messages/ar.json');
checkDuplicateRootKeys('apps/web/messages/en.json');
