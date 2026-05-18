const fs = require('fs');

function inspectRaw(lang) {
  const filePath = `apps/web/messages/${lang}.json`;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  console.log(`=== RAW OCCURRENCES IN ${lang}.json ===`);
  let commonStart = -1;
  let commonEnd = -1;
  let braceCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('"common": {')) {
      commonStart = i;
      braceCount = 1;
      for (let j = i + 1; j < lines.length; j++) {
        const subLine = lines[j];
        if (subLine.includes('{')) braceCount += (subLine.match(/{/g) || []).length;
        if (subLine.includes('}')) braceCount -= (subLine.match(/}/g) || []).length;
        if (braceCount === 0) {
          commonEnd = j;
          break;
        }
      }
      break;
    }
  }
  
  console.log(`"common" block is lines ${commonStart + 1} to ${commonEnd + 1}`);
  if (commonStart !== -1 && commonEnd !== -1) {
    const commonLines = lines.slice(commonStart, commonEnd + 1);
    for (let k = 0; k < commonLines.length; k++) {
      const line = commonLines[k];
      if (line.includes('"fields":') || line.includes('"fields" :')) {
        console.log(`Found "fields" block at line ${commonStart + k + 1}:`);
        // print next 10 lines
        for (let l = k; l < Math.min(k + 10, commonLines.length); l++) {
          console.log(`  ${commonStart + l + 1}: ${commonLines[l]}`);
        }
      }
    }
  }
}

inspectRaw('en');
inspectRaw('ar');
