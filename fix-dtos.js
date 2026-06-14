const fs = require('fs');
const path = require('path');

const controllers = [
  'categories/categories.controller.ts',
  'currencies/currencies.controller.ts',
  'fx-rates/fx-rates.controller.ts',
  'items/items.controller.ts',
  'suppliers/suppliers.controller.ts',
  'units-of-measure/uom.controller.ts',
  'warehouses/warehouses-direct.controller.ts'
];

for (const rel of controllers) {
  const filePath = path.join('apps/api/src/modules/master-data', rel);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let name = rel.split('/')[0];
  if (name === 'units-of-measure') name = 'uom';
  if (name === 'warehouses') name = 'warehouse';
  if (name === 'categories') name = 'category';
  if (name === 'currencies') name = 'currency';
  if (name === 'fx-rates') name = 'fx-rate';
  if (name === 'items') name = 'item';
  if (name === 'suppliers') name = 'supplier';
  
  const createName = 'Create' + name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, '') + 'Dto';
  const updateName = 'Update' + name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, '') + 'Dto';
  
  const dtoDir = path.join(path.dirname(filePath), 'dto');
  if (!fs.existsSync(dtoDir)) fs.mkdirSync(dtoDir);
  
  const dtoContent = "import { Allow } from 'class-validator';\n\n" +
"export class " + createName + " {\n" +
"  @Allow() name?: string;\n" +
"  @Allow() code?: string;\n" +
"  @Allow() branchId?: string;\n" +
"  @Allow() warehouseId?: string;\n" +
"  @Allow() manager?: string;\n" +
"  @Allow() costCenter?: string;\n" +
"  @Allow() category?: string;\n" +
"  @Allow() symbol?: string;\n" +
"  @Allow() isBaseCurrency?: boolean;\n" +
"  @Allow() currencyId?: string;\n" +
"  @Allow() rate?: number;\n" +
"  @Allow() effectiveDate?: string;\n" +
"  @Allow() categoryId?: string;\n" +
"  @Allow() primaryUomId?: string;\n" +
"  @Allow() trackLots?: boolean;\n" +
"  @Allow() trackExpiry?: boolean;\n" +
"  @Allow() minStockLevel?: number;\n" +
"  @Allow() reorderPoint?: number;\n" +
"  @Allow() lastPurchasePrice?: number;\n" +
"  @Allow() email?: string;\n" +
"  @Allow() phone?: string;\n" +
"  @Allow() taxNumber?: string;\n" +
"  @Allow() paymentTerms?: string;\n" +
"  @Allow() type?: string;\n" +
"  @Allow() isActive?: boolean;\n" +
"}\n\n" +
"export class " + updateName + " extends " + createName + " {\n" +
"  @Allow() version?: number;\n" +
"}\n";

  const dtoFile = path.join(dtoDir, name + '.dto.ts');
  fs.writeFileSync(dtoFile, dtoContent);
  
  // Replace Record<string, unknown> with the Create/Update DTO
  // Need to only replace the first occurrence in create() and update()
  content = content.replace(/create\([\s\S]*?@Body\(\)\s+\w+:\s+Record<string,\s*unknown>/, (m) => m.replace(/Record<string,\s*unknown>/, createName));
  content = content.replace(/update\([\s\S]*?@Body\(\)\s+\w+:\s+Record<string,\s*unknown>/, (m) => m.replace(/Record<string,\s*unknown>/, updateName));
  
  // Add import if not present
  if (!content.includes(createName)) {
      const importLine = "import { " + createName + ", " + updateName + " } from './dto/" + name + ".dto';\n";
      content = importLine + content;
  }
  
  fs.writeFileSync(filePath, content);
  console.log('Fixed', rel);
}
