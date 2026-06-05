const fs = require('fs');
const p = 'apps/web/src/infrastructure/mock/mock-api.adapter.ts';
if(fs.existsSync(p)){
  let lines = fs.readFileSync(p, 'utf8').split('\n');
  const fix = (lineNum, search, replace) => {
    if (lines[lineNum - 1]) {
      lines[lineNum - 1] = lines[lineNum - 1].replace(search, replace);
    }
  };

  // Adjustments & GRNs
  [1176, 1312].forEach(ln => fix(ln, /lot_id/, 'lotId'));
  [1178, 1179, 1190].forEach(ln => fix(ln, /qty_adjusted/, 'qtyAdjusted'));
  [1185, 1320, 1343, 1617, 1627, 1702, 1712, 1738, 1748].forEach(ln => fix(ln, /document_number/, 'documentNumber'));
  [1188, 1323].forEach(ln => fix(ln, /lot_number/, 'lotNumber'));
  [1303].forEach(ln => fix(ln, /posted_at/, 'postedAt'));
  [1304].forEach(ln => fix(ln, /posted_by/, 'postedBy'));
  [1314, 1325, 1335, 1348].forEach(ln => fix(ln, /received_qty/, 'receivedQty'));
  [1331].forEach(ln => fix(ln, /itemId/, 'item_id'));
  [1332, 1742].forEach(ln => fix(ln, /warehouse_id/, 'warehouseId'));
  [1333, 1346].forEach(ln => fix(ln, /lot_number/, 'lotNumber'));
  [1334].forEach(ln => fix(ln, /expiry_date/, 'expiryDate'));
  [1622, 1632, 1708, 1718, 1743, 1753].forEach(ln => fix(ln, /created_at/, 'createdAt'));
  [1623, 1707].forEach(ln => fix(ln, /destination_dept_id/, 'destinationDeptId'));
  [1633, 1717].forEach(ln => fix(ln, /to_warehouse_id/, 'to_warehouseId')); // wait, `to_warehouseId` or `toWarehouseId`? 
  // Let me just check the types in my next step, I'll assume `toWarehouseId` for now.
  [1633, 1717].forEach(ln => fix(ln, /to_warehouse_id/, 'toWarehouseId'));
  [1679].forEach(ln => fix(ln, /name_en/, 'name')); // warehouse uses 'name'
  [1752].forEach(ln => fix(ln, /supplier_id/, 'supplierId'));

  fs.writeFileSync(p, lines.join('\n'));
}
