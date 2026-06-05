const fs = require('fs');

// Fix stocktakeMapper
const mapperPath = 'apps/web/src/features/operations/mappers/stocktakeMapper.ts';
if(fs.existsSync(mapperPath)){
  let m = fs.readFileSync(mapperPath, 'utf8');
  m = m.replace(/created_at:/g, 'createdAt:');
  m = m.replace(/updated_at:/g, 'updatedAt:');
  m = m.replace(/audit_log:/g, 'auditLog:');
  fs.writeFileSync(mapperPath, m);
}

// Fix mock-api.adapter.ts
const p = 'apps/web/src/infrastructure/mock/mock-api.adapter.ts';
if(fs.existsSync(p)){
  let lines = fs.readFileSync(p, 'utf8').split('\n');
  const fix = (lineNum, search, replace) => {
    if (lines[lineNum - 1]) {
      lines[lineNum - 1] = lines[lineNum - 1].replace(search, replace);
    }
  };

  [50].forEach(ln => fix(ln, /posted_at/, 'timestamp'));
  [69].forEach(ln => fix(ln, /item_id/, 'itemId'));
  [71].forEach(ln => fix(ln, /as PRLineItem & \{ req_qty: number; \}/, 'as any'));
  [93].forEach(ln => fix(ln, /requested_by_dept/, 'requestedByDept'));
  [94].forEach(ln => fix(ln, /required_by_date/, 'requiredByDate'));
  [664].forEach(ln => fix(ln, /lot_id/, 'lotId'));
  [666, 677].forEach(ln => fix(ln, /allocated_qty/, 'allocatedQty'));
  [675, 749, 772].forEach(ln => fix(ln, /lotNumber/g, 'lot_number'));
  [796].forEach(ln => fix(ln, /lot_number/g, 'lotNumber')); 
  
  [758].forEach(ln => fix(ln, /itemId: l\.itemId/, 'item_id: l.item_id'));
  [778].forEach(ln => { fix(ln, /itemId:/, 'item_id:'); fix(ln, /warehouseId:/, 'warehouse_id:'); });
  [853].forEach(ln => fix(ln, /warehouseId/g, 'warehouse_id'));
  
  for(let i = 890; i < 915; i++) {
     if(lines[i]) {
       lines[i] = lines[i].replace(/item_id:/g, 'itemId:');
       lines[i] = lines[i].replace(/item_name:/g, 'itemName:');
       lines[i] = lines[i].replace(/snapshot_qty:/g, 'snapshotQty:');
       lines[i] = lines[i].replace(/unit_cost:/g, 'unitCost:');
     }
  }
  
  [974].forEach(ln => { fix(ln, /item_id:/, 'itemId:'); fix(ln, /warehouse_id:/, 'warehouseId:'); });
  [1332].forEach(ln => fix(ln, /warehouse_id/g, 'warehouseId'));
  [1333].forEach(ln => fix(ln, /lotNumber/g, 'lot_number'));

  fs.writeFileSync(p, lines.join('\n'));
}
