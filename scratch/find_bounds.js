const fs = require('fs');

function findObjectBounds(filePath, keyName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let startLine = -1;
  let indent = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(\s+)"([^"]+)":\s*\{/);
    if (match && match[2] === keyName) {
      startLine = i + 1;
      indent = match[1].length;
      break;
    }
  }
  
  if (startLine === -1) {
    console.log(`Key "${keyName}" not found in ${filePath}`);
    return;
  }
  
  let endLine = -1;
  const closingBrace = ' '.repeat(indent) + '}';
  const closingBraceWithComma = ' '.repeat(indent) + '},';
  
  for (let i = startLine; i < lines.length; i++) {
    if (lines[i].trim() === '}' || lines[i].trim() === '},') {
      const currentIndent = lines[i].search(/\S/);
      if (currentIndent === indent) {
        endLine = i + 1;
        break;
      }
    }
  }
  
  console.log(`${keyName} in ${filePath}: Lines ${startLine} to ${endLine}`);
}

findObjectBounds('apps/web/messages/ar.json', 'master_data');
findObjectBounds('apps/web/messages/en.json', 'master_data');
