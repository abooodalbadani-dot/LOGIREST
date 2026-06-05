const fs = require('fs');
const p = 'apps/web/src/infrastructure/mock/mock-api.adapter.ts';
if(fs.existsSync(p)){
  let c = fs.readFileSync(p, 'utf8');

  c = c.replace(/item_id: item\.id/g, 'itemId: item.id');
  c = c.replace(/item_name: item\.name_en/g, 'itemName: item.name_en');
  c = c.replace(/snapshot_qty: itemLot\?\.qty_available \|\| 0/g, 'snapshotQty: itemLot?.qty_available || 0');
  c = c.replace(/counted_qty: null/g, 'countedQty: null');
  c = c.replace(/variance_reason: null/g, 'varianceReason: null');
  c = c.replace(/unit_cost: item\.unit_cost \|\| 0/g, 'unitCost: item.unit_cost || 0');

  c = c.replace(/to_warehouse_id/g, 'toWarehouseId');
  c = c.replace(/received_qty/g, 'receivedQty');
  c = c.replace(/shipped_qty/g, 'shippedQty');

  c = c.replace(/transfer_status/g, 'transferStatus');
  
  c = c.replace(/session_number:/g, 'sessionNumber:');
  c = c.replace(/session_name:/g, 'sessionName:');
  
  c = c.replace(/warehouse_id:/g, 'warehouseId:');
  // revert for Lot:
  c = c.replace(/warehouseId: session\.warehouseId/g, 'warehouse_id: session.warehouseId');
  c = c.replace(/warehouseId: grn\.warehouseId/g, 'warehouse_id: grn.warehouseId');
  c = c.replace(/warehouseId: 'wh-1'/g, 'warehouse_id: \'wh-1\'');
  
  c = c.replace(/snapshot_at:/g, 'snapshotAt:');
  c = c.replace(/created_at:/g, 'createdAt:');
  c = c.replace(/updated_at:/g, 'updatedAt:');
  
  c = c.replace(/counted_qty:/g, 'countedQty:');
  
  c = c.replace(/lot\.itemId/g, 'lot.item_id');
  c = c.replace(/lot\.warehouseId/g, 'lot.warehouse_id');
  
  c = c.replace(/document_number:/g, 'documentNumber:');

  fs.writeFileSync(p, c);
}
