const fs = require('fs');
const path = require('path');

const dir = 'apps/api/src/modules/master-data';
const services = [];

function walk(dir) {
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      walk(filePath);
    } else if (filePath.endsWith('.service.ts')) {
      services.push(filePath);
    }
  });
}
walk(dir);

services.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix ItemCreateDto / CurrencyDto etc. by adding camelCase fields.
  // Actually, let's just make the destructuring read from camelCase too.
  
  // Replace: const name = name_en || name_ar;
  content = content.replace(/const name = name_en \|\| name_ar;/g, 'const name = body.name || name_en || name_ar;');
  content = content.replace(/const name = name_en \|\| name_ar \|\|/g, 'const name = body.name || name_en || name_ar ||');
  
  // Specific to uom.service.ts
  content = content.replace(/if \(\!name_en && \!name_ar\)/g, 'if (!body.name && !name_en && !name_ar)');
  
  // Specific to items.service.ts
  if (file.includes('items.service.ts')) {
    content = content.replace(/interface ItemCreateDto \{/g, 'interface ItemCreateDto {\n  name?: string;\n  categoryId?: string;\n  primaryUomId?: string;\n  trackLots?: boolean;\n  minStockLevel?: number;\n  reorderPoint?: number;\n  isActive?: boolean;');
    
    // Replace the destructuring in create
    content = content.replace(/const \{\s*name_en,\s*name_ar,\s*category_id,\s*primary_uom_id,\s*track_lots,\s*min_stock_level,\s*reorder_point,\s*is_active,\s*barcode,\s*\} = body;/g, `const name_en = body.name_en;
    const name_ar = body.name_ar;
    const category_id = body.category_id || body.categoryId;
    const primary_uom_id = body.primary_uom_id || body.primaryUomId;
    const track_lots = body.track_lots ?? body.trackLots;
    const min_stock_level = body.min_stock_level ?? body.minStockLevel;
    const reorder_point = body.reorder_point ?? body.reorderPoint;
    const is_active = body.is_active ?? body.isActive;
    const barcode = body.barcode;`);
    
    // Replace the destructuring in update
    content = content.replace(/const \{\s*code,\s*name_en,\s*name_ar,\s*category_id,\s*primary_uom_id,\s*track_lots,\s*reorder_point,\s*is_active,\s*barcode,\s*\} = body;/g, `const code = body.code;
    const name_en = body.name_en;
    const name_ar = body.name_ar;
    const category_id = body.category_id || body.categoryId;
    const primary_uom_id = body.primary_uom_id || body.primaryUomId;
    const track_lots = body.track_lots ?? body.trackLots;
    const reorder_point = body.reorder_point ?? body.reorderPoint;
    const is_active = body.is_active ?? body.isActive;
    const barcode = body.barcode;`);
  }
  
  // Specific to suppliers.service.ts
  if (file.includes('suppliers.service.ts')) {
    content = content.replace(/interface SupplierDto \{/g, 'interface SupplierDto {\n  name?: string;\n  taxNumber?: string;\n  paymentTerms?: string;\n  isActive?: boolean;');
    
    // Replace destructuring
    content = content.replace(/const \{ name_en, name_ar, email, phone \} = body;/g, `const name_en = body.name_en;
    const name_ar = body.name_ar;
    const email = body.email;
    const phone = body.phone;`);
    
    content = content.replace(/const \{ code, name_en, name_ar, email, phone \} = body;/g, `const code = body.code;
    const name_en = body.name_en;
    const name_ar = body.name_ar;
    const email = body.email;
    const phone = body.phone;`);

    content = content.replace(/tax_number: data.tax_number/g, 'tax_number: data.tax_number || data.taxNumber');
    content = content.replace(/payment_terms: data.payment_terms/g, 'payment_terms: data.payment_terms || data.paymentTerms');
    content = content.replace(/is_active: data.is_active/g, 'is_active: data.is_active ?? data.isActive');
  }

  // Specific to uom.service.ts
  if (file.includes('uom.service.ts')) {
    content = content.replace(/interface UomDto \{/g, 'interface UomDto {\n  name?: string;\n  isActive?: boolean;');
    
    content = content.replace(/const \{ name_en, name_ar \} = body;/g, `const name_en = body.name_en; const name_ar = body.name_ar;`);
    content = content.replace(/const \{ code, name_en, name_ar \} = body;/g, `const code = body.code; const name_en = body.name_en; const name_ar = body.name_ar;`);
    content = content.replace(/is_active: data.is_active/g, 'is_active: data.is_active ?? data.isActive');
  }

  fs.writeFileSync(file, content);
});

console.log('Services patched!');
