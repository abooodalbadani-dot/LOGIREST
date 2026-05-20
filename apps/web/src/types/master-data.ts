import { z } from 'zod';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface Branch { id: string; code: string; name_ar: string; name_en: string; is_active: boolean; created_at: string; version?: number; }
export interface Warehouse { id: string; branch_id: string; code: string; name_ar: string; name_en: string; type: 'main'|'dry'|'cold'|'virtual'|'transit'; is_active: boolean; version?: number; }
export interface Department { 
 id: string; 
 branch_id: string; 
 warehouse_id: string; 
 code: string; 
 name_ar: string; 
 name_en: string; 
 manager?: string; 
 cost_center?: string; 
 is_active: boolean; 
 version?: number;
}

export interface UoM { id: string; code: string; name_ar: string; name_en: string; category?: string; is_active: boolean; created_at: string; version?: number; }
export interface UoMConversion { from_uom_id: string; to_uom_id: string; factor: number; }
export interface Category { id: string; code: string; name_ar: string; name_en: string; is_referenced?: boolean; version?: number; }
export interface Item { id: string; code: string; barcode: string; name_ar: string; name_en: string; category_id: string; primary_uom: UoM; uom_conversions: UoMConversion[]; track_lots: boolean; min_stock_level: number; reorder_point: number; last_purchase_price?: number; is_active: boolean; version?: number; has_transactions?: boolean; }
export interface Lot { id: string; item_id: string; warehouse_id: string; lot_number: string; expiry_date: string | null; qty_available: number; is_expired: boolean; is_near_expiry: boolean; }
export interface Supplier { id: string; code: string; name_ar: string; name_en: string; email?: string; phone?: string; tax_number?: string; currency_id: string; payment_terms: string; is_active: boolean; version?: number; }
export interface Currency { id: string; code: string; name_ar: string; name_en: string; symbol?: string; is_base_currency: boolean; is_active: boolean; created_at: string; version?: number; }
export interface FXRate { id: string; from_currency_id: string; to_currency_id: string; rate: number; effective_date: string; is_active: boolean; created_at: string; version?: number; }
export interface Barcode { id: string; item_id: string; uom_id: string; code: string; default_qty: number; is_active: boolean; version?: number; }

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const BranchSchema = z.object({
 id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(),
 is_active: z.boolean(), created_at: z.string(), version: z.number().optional()
});

export const WarehouseSchema = z.object({
 id: z.string(), branch_id: z.string(), code: z.string(), name_ar: z.string(),
 name_en: z.string(), type: z.enum(['main','dry','cold','virtual','transit']), is_active: z.boolean(),
 version: z.number().optional()
});

export const DepartmentSchema = z.object({
 id: z.string(), 
 branch_id: z.string(), 
 warehouse_id: z.string(), 
 code: z.string(), 
 name_ar: z.string(),
 name_en: z.string(), 
 manager: z.string().optional(), 
 cost_center: z.string().optional(), 
 is_active: z.boolean(),
 version: z.number().optional()
});

export const UoMSchema = z.object({
  id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(),
  category: z.string().optional(), is_active: z.boolean(), created_at: z.string(), version: z.number().optional()
});

export const CategorySchema = z.object({
 id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(), is_referenced: z.boolean().optional(), version: z.number().optional()
});

export const UoMConversionSchema = z.object({
 from_uom_id: z.string(), to_uom_id: z.string(), factor: z.number()
});

export const ItemSchema = z.object({
 id: z.string(), code: z.string(), barcode: z.string(), name_ar: z.string(), name_en: z.string(),
 category_id: z.string(),
 primary_uom: UoMSchema,
 uom_conversions: z.array(UoMConversionSchema),
 track_lots: z.boolean(), min_stock_level: z.number(), reorder_point: z.number(),
 last_purchase_price: z.number().optional(),
 is_active: z.boolean(),
 version: z.number().optional()
});

export const LotSchema = z.object({
 id: z.string(), item_id: z.string(), warehouse_id: z.string(), lot_number: z.string(),
 expiry_date: z.string().nullable(), qty_available: z.number(),
 is_expired: z.boolean(), is_near_expiry: z.boolean()
});

export const SupplierSchema = z.object({
 id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(),
 email: z.string().optional(), phone: z.string().optional(), tax_number: z.string().optional(),
 currency_id: z.string(), payment_terms: z.string(), is_active: z.boolean(), version: z.number().optional()
});

export const CurrencySchema = z.object({
 id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(),
 symbol: z.string().optional(), is_base_currency: z.boolean(), is_active: z.boolean(), created_at: z.string(),
 version: z.number().optional()
});

export const FXRateSchema = z.object({
 id: z.string(), from_currency_id: z.string(), to_currency_id: z.string(),
 rate: z.number(), effective_date: z.string(), is_active: z.boolean(), created_at: z.string(),
 version: z.number().optional()
});

export const BarcodeSchema = z.object({
 id: z.string(),
 item_id: z.string(),
 uom_id: z.string(),
 code: z.string(),
 default_qty: z.number(),
 is_active: z.boolean(),
 version: z.number().optional()
});

// ─── Form Schemas (for RHF validation) ───────────────────────────────────────

export const BranchFormSchema = z.object({
  code: z.string().min(2, 'validation.code_min').regex(/^[A-Z0-9_-]+$/, 'validation.code_format'),
  name_ar: z.string().min(3, 'validation.name_ar_min'),
  name_en: z.string().min(3, 'validation.name_en_min'),
  is_active: z.boolean(),
  version: z.number().optional()
});

