import { 
  Branch, Warehouse, Department, UoM, Category, Item, Barcode, Currency, FXRate, Supplier, Lot, VarianceReason 
} from '@/types/master-data';

export const initialBranches: Branch[] = [
  { id: 'br-1', code: 'BR-001', name: 'Main Branch', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'br-2', code: 'BR-002', name: 'North Branch', isActive: true, createdAt: '2026-01-02T00:00:00Z' },
  { id: 'br-3', code: 'BR-003', name: 'South Branch', isActive: false, createdAt: '2026-01-03T00:00:00Z' }
];

export const initialWarehouses: Warehouse[] = [
  { id: 'wh-1', branchId: 'br-1', code: 'WH-001', name: 'Main Warehouse', type: 'main', isActive: true },
  { id: 'wh-2', branchId: 'br-1', code: 'WH-002', name: 'Cold Storage', type: 'cold', isActive: true },
  { id: 'wh-3', branchId: 'br-2', code: 'WH-003', name: 'Dry Storage', type: 'dry', isActive: true },
  { id: 'wh-4', branchId: 'br-3', code: 'WH-004', name: 'Virtual WH', type: 'virtual', isActive: true }
];

export const initialDepartments: Department[] = [
  { id: 'dep-1', branchId: 'br-1', warehouseId: 'wh-1', code: 'DEP-001', name: 'Kitchen', isActive: true },
  { id: 'dep-2', branchId: 'br-1', warehouseId: 'wh-1', code: 'DEP-002', name: 'Service', isActive: true }
];

export const initialSuppliers: Supplier[] = [
  { id: 'sup-1', code: 'SUP-001', nameAr: 'مورد اللحوم', nameEn: 'Meat Supplier', currencyId: 'cur-sar', paymentTerms: 'Net 30', isActive: true },
  { id: 'sup-2', code: 'SUP-002', nameAr: 'مورد الخضار', nameEn: 'Veggie Supplier', currencyId: 'cur-usd', paymentTerms: 'Cash', isActive: true }
];

export const initialCategories: Category[] = [
  { id: 'CAT-001', code: 'CAT-001', nameAr: 'الأغذية والمشروبات', nameEn: 'Food & Beverage', isReferenced: true },
  { id: 'CAT-002', code: 'CAT-002', nameAr: 'معدات المطبخ', nameEn: 'Kitchen Equipment', isReferenced: true }
];

export const initialUoMs: UoM[] = [
  { id: 'uom-kg', code: 'KG', nameAr: 'كيلوجرام', nameEn: 'Kilogram', isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'uom-ctn', code: 'CTN', nameAr: 'كرتون', nameEn: 'Carton', isActive: true, createdAt: '2026-01-01T00:00:00Z' }
];

export const initialItems: Item[] = [
  { 
    id: 'item-1', code: 'ITM-001', barcode: '000001', nameAr: 'لحم بقر', nameEn: 'Beef', categoryId: 'CAT-001', 
    primaryUom: { id: 'uom-kg', code: 'KG', nameAr: 'كيلوجرام', nameEn: 'Kilogram', isActive: true, createdAt: '2026-01-01T00:00:00Z' }, 
    uomConversions: [], trackLots: true, minStockLevel: 50, reorderPoint: 100, isActive: true 
  },
  { 
    id: 'item-2', code: 'ITM-002', barcode: '000002', nameAr: 'دجاج', nameEn: 'Chicken', categoryId: 'CAT-001', 
    primaryUom: { id: 'uom-ctn', code: 'CTN', nameAr: 'كرتون', nameEn: 'Carton', isActive: true, createdAt: '2026-01-01T00:00:00Z' }, 
    uomConversions: [], trackLots: true, minStockLevel: 20, reorderPoint: 50, isActive: true 
  }
];

export const initialBarcodes: Barcode[] = [
  { id: 'bc-1', itemId: 'item-1', uomId: 'uom-kg', code: '000001', defaultQty: 1, isActive: true },
  { id: 'bc-2', itemId: 'item-2', uomId: 'uom-ctn', code: '000002', defaultQty: 12, isActive: true }
];

export const initialCurrencies: Currency[] = [
  { id: 'cur-sar', code: 'SAR', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', symbol: 'ر.س', isBaseCurrency: true, isActive: true, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'cur-usd', code: 'USD', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', symbol: '$', isBaseCurrency: false, isActive: true, createdAt: '2026-01-01T00:00:00Z' }
];

export const initialFXRates: FXRate[] = [
  { id: 'fx-1', fromCurrencyId: 'cur-usd', toCurrencyId: 'cur-sar', rate: 3.75, effectiveDate: '2025-01-01T00:00:00Z', isActive: true, createdAt: '2025-01-01T00:00:00Z' }
];

export const initialVarianceReasons: VarianceReason[] = [
  { id: 'vr-damage', code: 'DAMAGE', nameAr: 'تلف', nameEn: 'Damage', isActive: true },
  { id: 'vr-expiry', code: 'EXPIRY', nameAr: 'انتهاء صلاحية', nameEn: 'Expiry', isActive: true },
  { id: 'vr-theft', code: 'THEFT', nameAr: 'سرقة', nameEn: 'Theft', isActive: true },
  { id: 'vr-counting-error', code: 'COUNTING_ERROR', nameAr: 'خطأ في العد', nameEn: 'Counting Error', isActive: true },
  { id: 'vr-correction', code: 'CORRECTION', nameAr: 'تصحيح', nameEn: 'Correction', isActive: true },
  { id: 'vr-other', code: 'OTHER', nameAr: 'أخرى', nameEn: 'Other', isActive: true },
];

export const initialLots: Lot[] = [
  { id: 'lot-1', itemId: 'item-1', warehouseId: 'wh-1', lotNumber: 'LOT-BF-001', expiryDate: '2026-12-31T00:00:00Z', qtyAvailable: 200, isExpired: false, isNearExpiry: false },
  { id: 'lot-2', itemId: 'item-2', warehouseId: 'wh-1', lotNumber: 'LOT-CH-001', expiryDate: '2026-06-30T00:00:00Z', qtyAvailable: 150, isExpired: false, isNearExpiry: false },
  { id: 'lot-3', itemId: 'item-3', warehouseId: 'wh-1', lotNumber: 'LOT-TM-001', expiryDate: '2026-03-15T00:00:00Z', qtyAvailable: 300, isExpired: false, isNearExpiry: true }
];
