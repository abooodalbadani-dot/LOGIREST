const fs = require('fs');
const p = 'apps/web/src/infrastructure/mock/seeds/master-data.seed.ts';
if(fs.existsSync(p)){
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/warehouse_id:/g, 'warehouseId:');
  c = c.replace(/branch_id:/g, 'branchId:');
  c = c.replace(/name_ar: 'Main Branch', name_en: 'Main Branch'/g, "name: 'Main Branch'");
  c = c.replace(/name_ar: 'Riyadh Branch', name_en: 'Riyadh Branch'/g, "name: 'Riyadh Branch'");
  c = c.replace(/name_ar: 'Jeddah Branch', name_en: 'Jeddah Branch'/g, "name: 'Jeddah Branch'");
  c = c.replace(/name_ar: 'Main Warehouse', name_en: 'Main Warehouse'/g, "name: 'Main Warehouse'");
  c = c.replace(/name_ar: 'Dry Store', name_en: 'Dry Store'/g, "name: 'Dry Store'");
  c = c.replace(/name_ar: 'Cold Store', name_en: 'Cold Store'/g, "name: 'Cold Store'");
  c = c.replace(/name_ar: 'Central Kitchen', name_en: 'Central Kitchen'/g, "name: 'Central Kitchen'");
  c = c.replace(/name_ar: 'Hot Kitchen', name_en: 'Hot Kitchen'/g, "name: 'Hot Kitchen'");
  c = c.replace(/name_ar: 'Pastry Kitchen', name_en: 'Pastry Kitchen'/g, "name: 'Pastry Kitchen'");
  fs.writeFileSync(p, c);
}
