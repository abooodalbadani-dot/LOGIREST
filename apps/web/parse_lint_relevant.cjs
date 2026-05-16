const fs = require('fs');
const path = require('path');

const results = JSON.parse(fs.readFileSync('lint_results_utf8.json', 'utf8').replace(/^\uFEFF/, ''));

const relevantDirs = ['(procurement)', 'inventory', 'master-data'];

const filteredResults = results.filter(file => {
  const filePath = file.filePath.replace(/\\/g, '/');
  return relevantDirs.some(dir => filePath.includes(dir));
}).map(file => ({
  filePath: file.filePath,
  messages: file.messages.filter(msg => msg.severity === 1) // Only warnings
})).filter(file => file.messages.length > 0);

console.log(JSON.stringify(filteredResults, null, 2));
