import { z } from 'zod';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface Branch { id: string; code: string; name_ar: string; name_en: string; is_active: boolean; created_at: string; }
export interface Warehouse { id: string; branch_id: string; code: string; name_ar: string; name_en: string; type: 'MAIN'|'DRY'|'COLD'|'VIRTUAL'; is_active: boolean; }
export interface Department { id: string; branch_id: string; code: string; name_ar: string; name_en: string; manager?: string; cost_center?: string; is_active: boolean; }
export interface UoM { id: string; code: string; name_ar: string; name_en: string; }
export interface UoMConversion { from_uom_id: string; to_uom_id: string; factor: number; }
export interface Category { id: string; name_ar: string; name_en: string; }
export interface Item { id: string; code: string; barcode: string; name_ar: string; name_en: string; category_id: string; primary_uom: UoM; uom_conversions: UoMConversion[]; track_lots: boolean; min_stock_level: number; reorder_point: number; is_active: boolean; }
export interface Lot { id: string; item_id: string; warehouse_id: string; lot_number: string; expiry_date: string | null; qty_available: number; is_expired: boolean; is_near_expiry: boolean; }
export interface Supplier { id: string; code: string; name_ar: string; name_en: string; currency_id: string; payment_terms: string; is_active: boolean; }
export interface Currency { id: string; code: string; name_ar: string; name_en: string; symbol: string; is_base: boolean; }
export interface FXRate { id: string; from_currency_id: string; to_currency_id: string; rate: number; effective_date: string; }
export interface Barcode { id: string; item_id: string; barcode: string; default_qty: number; }

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const BranchSchema = z.object({
  id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(),
  is_active: z.boolean(), created_at: z.string()
});

export const WarehouseSchema = z.object({
  id: z.string(), branch_id: z.string(), code: z.string(), name_ar: z.string(),
  name_en: z.string(), type: z.enum(['MAIN','DRY','COLD','VIRTUAL']), is_active: z.boolean()
});

export const DepartmentSchema = z.object({
  id: z.string(), branch_id: z.string(), code: z.string(), name_ar: z.string(),
  name_en: z.string(), manager: z.string().optional(), cost_center: z.string().optional(), is_active: z.boolean()
});

export const UoMSchema = z.object({
  id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string()
});

export const CategorySchema = z.object({
  id: z.string(), name_ar: z.string(), name_en: z.string()
});

export const UoMConversionSchema = z.object({
  from_uom_id: z.string(), to_uom_id: z.string(), factor: z.number()
});

export const ItemSchema = z.object({
  id: z.string(), code: z.string(), barcode: z.string(), name_ar: z.string(), name_en: z.string(),
  category_id: z.string(),
  primary_uom: UoMSchema,
  uom_conversions: z.array(UoMConversionSchema),
  track_lots: z.boolean(), min_stock_level: z.number(), reorder_point: z.number(), is_active: z.boolean()
});

export const LotSchema = z.object({
  id: z.string(), item_id: z.string(), warehouse_id: z.string(), lot_number: z.string(),
  expiry_date: z.string().nullable(), qty_available: z.number(),
  is_expired: z.boolean(), is_near_expiry: z.boolean()
});

export const SupplierSchema = z.object({
  id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(),
  currency_id: z.string(), payment_terms: z.string(), is_active: z.boolean()
});

export const CurrencySchema = z.object({
  id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string(),
  symbol: z.string(), is_base: z.boolean()
});

export const FXRateSchema = z.object({
  id: z.string(), from_currency_id: z.string(), to_currency_id: z.string(),
  rate: z.number(), effective_date: z.string()
});

export const BarcodeSchema = z.object({
  id: z.string(), item_id: z.string(), barcode: z.string(), default_qty: z.number()
});

// ─── Form Schemas (for RHF validation) ───────────────────────────────────────

export const BranchFormSchema = z.object({
  code: z.string().min(2, 'validation.code_min').regex(/^[A-Z0-9_-]+$/, 'validation.code_format'),
  name_ar: z.string().min(3, 'validation.name_ar_min'),
  name_en: z.string().min(3, 'validation.name_en_min'),
  is_active: z.boolean()
});

export const WarehouseFormSchema = z.object({
  branch_id: z.string().min(1, 'validation.required'),
  code: z.string().min(2, 'validation.code_min').regex(/^[A-Z0-9_-]+$/, 'validation.code_format'),
  name_ar: z.string().min(3, 'validation.name_ar_min'),
  name_en: z.string().min(3, 'validation.name_en_min'),
  type: z.enum(['MAIN', 'DRY', 'COLD', 'VIRTUAL']),
  is_active: z.boolean()
});

export const DepartmentFormSchema = z.object({
  branch_id: z.string().min(1), code: z.string().min(1), name_ar: z.string().min(1),
  name_en: z.string().min(1), manager: z.string().optional(), cost_center: z.string().optional(), is_active: z.boolean()
});

export const UoMFormSchema = z.object({
  code: z.string().min(1), name_ar: z.string().min(1), name_en: z.string().min(1)
});

export const CategoryFormSchema = z.object({
  name_ar: z.string().min(1), name_en: z.string().min(1)
});

export const ItemFormSchema = z.object({
  code: z.string().min(1), barcode: z.string().min(1), name_ar: z.string().min(1),
  name_en: z.string().min(1), category_id: z.string().min(1), primary_uom_id: z.string().min(1),
  track_lots: z.boolean(), min_stock_level: z.number().min(0), reorder_point: z.number().min(0),
  uom_conversions: z.array(z.object({ from_uom_id: z.string().min(1), to_uom_id: z.string().min(1), factor: z.number().positive() })),
  is_active: z.boolean()
});

export const SupplierFormSchema = z.object({
  code: z.string().min(1), name_ar: z.string().min(1), name_en: z.string().min(1),
  currency_id: z.string().min(1), payment_terms: z.string(), is_active: z.boolean()
});

export const CurrencyFormSchema = z.object({
  code: z.string().min(1), name_ar: z.string().min(1), name_en: z.string().min(1),
  symbol: z.string().min(1), is_base: z.boolean()
});

export const FXRateFormSchema = z.object({
  from_currency_id: z.string().min(1), to_currency_id: z.string().min(1),
  rate: z.number().positive(), effective_date: z.string().min(1)
});

export const BarcodeFormSchema = z.object({
  item_id: z.string().min(1), barcode: z.string().min(1), default_qty: z.number().min(0)
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
