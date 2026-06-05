const fs = require('fs');
const p = 'apps/web/src/infrastructure/mock/mock-api.adapter.ts';
if(fs.existsSync(p)){
  let c = fs.readFileSync(p, 'utf8');
  
  // Fix HydrationLine definition in mock-api.adapter.ts
  c = c.replace(/item_id: string;/g, 'itemId: string;');
  
  // Fix usages of lotNumber, warehouseId, itemId inside Lot creations
  c = c.replace(/lotNumber: lot\.lot_number/g, 'lot_number: lot.lot_number');
  c = c.replace(/lotNumber: l\.lot_number/g, 'lot_number: l.lot_number');
  
  // We can just fix the missing timestamp in Transfer, PR, PO by replacing them with created_at or something?
  // Wait, the errors were: "Property 'timestamp' does not exist on type '{ status: "DRAFT" | "STARTED" ... }'"
  // Ah! "timestamp" was replaced from "postedAt" in my previous script globally!
  // I replaced `postedAt:` with `timestamp:`! But StocktakeSession uses `postedAt`. So I broke StocktakeSession!
  // I need to change `timestamp: new Date().toISOString()` back to `postedAt:` for StocktakeSession.
  c = c.replace(/timestamp: new Date\(\)\.toISOString\(\),\n\s*postedBy:/g, 'postedAt: new Date().toISOString(),\n        postedBy:');
  
  // For Transfer, PR, PO:
  c = c.replace(/timestamp: new Date\(\)\.toISOString\(\)/g, 'postedAt: new Date().toISOString()');
  
  // Now I will fix the remaining `Lot` property issues:
  // "src/infrastructure/mock/mock-api.adapter.ts(757,20): error TS2551: Property 'warehouseId' does not exist on type 'Lot'."
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
  
  fs.writeFileSync(p, c);
}
