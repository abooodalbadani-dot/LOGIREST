const fs = require('fs');
const content = fs.readFileSync('./apps/web/messages/ar.json', 'utf8');

// Simple regex to find top-level and second-level keys
// This is not perfect but should show duplicates in common
const lines = content.split('\n');
const keys = {};

lines.forEach((line, i) => {
  const match = line.match(/^\s*\"(\w+)\":/);
  if (match) {
    const key = match[1];
    if (!keys[key]) keys[key] = [];
    keys[key].push(i + 1);
  }
});

for (const key in keys) {
  if (keys[key].length > 1) {
    console.log(`Duplicate key "${key}" found at lines: ${keys[key].join(', ')}`);
  }
}
