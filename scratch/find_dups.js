const fs = require('fs');
const path = require('path');

function findDuplicateKeys(jsonString) {
    const lines = jsonString.split('\n');
    const stack = [{}];
    const duplicates = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/"([^"]+)":/);
        if (match) {
            const key = match[1];
            const currentLevel = stack[stack.length - 1];
            if (currentLevel[key]) {
                duplicates.push({ key, line: i + 1, prevLine: currentLevel[key] });
            }
            currentLevel[key] = i + 1;
        }
        
        if (line.includes('{')) {
            stack.push({});
        }
        if (line.includes('}')) {
            stack.pop();
        }
    }
    return duplicates;
}

const arPath = path.join('E:', 'Kitchen‑Store Inventory System', 'apps', 'web', 'messages', 'ar.json');
const content = fs.readFileSync(arPath, 'utf8');
const dups = findDuplicateKeys(content);

if (dups.length > 0) {
    console.log('Duplicate keys found:');
    dups.forEach(d => console.log(`Key "${d.key}" on line ${d.line} already appeared on line ${d.prevLine}`));
} else {
    console.log('No duplicate keys found (at the same level).');
}