export const WarehouseFormSchema = z.object({
  branch_id: z.string().min(1, 'master_data.warehouses.validation.branch_required'),
  code: z.string().min(2, 'master_data.warehouses.validation.code_min').regex(/^[A-Z0-9_-]+$/, 'master_data.warehouses.validation.code_format'),
  name_ar: z.string().min(3, 'master_data.warehouses.validation.name_ar_min'),
  name_en: z.string().min(3, 'master_data.warehouses.validation.name_en_min'),
  type: z.enum(['main', 'dry', 'cold', 'virtual', 'transit']),
  is_active: z.boolean(),
  version: z.number().optional()
});

export const DepartmentFormSchema = z.object({
  branch_id: z.string().min(1, 'master_data.departments.validation.branch_required'),
  warehouse_id: z.string().min(1, 'master_data.departments.validation.warehouse_required'),
  code: z.string().min(2, 'master_data.departments.validation.code_min').regex(/^[A-Z0-9_-]+$/, 'master_data.departments.validation.code_format'),
  name_ar: z.string().min(3, 'master_data.departments.validation.name_ar_min'),
  name_en: z.string().min(3, 'master_data.departments.validation.name_en_min'),
  manager: z.string().optional(),
  cost_center: z.string().optional(),
  is_active: z.boolean(),
  version: z.number().optional()
});

export const UoMFormSchema = z.object({
  code: z.string().min(1, 'master_data.uoms.validation.code_required')
  .regex(/^[A-Z]+$/, 'master_data.uoms.validation.code_uppercase'),
  name_ar: z.string().min(1, 'master_data.uoms.validation.name_ar_required'),
  name_en: z.string().min(1, 'master_data.uoms.validation.name_en_required'),
  category: z.string().optional(),
  is_active: z.boolean(),
  version: z.number().optional()
});

export const CategoryFormSchema = z.object({
  code: z.string().optional(),
  name_ar: z.string().min(1), name_en: z.string().min(1),
  is_referenced: z.boolean().optional(),
  version: z.number().optional()
});

export const ItemFormSchema = z.object({
 code: z.string().min(1, 'master_data.items.validation.code_required'),
 barcode: z.string().min(1, 'master_data.items.validation.barcode_required'),
 name_ar: z.string().min(1, 'master_data.items.validation.name_ar_required'),
 name_en: z.string().min(1, 'master_data.items.validation.name_en_required'),
 category_id: z.string().min(1, 'master_data.items.validation.category_required'),
 primary_uom_id: z.string().min(1, 'master_data.items.validation.uom_required'),
 track_lots: z.boolean(),
 min_stock_level: z.number().min(0),
 reorder_point: z.number().min(0),
 uom_conversions: z.array(z.object({
 from_uom_id: z.string().min(1),
 to_uom_id: z.string().min(1),
 factor: z.number().positive()
 })),
 is_active: z.boolean(),
 version: z.number().optional()
});

export const SupplierFormSchema = z.object({
  code: z.string().min(1, 'master_data.suppliers.validation.code_required'),
  name_ar: z.string().min(1, 'master_data.suppliers.validation.name_ar_required'),
  name_en: z.string().min(1, 'master_data.suppliers.validation.name_en_required'),
  currency_id: z.string().min(1, 'master_data.suppliers.validation.currency_required'),
  payment_terms: z.string(),
  is_active: z.boolean(),
  version: z.number().optional()
});

export const CurrencyFormSchema = z.object({
  code: z.string()
  .min(3, 'master_data.currencies.validation.code_length')
  .max(3, 'master_data.currencies.validation.code_length')
  .regex(/^[A-Z]{3}$/, 'master_data.currencies.validation.code_format'),
  name_ar: z.string().min(1, 'master_data.currencies.validation.name_ar_required'),
  name_en: z.string().min(1, 'master_data.currencies.validation.name_en_required'),
  symbol: z.string().optional(),
  is_base_currency: z.boolean(),
  is_active: z.boolean(),
  version: z.number().optional()
});

export const FXRateFormSchema = z.object({
  from_currency_id: z.string().min(1, 'master_data.fx_rates.validation.from_currency_required'),
  to_currency_id: z.string().min(1, 'master_data.fx_rates.validation.to_currency_required'),
  rate: z.number().positive('master_data.fx_rates.validation.rate_positive').step(0.000001, 'master_data.fx_rates.validation.rate_precision'),
  effective_date: z.string().min(1, 'master_data.fx_rates.validation.date_required'),
  is_active: z.boolean(),
  version: z.number().optional()
}).refine(data => data.from_currency_id !== data.to_currency_id, {
  message: 'master_data.fx_rates.validation.currencies_must_differ',
  path: ['to_currency_id']
});

export const BarcodeFormSchema = z.object({
  item_id: z.string().min(1, 'master_data.barcodes.validation.item_required'),
  uom_id: z.string().min(1, 'master_data.barcodes.validation.uom_required'),
  code: z.string().min(1, 'master_data.barcodes.validation.code_required'),
  default_qty: z.number().positive('master_data.barcodes.validation.qty_positive'),
  is_active: z.boolean(),
  version: z.number().optional()
});

// ─── Derived Types ────────────────────────────────────────────────────────────

export type BranchFormValues = z.infer<typeof BranchFormSchema>;
export type WarehouseFormValues = z.infer<typeof WarehouseFormSchema>;
export type DepartmentFormValues = z.infer<typeof DepartmentFormSchema>;
export type UoMFormValues = z.infer<typeof UoMFormSchema>;
export type CategoryFormValues = z.infer<typeof CategoryFormSchema>;
export type ItemFormValues = z.infer<typeof ItemFormSchema>;
export type SupplierFormValues = z.infer<typeof SupplierFormSchema>;
export type CurrencyFormValues = z.infer<typeof CurrencyFormSchema>;
export type FXRateFormValues = z.infer<typeof FXRateFormSchema>;
export type BarcodeFormValues = z.infer<typeof BarcodeFormSchema>;
