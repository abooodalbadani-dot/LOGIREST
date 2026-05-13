const fs = require('fs');

function findDuplicates(filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const lines = content.split('\n');
  const keyRegex = /"([^"]+)":/;
  const stack = [{}];
  let currentLevel = stack[0];
  const duplicates = [];

  lines.forEach((line, index) => {
    const match = line.match(keyRegex);
    if (match) {
      const key = match[1];
      if (currentLevel[key]) {
        duplicates.push({ key, line: index + 1 });
      } else {
        currentLevel[key] = true;
      }
    }
    // Very simple nesting detection based on braces
    if (line.includes('{')) stack.push({});
    if (line.includes('}')) stack.pop();
    currentLevel = stack[stack.length - 1] || {};
  });

  return duplicates;
}

console.log('Duplicates in en.json:', findDuplicates('apps/web/messages/en.json'));
console.log('Duplicates in ar.json:', findDuplicates('apps/web/messages/ar.json'));
