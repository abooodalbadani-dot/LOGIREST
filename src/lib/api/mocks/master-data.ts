export const master_data_mocks: Record<string, unknown> = {
 // Branches
 'GET /branches': {
 data: [
 { id: 'br-1', code: 'BR-001', name_ar: 'الفرع الرئيسي', name_en: 'Main Branch', is_active: true, created_at: '2026-01-01T00:00:00Z' },
 { id: 'br-2', code: 'BR-002', name_ar: 'فرع الشمال', name_en: 'North Branch', is_active: true, created_at: '2026-01-02T00:00:00Z' },
 { id: 'br-3', code: 'BR-003', name_ar: 'فرع الجنوب', name_en: 'South Branch', is_active: false, created_at: '2026-01-03T00:00:00Z' }
 ],
 meta: { page: 1, page_size: 10, total: 3, total_pages: 1 }
 },
 'GET /branches/br-1': { id: 'br-1', code: 'BR-001', name_ar: 'الفرع الرئيسي', name_en: 'Main Branch', is_active: true, created_at: '2026-01-01T00:00:00Z' },
 'POST /branches': { id: 'br-new', code: 'BR-NEW', name_ar: 'فرع جديد', name_en: 'New Branch', is_active: true, created_at: new Date().toISOString() },
 'PUT /branches/br-1': { id: 'br-1', code: 'BR-001', name_ar: 'الفرع الرئيسي (معدل)', name_en: 'Main Branch (Edited)', is_active: true, created_at: '2026-01-01T00:00:00Z' },

 // Warehouses
 'GET /warehouses': {
 data: [
 { id: 'wh-1', branch_id: 'br-1', code: 'WH-001', name_ar: 'المستودع الرئيسي', name_en: 'Main Warehouse', type: 'MAIN', is_active: true },
 { id: 'wh-2', branch_id: 'br-1', code: 'WH-002', name_ar: 'مستودع التبريد', name_en: 'Cold Storage', type: 'COLD', is_active: true },
 { id: 'wh-3', branch_id: 'br-2', code: 'WH-003', name_ar: 'المستودع الجاف', name_en: 'Dry Storage', type: 'DRY', is_active: true },
 { id: 'wh-4', branch_id: 'br-3', code: 'WH-004', name_ar: 'مستودع افتراضي', name_en: 'Virtual WH', type: 'VIRTUAL', is_active: true }
 ],
 meta: { page: 1, page_size: 10, total: 4, total_pages: 1 }
 },
 'GET /warehouses/wh-1': { id: 'wh-1', branch_id: 'br-1', code: 'WH-001', name_ar: 'المستودع الرئيسي', name_en: 'Main Warehouse', type: 'MAIN', is_active: true },
 'POST /warehouses': { id: 'wh-new', branch_id: 'br-1', code: 'WH-NEW', name_ar: 'مستودع جديد', name_en: 'New WH', type: 'MAIN', is_active: true },
 'PUT /warehouses/wh-1': { id: 'wh-1', branch_id: 'br-1', code: 'WH-001', name_ar: 'المستودع الرئيسي (معدل)', name_en: 'Main Warehouse (Edited)', type: 'MAIN', is_active: true },

 // Departments
 'GET /departments': {
 data: [
 { id: 'dep-1', branch_id: 'br-1', code: 'DEP-001', name_ar: 'المطبخ', name_en: 'Kitchen', is_active: true },
 { id: 'dep-2', branch_id: 'br-1', code: 'DEP-002', name_ar: 'الخدمة', name_en: 'Service', is_active: true }
 ],
 meta: { page: 1, page_size: 10, total: 2, total_pages: 1 }
 },
 'GET /departments/dep-1': { id: 'dep-1', branch_id: 'br-1', code: 'DEP-001', name_ar: 'المطبخ', name_en: 'Kitchen', is_active: true },
 'POST /departments': { id: 'dep-new', branch_id: 'br-1', code: 'DEP-NEW', name_ar: 'قسم جديد', name_en: 'New Department', is_active: true },
 'PUT /departments/dep-1': { id: 'dep-1', branch_id: 'br-1', code: 'DEP-001', name_ar: 'المطبخ (معدل)', name_en: 'Kitchen (Edited)', is_active: true },

 // Suppliers
 'GET /suppliers': {
 data: [
 { id: 'sup-1', code: 'SUP-001', name_ar: 'مورد اللحوم', name_en: 'Meat Supplier', currency_id: 'cur-sar', payment_terms: 'Net 30', is_active: true },
 { id: 'sup-2', code: 'SUP-002', name_ar: 'مورد الخضار', name_en: 'Veggie Supplier', currency_id: 'cur-usd', payment_terms: 'Cash', is_active: true }
 ],
 meta: { page: 1, page_size: 10, total: 2, total_pages: 1 }
 },
 'GET /suppliers/sup-1': { id: 'sup-1', code: 'SUP-001', name_ar: 'مورد اللحوم', name_en: 'Meat Supplier', currency_id: 'cur-sar', payment_terms: 'Net 30', is_active: true },
 'POST /suppliers': { id: 'sup-new', code: 'SUP-NEW', name_ar: 'مورد جديد', name_en: 'New Supplier', currency_id: 'cur-sar', payment_terms: 'Cash', is_active: true },
 'PUT /suppliers/sup-1': { id: 'sup-1', code: 'SUP-001', name_ar: 'مورد اللحوم (معدل)', name_en: 'Meat Supplier (Edited)', currency_id: 'cur-sar', payment_terms: 'Net 30', is_active: true },

 // Categories
 'GET /categories': {
 data: [
 { id: 'cat-1', name_ar: 'لحوم', name_en: 'Meat' },
 { id: 'cat-2', name_ar: 'خضار', name_en: 'Vegetables' }
 ],
 meta: { page: 1, page_size: 10, total: 2, total_pages: 1 }
 },
 'GET /categories/cat-1': { id: 'cat-1', name_ar: 'لحوم', name_en: 'Meat' },
 'POST /categories': { id: 'cat-new', name_ar: 'جديد', name_en: 'New' },
 'PUT /categories/cat-1': { id: 'cat-1', name_ar: 'لحوم (معدّل)', name_en: 'Meat (Edited)' },

 // UoM
 'GET /units-of-measure': {
 data: [
 { id: 'uom-kg', code: 'KG', name_ar: 'كيلوجرام', name_en: 'Kilogram' },
 { id: 'uom-ctn', code: 'CTN', name_ar: 'كرتون', name_en: 'Carton' }
 ],
 meta: { page: 1, page_size: 10, total: 2, total_pages: 1 }
 },
 'GET /units-of-measure/uom-kg': { id: 'uom-kg', code: 'KG', name_ar: 'كيلوجرام', name_en: 'Kilogram' },
 'POST /units-of-measure': { id: 'uom-new', code: 'NEW', name_ar: 'وحدة جديدة', name_en: 'New Unit' },
 'PUT /units-of-measure/uom-kg': { id: 'uom-kg', code: 'KG', name_ar: 'كيلوجرام (معدّل)', name_en: 'Kilogram (Edited)' },

 // Items
 'GET /items': {
 data: [
 { id: 'item-1', code: 'ITM-001', barcode: '000001', name_ar: 'لحم بقر', name_en: 'Beef', category_id: 'cat-1', primary_uom: { id: 'uom-kg', code: 'KG', name_ar: 'كيلوجرام', name_en: 'Kilogram' }, uom_conversions: [], track_lots: true, min_stock_level: 50, reorder_point: 100, is_active: true },
 { id: 'item-2', code: 'ITM-002', barcode: '000002', name_ar: 'دجاج', name_en: 'Chicken', category_id: 'cat-1', primary_uom: { id: 'uom-ctn', code: 'CTN', name_ar: 'كرتون', name_en: 'Carton' }, uom_conversions: [], track_lots: true, min_stock_level: 20, reorder_point: 50, is_active: true }
 ],
 meta: { page: 1, page_size: 10, total: 2, total_pages: 1 }
 },
 'GET /items/item-1': { id: 'item-1', code: 'ITM-001', barcode: '000001', name_ar: 'لحم بقر', name_en: 'Beef', category_id: 'cat-1', primary_uom: { id: 'uom-kg', code: 'KG', name_ar: 'كيلوجرام', name_en: 'Kilogram' }, uom_conversions: [], track_lots: true, min_stock_level: 50, reorder_point: 100, is_active: true },
 'POST /items': { id: 'item-new', code: 'ITM-NEW', barcode: 'NEW-123', name_ar: 'صنف جديد', name_en: 'New Item', category_id: 'cat-1', primary_uom: { id: 'uom-kg', code: 'KG', name_ar: 'كيلوجرام', name_en: 'Kilogram' }, uom_conversions: [], track_lots: false, min_stock_level: 10, reorder_point: 20, is_active: true },
 'PUT /items/item-1': { id: 'item-1', code: 'ITM-001', barcode: '000001', name_ar: 'لحم بقر (معدل)', name_en: 'Beef (Edited)', category_id: 'cat-1', primary_uom: { id: 'uom-kg', code: 'KG', name_ar: 'كيلوجرام', name_en: 'Kilogram' }, uom_conversions: [], track_lots: true, min_stock_level: 50, reorder_point: 100, is_active: true },
 
 // Items with barcode search
 'GET /items?barcode=000001': {
 data: [
 { id: 'item-1', code: 'ITM-001', barcode: '000001', name_ar: 'لحم بقر', name_en: 'Beef', category_id: 'cat-1', primary_uom: { id: 'uom-kg', code: 'KG', name_ar: 'كيلوجرام', name_en: 'Kilogram' }, uom_conversions: [], track_lots: true, min_stock_level: 50, reorder_point: 100, is_active: true }
 ],
 meta: { page: 1, page_size: 10, total: 1, total_pages: 1 }
 },

 // Barcodes
 'GET /barcodes': {
 data: [
 { id: 'bc-1', item_id: 'item-1', barcode: '000001', default_qty: 1 },
 { id: 'bc-2', item_id: 'item-2', barcode: '000002', default_qty: 12 }
 ],
 meta: { page: 1, page_size: 10, total: 2, total_pages: 1 }
 },
 'GET /barcodes/bc-1': { id: 'bc-1', item_id: 'item-1', barcode: '000001', default_qty: 1 },
 'POST /barcodes': { id: 'bc-new', item_id: 'item-1', barcode: 'NEW-BAR', default_qty: 5 },
 'PUT /barcodes/bc-1': { id: 'bc-1', item_id: 'item-1', barcode: '000001', default_qty: 2 },

 // Currencies
 'GET /currencies': {
 data: [
 { id: 'cur-sar', code: 'SAR', name_ar: 'ريال سعودي', name_en: 'Saudi Riyal', symbol: 'ر.س', is_base: true },
 { id: 'cur-usd', code: 'USD', name_ar: 'دولار أمريكي', name_en: 'US Dollar', symbol: '$', is_base: false }
 ],
 meta: { page: 1, page_size: 10, total: 2, total_pages: 1 }
 },
 'GET /currencies/cur-sar': { id: 'cur-sar', code: 'SAR', name_ar: 'ريال سعودي', name_en: 'Saudi Riyal', symbol: 'ر.س', is_base: true },
 'POST /currencies': { id: 'cur-new', code: 'EUR', name_ar: 'يورو', name_en: 'Euro', symbol: '€', is_base: false },
 'PUT /currencies/cur-sar': { id: 'cur-sar', code: 'SAR', name_ar: 'ريال سعودي (معدّل)', name_en: 'Saudi Riyal (Edited)', symbol: 'ر.س', is_base: true },

 // FX Rates
 'GET /currencies/fx-rates': {
 data: [
 { id: 'fx-1', from_currency_id: 'cur-usd', to_currency_id: 'cur-sar', rate: 3.75, effective_date: '2025-01-01T00:00:00Z' }
 ],
 meta: { page: 1, page_size: 10, total: 1, total_pages: 1 }
 },
 'GET /currencies/fx-rates?from=cur-usd&to=cur-sar': {
 data: [
 { id: 'fx-1', from_currency_id: 'cur-usd', to_currency_id: 'cur-sar', rate: 3.75, effective_date: '2025-01-01T00:00:00Z' }
 ],
 meta: { page: 1, page_size: 10, total: 1, total_pages: 1 }
 },
 'GET /currencies/fx-rates/fx-1': { id: 'fx-1', from_currency_id: 'cur-usd', to_currency_id: 'cur-sar', rate: 3.75, effective_date: '2025-01-01T00:00:00Z' },
 'POST /currencies/fx-rates': { id: 'fx-new', from_currency_id: 'cur-usd', to_currency_id: 'cur-sar', rate: 3.76, effective_date: new Date().toISOString() }
};
