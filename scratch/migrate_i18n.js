const fs = require('fs');
const path = require('path');

const locales = ['ar', 'en'];
const messagesDir = path.join(__dirname, '../apps/web/messages');

locales.forEach(locale => {
  const filePath = path.join(messagesDir, `${locale}.json`);
  let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // 1. Consolidation of 'common' root object
  // Merge master_data.common into root common
  if (data.master_data && data.master_data.common) {
    data.common = { ...data.common, ...data.master_data.common };
    delete data.master_data.common;
  }

  // 2. Consolidation of 'status' and 'statuses'
  // If 'statuses' exists, merge it into 'status'
  if (data.common.statuses) {
    data.common.status = { ...data.common.status, ...data.common.statuses };
    delete data.common.statuses;
  }

  // 3. Move sync information to common.sync_info
  // Look for live_updates, last_sync which might be in common.status or common.dashboard
  const syncKeys = ['live_updates', 'last_sync'];
  data.common.sync_info = data.common.sync_info || {};
  
  if (data.common.status) {
    syncKeys.forEach(key => {
      if (data.common.status[key]) {
        data.common.sync_info[key] = data.common.status[key];
        delete data.common.status[key];
      }
    });
  }

  // 4. Consolidate Unit of Measure (UoM)
  // We want common.uom to be an object if it has multiple properties, or keep it as a string if it's just the label.
  // The user wants to consolidate common.units, common.uoms, master_data.uom, master_data.uoms, inventory.uoms.
  
  // Create a new uom structure
  const unifiedUom = {
    label: data.common.uom || (data.master_data && data.master_data.uom && data.master_data.uom.title) || "Unit of Measure",
    units: { ...data.common.units, ...data.common.uoms },
    // Add other properties from master_data.uom if it was an object
    ...(typeof data.master_data?.uom === 'object' ? data.master_data.uom : {})
  };
  
  // If inventory.uoms exists, merge it too
  if (data.inventory && data.inventory.uoms) {
    unifiedUom.units = { ...unifiedUom.units, ...data.inventory.uoms };
    delete data.inventory.uoms;
  }
  
  // If master_data.uoms exists, merge it
  if (data.master_data && data.master_data.uoms) {
     unifiedUom.units = { ...unifiedUom.units, ...data.master_data.uoms };
     delete data.master_data.uoms;
  }

  // Clean up old uom related keys
  delete data.common.units;
  delete data.common.uoms;
  if (data.master_data) {
    delete data.master_data.uom;
    delete data.master_data.uoms;
  }
  
  // Set the unified uom
  data.common.uom = unifiedUom;

  // 5. Dashboard clean-up
  if (data.dashboard && data.dashboard.kpi) {
    if (data.dashboard.kpi.low_stock_items) {
      data.dashboard.kpi.low_stock = data.dashboard.kpi.low_stock_items;
      delete data.dashboard.kpi.low_stock_items;
    }
  }

  // Save back
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Consolidated ${locale}.json`);
});
