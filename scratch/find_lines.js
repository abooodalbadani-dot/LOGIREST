const fs = require('fs');

function findKeys(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split(/\r?\n/);
  console.log(`=== File: ${filepath} ===`);
  let operationsStart = -1;
  let issueStart = -1;
  let issueEnd = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('"operations": {')) {
      operationsStart = i + 1;
      console.log(`"operations": { found at line ${operationsStart}`);
    }
    if (operationsStart !== -1 && line.includes('"issue": {')) {
      issueStart = i + 1;
      console.log(`"issue": { found at line ${issueStart}`);
    }
  }
}

findKeys('apps/web/messages/en.json');
findKeys('apps/web/messages/ar.json');
