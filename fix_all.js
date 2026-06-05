const fs = require('fs');
const p = 'apps/web/src/infrastructure/mock/mock-api.adapter.ts';
if(fs.existsSync(p)){
  let c = fs.readFileSync(p, 'utf8');
  
  // Script 1 logic
  c = c.replace(/item_id: string;/g, 'itemId: string;');
  c = c.replace(/lotNumber: lot\.lot_number/g, 'lot_number: lot.lot_number');
  c = c.replace(/lotNumber: l\.lot_number/g, 'lot_number: l.lot_number');
  c = c.replace(/timestamp: new Date\(\)\.toISOString\(\),\n\s*postedBy:/g, 'postedAt: new Date().toISOString(),\n        postedBy:');
  c = c.replace(/timestamp: new Date\(\)\.toISOString\(\)/g, 'postedAt: new Date().toISOString()');
  c = c.replace(/warehouseId: (.*),\n\s*itemId: (.*),\n\s*lotNumber: (.*),\n\s*expiryDate: (.*),\n\s*qtyAvailable: (.*),/g, 
    'warehouse_id: $1,\n          item_id: $2,\n          lot_number: $3,\n          expiry_date: $4,\n          qty_available: $5,');
  c = c.replace(/warehouseId: lot\.warehouseId/g, 'warehouse_id: lot.warehouse_id');
  c = c.replace(/itemId: lot\.itemId/g, 'item_id: lot.item_id');
  c = c.replace(/lotNumber: lot\.lot_number/g, 'lot_number: lot.lot_number');
  c = c.replace(/expiryDate: lot\.expiry_date/g, 'expiry_date: lot.expiry_date');
  c = c.replace(/warehouseId: l\.warehouseId/g, 'warehouse_id: l.warehouse_id');
  c = c.replace(/itemId: l\.itemId/g, 'item_id: l.item_id');
  c = c.replace(/session_name:/g, 'sessionName:');
  c = c.replace(/snapshot_at:/g, 'snapshotAt:');
  
  // Script 2 logic
  c = c.replace(/item_id: l\.item_id/g, 'itemId: l.item_id');
  c = c.replace(/item_id: l\.itemId/g, 'itemId: l.itemId');
  c = c.replace(/timestamp: new Date\(\)\.toISOString\(\)/g, 'postedAt: new Date().toISOString()');
  c = c.replace(/timestamp: /g, 'createdAt: '); 
  c = c.replace(/session_name: /g, 'sessionName: ');
  c = c.replace(/snapshot_at: /g, 'snapshotAt: ');
  c = c.replace(/warehouseId: session.warehouseId/g, 'warehouse_id: session.warehouseId');
  c = c.replace(/itemId: sessionLines\[i\]\.itemId/g, 'item_id: sessionLines[i].itemId');
  c = c.replace(/itemId: sessionLines\[i\]\.item_id/g, 'item_id: sessionLines[i].itemId');
  c = c.replace(/itemId: line\.item_id/g, 'item_id: line.item_id');
  c = c.replace(/itemId: line\.itemId/g, 'item_id: line.itemId');
  c = c.replace(/item_id: sessionLines\[i\]\.item_id/g, 'itemId: sessionLines[i].itemId');
  c = c.replace(/item_id: line.item_id/g, 'itemId: line.itemId');
  c = c.replace(/item_id: line\.itemId/g, 'itemId: line.itemId');
  
  // Precision fix logic
  let lines = c.split('\n');
  const fix = (lineNum, search, replace) => {
    if (lines[lineNum - 1]) {
      lines[lineNum - 1] = lines[lineNum - 1].replace(search, replace);
    }
  };

  [153, 211, 292, 749, 759, 772, 782, 796].forEach(ln => fix(ln, /lotNumber/, 'lot_number'));
  fix(759, /lotNumber/, 'lot_number'); 
  [154, 186, 212, 293, 783].forEach(ln => fix(ln, /expiryDate/, 'expiry_date'));
  fix(187, /isExpired/, 'is_expired');
  [466, 472, 757, 865].forEach(ln => fix(ln, /warehouseId/, 'warehouse_id'));
  [758, 869, 870, 974].forEach(ln => fix(ln, /itemId/, 'item_id'));
  fix(869, /itemId/, 'item_id'); 
  [45, 54, 771, 795, 1187, 1322, 1331, 1345].forEach(ln => fix(ln, /item_id/, 'itemId'));

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('export interface HydrationLine {') || lines[i].includes('interface HydrationLine {')) {
       for(let j=i; j<i+10; j++) {
         if (lines[j] && lines[j].includes('item_id:')) {
           lines[j] = lines[j].replace('item_id:', 'itemId:');
         }
       }
    }
  }

  fix(895, /item_id:/, 'itemId:');
  fix(50, /postedAt:/, 'timestamp:');
  [658, 733, 995, 1172, 1303].forEach(ln => fix(ln, /postedAt/, 'timestamp'));

  fs.writeFileSync(p, lines.join('\n'));
}
