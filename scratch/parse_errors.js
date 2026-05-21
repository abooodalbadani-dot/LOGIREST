const fs = require('fs');
const content = fs.readFileSync('C:\\\\Users\\\\Qursan\\\\.gemini\\\\antigravity-ide\\\\brain\\\\880336e9-458d-41e2-94a6-6ce342a1295f\\\\.system_generated\\\\tasks\\\\task-485.log', 'utf8');

const lines = content.split('\n');
console.log('--- ESLINT ERRORS ---');
let currentFile = '';
lines.forEach(line => {
  if (line.includes('E:\\Kitchen‑Store Inventory System')) {
    currentFile = line.trim();
  }
  if (line.includes('error') && !line.includes('npm error')) {
    console.log(`${currentFile}\n  ${line.trim()}`);
  }
});
