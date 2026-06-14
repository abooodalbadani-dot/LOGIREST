const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else {
      if (filePath.endsWith('.controller.ts')) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const controllers = walk('apps/api/src/modules/master-data');

controllers.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Find CreateXxxDto and UpdateXxxDto usages
  const createMatch = content.match(/@Body\(\) \w+: (Create\w+Dto)/);
  const updateMatch = content.match(/@Body\(\) \w+: (Update\w+Dto)/);
  
  if (createMatch || updateMatch) {
    const createDto = createMatch ? createMatch[1] : null;
    const updateDto = updateMatch ? updateMatch[1] : null;
    
    const hasImport = content.includes(createDto) && content.match(new RegExp(`import.*${createDto}`));
    
    if (!hasImport && createDto) {
      // Find the folder name for dto.
      // E.g., CreateCategoryDto -> category.dto
      // CreateSupplierDto -> supplier.dto
      // CreateItemDto -> item.dto
      // CreateUomDto -> uom.dto
      let baseName = createDto.replace('Create', '').replace('Dto', '').toLowerCase();
      if (baseName === 'category') baseName = 'category';
      if (baseName === 'supplier') baseName = 'supplier';
      if (baseName === 'item') baseName = 'item';
      if (baseName === 'uom') baseName = 'uom';
      if (baseName === 'warehouse') baseName = 'warehouse';
      if (baseName === 'branch') baseName = 'branch';
      if (baseName === 'department') baseName = 'department';
      if (baseName === 'currency') baseName = 'currency';

      const importStr = `import { ${createDto}, ${updateDto || ''} } from './dto/${baseName}.dto';\n`;
      
      // Inject after other imports
      const lines = content.split('\n');
      let lastImportIdx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          lastImportIdx = i;
        }
      }
      
      if (lastImportIdx !== -1) {
        lines.splice(lastImportIdx + 1, 0, importStr.replace(',  }', ' }'));
        fs.writeFileSync(file, lines.join('\n'));
        console.log(`Fixed imports in ${file}`);
      }
    }
  }
});
