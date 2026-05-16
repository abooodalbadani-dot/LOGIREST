const fs = require('fs');

function mergeTranslations(filePath) {
  console.log(`Analyzing ${filePath}...`);
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Custom parser to handle duplicate keys and merge them
  // Since standard JSON.parse() will just overwrite, we need to manually process the top-level keys.
  
  let merged = {};
  
  // Simple regex-based splitting for top-level keys
  // This assumes the file is well-formatted with 2-space indentation for top-level keys
  const lines = content.split('\n');
  let currentKey = null;
  let currentBlock = [];
  let braceCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (i === 0 || i === lines.length - 1) continue; // Skip { and }
    
    // Detect top-level key: "key": { or "key": "value"
    const match = line.match(/^  "([^"]+)":\s*(.*)$/);
    
    if (match && braceCount === 0) {
      // If we were processing a previous block, save it
      if (currentKey) {
        saveBlock(merged, currentKey, currentBlock.join('\n'));
      }
      
      currentKey = match[1];
      const rest = match[2];
      
      if (rest.startsWith('{')) {
        braceCount = (rest.match(/\{/g) || []).length - (rest.match(/\}/g) || []).length;
        currentBlock = [rest];
      } else {
        // Simple value
        saveBlock(merged, currentKey, rest.replace(/,$/, ''));
        currentKey = null;
        currentBlock = [];
      }
    } else if (currentKey) {
      currentBlock.push(line);
      braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      
      if (braceCount === 0) {
        // End of object block
        saveBlock(merged, currentKey, currentBlock.join('\n').replace(/,$/, ''));
        currentKey = null;
        currentBlock = [];
      }
    }
  }
  
  // Final save if needed
  if (currentKey) {
    saveBlock(merged, currentKey, currentBlock.join('\n').replace(/,$/, ''));
  }

  // Convert merged object back to JSON
  const finalContent = JSON.stringify(merged, null, 2);
  fs.writeFileSync(filePath + '.fixed', finalContent);
  console.log(`Saved fixed version to ${filePath}.fixed`);
}

function saveBlock(obj, key, valueStr) {
  let value;
  try {
    value = JSON.parse(valueStr);
  } catch (e) {
    // If it fails to parse, it might be because it's not a complete JSON (unlikely in this context)
    // or it has trailing commas that we didn't strip correctly.
    // Let's try to fix common trailing comma issues
    try {
        value = JSON.parse(valueStr.trim().replace(/,\s*([\]}])/g, '$1'));
    } catch (e2) {
        console.error(`Failed to parse value for key "${key}":`, e2.message);
        console.error('Value string preview:', valueStr.substring(0, 100));
        return;
    }
  }

  if (obj[key]) {
    console.log(`Merging duplicate key: ${key}`);
    if (typeof obj[key] === 'object' && typeof value === 'object' && !Array.isArray(obj[key])) {
      obj[key] = deepMerge(obj[key], value);
    } else {
      console.log(`Overwriting ${key} (non-object or array)`);
      obj[key] = value;
    }
  } else {
    obj[key] = value;
  }
}

function deepMerge(target, source) {
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

const args = process.argv.slice(2);
args.forEach(mergeTranslations);
