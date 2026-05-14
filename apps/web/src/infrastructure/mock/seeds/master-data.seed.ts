import { 
  Branch, Warehouse, Department, UoM, Category, Item, Barcode, Currency, FXRate, Supplier, Lot 
} from '@/types/master-data';

export const initialBranches: Branch[] = [
  { id: 'br-1', code: 'BR-001', name_ar: 'الفرع الرئيسي', name_en: 'Main Branch', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'br-2', code: 'BR-002', name_ar: 'فرع الشمال', name_en: 'North Branch', is_active: true, created_at: '2026-01-02T00:00:00Z' },
  { id: 'br-3', code: 'BR-003', name_ar: 'فرع الجنوب', name_en: 'South Branch', is_active: false, created_at: '2026-01-03T00:00:00Z' }
];

export const initialWarehouses: Warehouse[] = [
  { id: 'wh-1', branch_id: 'br-1', code: 'WH-001', name_ar: 'المستودع الرئيسي', name_en: 'Main Warehouse', type: 'main', is_active: true },
  { id: 'wh-2', branch_id: 'br-1', code: 'WH-002', name_ar: 'مستودع التبريد', name_en: 'Cold Storage', type: 'cold', is_active: true },
  { id: 'wh-3', branch_id: 'br-2', code: 'WH-003', name_ar: 'المستودع الجاف', name_en: 'Dry Storage', type: 'dry', is_active: true },
  { id: 'wh-4', branch_id: 'br-3', code: 'WH-004', name_ar: 'مستودع افتراضي', name_en: 'Virtual WH', type: 'virtual', is_active: true }
];

export const initialDepartments: Department[] = [
  { id: 'dep-1', branch_id: 'br-1', warehouse_id: 'wh-1', code: 'DEP-001', name_ar: 'المطبخ', name_en: 'Kitchen', is_active: true },
  { id: 'dep-2', branch_id: 'br-1', warehouse_id: 'wh-1', code: 'DEP-002', name_ar: 'الخدمة', name_en: 'Service', is_active: true }
];

export const initialSuppliers: Supplier[] = [
  { id: 'sup-1', code: 'SUP-001', name_ar: 'مورد اللحوم', name_en: 'Meat Supplier', currency_id: 'cur-sar', payment_terms: 'Net 30', is_active: true },
  { id: 'sup-2', code: 'SUP-002', name_ar: 'مورد الخضار', name_en: 'Veggie Supplier', currency_id: 'cur-usd', payment_terms: 'Cash', is_active: true }
];

export const initialCategories: Category[] = [
  { id: 'cat-1', name_ar: 'لحوم', name_en: 'Meat' },
  { id: 'cat-2', name_ar: 'خضار', name_en: 'Vegetables' }
];

export const initialUoMs: UoM[] = [
  { id: 'uom-kg', code: 'KG', name_ar: 'كيلوجرام', name_en: 'Kilogram', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'uom-ctn', code: 'CTN', name_ar: 'كرتون', name_en: 'Carton', is_active: true, created_at: '2026-01-01T00:00:00Z' }
];

export const initialItems: Item[] = [
  { 
    id: 'item-1', code: 'ITM-001', barcode: '000001', name_ar: 'لحم بقر', name_en: 'Beef', category_id: 'cat-1', 
    primary_uom: { id: 'uom-kg', code: 'KG', name_ar: 'كيلوجرام', name_en: 'Kilogram', is_active: true, created_at: '2026-01-01T00:00:00Z' }, 
    uom_conversions: [], track_lots: true, min_stock_level: 50, reorder_point: 100, is_active: true 
  },
  { 
    id: 'item-2', code: 'ITM-002', barcode: '000002', name_ar: 'دجاج', name_en: 'Chicken', category_id: 'cat-1', 
    primary_uom: { id: 'uom-ctn', code: 'CTN', name_ar: 'كرتون', name_en: 'Carton', is_active: true, created_at: '2026-01-01T00:00:00Z' }, 
    uom_conversions: [], track_lots: true, min_stock_level: 20, reorder_point: 50, is_active: true 
  }
];

export const initialBarcodes: Barcode[] = [
  { id: 'bc-1', item_id: 'item-1', uom_id: 'uom-kg', code: '000001', default_qty: 1, is_active: true },
  { id: 'bc-2', item_id: 'item-2', uom_id: 'uom-ctn', code: '000002', default_qty: 12, is_active: true }
];

export const initialCurrencies: Currency[] = [
  { id: 'cur-sar', code: 'SAR', name_ar: 'ريال سعودي', name_en: 'Saudi Riyal', symbol: 'ر.س', is_base_currency: true, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'cur-usd', code: 'USD', name_ar: 'دولار أمريكي', name_en: 'US Dollar', symbol: '$', is_base_currency: false, is_active: true, created_at: '2026-01-01T00:00:00Z' }
];

export const initialFXRates: FXRate[] = [
  { id: 'fx-1', from_currency_id: 'cur-usd', to_currency_id: 'cur-sar', rate: 3.75, effective_date: '2025-01-01T00:00:00Z', is_active: true, created_at: '2025-01-01T00:00:00Z' }
];

export const initialLots: Lot[] = [
  { id: 'lot-1', item_id: 'item-1', lot_number: 'LOT-001', warehouse_id: 'wh-1', qty_available: 150, expiry_date: '2027-12-31', is_expired: false, is_near_expiry: false },
  { id: 'lot-2', item_id: 'item-2', lot_number: 'LOT-002', warehouse_id: 'wh-1', qty_available: 30, expiry_date: '2027-06-30', is_expired: false, is_near_expiry: false },
  { id: 'lot-3', item_id: 'item-1', lot_number: 'LOT-003', warehouse_id: 'wh-2', qty_available: 80, expiry_date: '2027-12-31', is_expired: false, is_near_expiry: false }
];
