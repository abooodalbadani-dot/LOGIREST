const fs = require('fs');
const p = 'apps/web/src/infrastructure/mock/mock-api.adapter.ts';
if(fs.existsSync(p)){
  let c = fs.readFileSync(p, 'utf8');

  // Fix transactions
  c = c.replace(/item_id: l\.item_id/g, 'itemId: l.item_id');
  c = c.replace(/item_id: l\.itemId/g, 'itemId: l.itemId');
  
  c = c.replace(/timestamp: new Date\(\)\.toISOString\(\)/g, 'postedAt: new Date().toISOString()');
  
  c = c.replace(/timestamp: /g, 'createdAt: '); // Fallback for some properties
  
  // sessionName, snapshotAt
  c = c.replace(/session_name: /g, 'sessionName: ');
  c = c.replace(/snapshot_at: /g, 'snapshotAt: ');
  
  // Lot creations missing warehouse_id instead of warehouseId
  c = c.replace(/warehouseId: session.warehouseId/g, 'warehouse_id: session.warehouseId');
  c = c.replace(/itemId: sessionLines\[i\]\.itemId/g, 'item_id: sessionLines[i].itemId');
  c = c.replace(/itemId: sessionLines\[i\]\.item_id/g, 'item_id: sessionLines[i].itemId');
  c = c.replace(/itemId: line\.item_id/g, 'item_id: line.item_id');
  c = c.replace(/itemId: line\.itemId/g, 'item_id: line.itemId');
  
  c = c.replace(/item_id: sessionLines\[i\]\.item_id/g, 'itemId: sessionLines[i].itemId');
  c = c.replace(/item_id: line.item_id/g, 'itemId: line.itemId');
  c = c.replace(/item_id: line\.itemId/g, 'itemId: line.itemId');
  
  fs.writeFileSync(p, c);
}
