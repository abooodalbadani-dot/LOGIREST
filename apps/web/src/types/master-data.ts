import { z } from 'zod';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface Branch { id: string; code: string; name?: string; isActive?: boolean; createdAt?: string; version?: number; }
export interface Warehouse { id: string; branchId: string; code: string; name?: string; isActive?: boolean; version?: number; }
export interface Department { 
 id: string; 
 branchId: string; 
 code: string; 
 name?: string;
 isActive?: boolean;
 version?: number; 
}

export interface UoM { id: string; code: string; name: string; version?: number; }
export interface UoMConversion { fromUomId: string; toUomId: string; factor: number; }
export interface Category { id: string; code: string; name: string; isReferenced?: boolean; version?: number; }
export interface Item { id: string; code: string; barcode: string; name: string; categoryId: string; primaryUom: UoM; uomConversions: UoMConversion[]; trackLots: boolean; minStockLevel: number; reorderPoint: number; lastPurchasePrice?: number; isActive: boolean; version?: number; hasTransactions?: boolean; category?: Category | null; }
export interface Lot { id: string; itemId: string; warehouseId: string; lotNumber: string; expiryDate: string | null; qtyAvailable: number; isExpired: boolean; isNearExpiry: boolean; }
export interface Supplier { id: string; code: string; name: string; contactEmail?: string | null; contactPhone?: string | null; contactName?: string | null; currencyId: string; paymentTerms: string; isActive: boolean; version?: number; }
export interface Currency { id: string; code: string; name: string; symbol?: string; isBase: boolean; isActive: boolean; createdAt: string; version?: number; }
export interface FXRate { id: string; fromCurrencyId: string; toCurrencyId: string; rate: number; effectiveDate: string; isActive: boolean; createdAt: string; version?: number; fromCurrency?: Currency | null; toCurrency?: Currency | null; }
export interface Barcode { id: string; itemId: string; uomId?: string | null; code: string; defaultQty?: number | null; isActive?: boolean | null; version?: number; itemName?: string | null; itemCode?: string | null; }
export interface VarianceReason { id: string; code: string; name: string; isActive: boolean; }


// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const BranchSchema = z.object({
  id: z.string(), code: z.string(), name: z.string().optional(),
  isActive: z.boolean().optional(), createdAt: z.string().optional(), version: z.number().optional()
});

export const WarehouseSchema = z.object({
  id: z.string(), branchId: z.string(), code: z.string(), name: z.string().optional(),
  isActive: z.boolean().optional(),
  version: z.number().optional()
});

export const DepartmentSchema = z.object({
  id: z.string(), 
  branchId: z.string(), 
  code: z.string(), 
  name: z.string().optional(),
  isActive: z.boolean().optional(),
  version: z.number().optional()
});

export const UoMSchema = z.object({
  id: z.string(), code: z.string(), name: z.string(),
  version: z.number().optional()
});

export const CategorySchema = z.object({
  id: z.string(), code: z.string(), name: z.string(), isReferenced: z.boolean().optional(), version: z.number().optional()
});

export const UoMConversionSchema = z.object({
  fromUomId: z.string(), toUomId: z.string(), factor: z.number()
});

export const ItemSchema = z.object({
  id: z.string(), code: z.string(), barcode: z.string(), name: z.string(),
  categoryId: z.string(),
  category: CategorySchema.optional().nullable(),
  primaryUom: UoMSchema,
  uomConversions: z.array(UoMConversionSchema),
  trackLots: z.boolean(), minStockLevel: z.number(), reorderPoint: z.number(),
  lastPurchasePrice: z.number().optional(),
  isActive: z.boolean(),
  version: z.number().optional()
});

export const LotSchema = z.object({
  id: z.string(), itemId: z.string(), warehouseId: z.string(), lotNumber: z.string(),
  expiryDate: z.string().nullable(), qtyAvailable: z.number(),
  isExpired: z.boolean(), isNearExpiry: z.boolean()
});

export const SupplierSchema = z.object({
  id: z.string(), code: z.string(), name: z.string(),
  contactEmail: z.string().nullable().optional(), contactPhone: z.string().nullable().optional(), contactName: z.string().nullable().optional(),
  currencyId: z.string(), paymentTerms: z.string(), isActive: z.boolean(), version: z.number().optional()
});

export const CurrencySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string().optional(),
  nameEn: z.string().optional(),
  nameAr: z.string().optional(),
  symbol: z.string().optional(),
  isBase: z.boolean().optional(),
  isActive: z.boolean().optional(),
  createdAt: z.string().optional(),
  version: z.number().optional()
}).transform((data) => ({
  ...data,
  name: data.name || data.nameEn || data.nameAr || '',
  nameEn: data.nameEn || data.name || '',
  nameAr: data.nameAr || data.name || '',
  isBase: data.isBase ?? false,
  isActive: data.isActive ?? true,
  createdAt: data.createdAt || new Date().toISOString(),
}));

const preprocessDecimal = (val: unknown) => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val);
  if (val && typeof val === 'object') {
    const raw = val as Record<string, unknown>;
    if (typeof raw.toNumber === 'function') {
      return (raw as { toNumber: () => number }).toNumber();
    }
    if ('d' in raw && 's' in raw && 'e' in raw && Array.isArray(raw.d)) {
      try {
        const s = raw.s as number;
        const e = raw.e as number;
        const d = raw.d as number[];
        let digits = '';
        for (let i = 0; i < d.length; i++) {
          let segment = String(d[i]);
          if (i > 0) {
            segment = segment.padStart(7, '0');
          }
          digits += segment;
        }
        return s * parseInt(digits, 10) * Math.pow(10, e - digits.length + 1);
      } catch (err) {
        console.error('Error parsing decimal object:', err);
      }
    }
  }
  return val;
};

export const FXRateSchema = z.preprocess(
  (data: unknown) => {
    if (data && typeof data === 'object') {
      const raw = data as Record<string, unknown>;
      return {
        ...raw,
        rate: preprocessDecimal(raw.rate),
        effectiveDate: (raw.effectiveDate as string) || (raw.effectiveFrom as string) || '',
        isActive: raw.isActive ?? true,
        createdAt: raw.createdAt ?? new Date().toISOString(),
      };
    }
    return data;
  },
  z.object({
    id: z.string(),
    fromCurrencyId: z.string(),
    toCurrencyId: z.string(),
    rate: z.number(),
    effectiveDate: z.string(),
    isActive: z.boolean(),
    createdAt: z.string(),
    version: z.number().optional(),
    fromCurrency: CurrencySchema.optional().nullable(),
    toCurrency: CurrencySchema.optional().nullable(),
  })
);

export const BarcodeSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  uomId: z.string().optional().nullable(),
  code: z.string(),
  defaultQty: z.number().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  version: z.number().optional(),
  itemName: z.string().optional().nullable(),
  itemCode: z.string().optional().nullable(),
});

export const VarianceReasonSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  isActive: z.boolean(),
});

// ─── Form Schemas (for RHF validation) ───────────────────────────────────────

export const BranchFormSchema = z.object({
  code: z.string().optional()
    .refine(val => !val || val.length >= 2, { message: 'validation.code_min' })
    .refine(val => !val || /^[a-zA-Z0-9_-\s]+$/.test(val), { message: 'validation.code_format' }),
  name: z.string().min(3, 'validation.name_min'),
  isActive: z.boolean().optional(),
  version: z.number().optional()
});

export const WarehouseFormSchema = z.object({
  branchId: z.string().min(1, 'master_data.warehouses.validation.branch_required'),
  code: z.string().optional()
    .refine(val => !val || val.length >= 2, { message: 'master_data.warehouses.validation.code_min' })
    .refine(val => !val || /^[a-zA-Z0-9_-\s]+$/.test(val), { message: 'master_data.warehouses.validation.code_format' }),
  name: z.string().min(3, 'master_data.warehouses.validation.name_min'),
  isActive: z.boolean().optional().nullable(),
  version: z.number().optional().nullable()
});

export const DepartmentFormSchema = z.object({
  branchId: z.string().min(1, 'master_data.departments.validation.branch_required'),
  name: z.string().min(3, 'master_data.departments.validation.name_min'),
  isActive: z.boolean().optional(),
  version: z.number().optional()
});

export const UoMFormSchema = z.object({
  code: z.string().optional()
    .refine(val => !val || val.length >= 1, { message: 'master_data.uoms.validation.code_required' })
    .refine(val => !val || /^[a-zA-Z0-9_-\s]+$/.test(val), { message: 'master_data.uoms.validation.code_uppercase' }),
  name: z.string().min(1, 'master_data.uoms.validation.name_required'),
  version: z.number().optional().nullable()
});

export const CategoryFormSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1),
  isReferenced: z.boolean().optional(),
  version: z.number().optional()
});

export const ItemFormSchema = z.object({
  code: z.string().optional()
    .refine(val => !val || val.length >= 1, { message: 'master_data.items.validation.code_required' }),
  barcode: z.string().min(1, 'master_data.items.validation.barcode_required'),
  name: z.string().min(1, 'master_data.items.validation.name_required'),
  categoryId: z.string().min(1, 'master_data.items.validation.category_required'),
  primaryUomId: z.string().min(1, 'master_data.items.validation.uom_required'),
  trackLots: z.boolean(),
  minStockLevel: z.number().min(0).optional().nullable(),
  reorderPoint: z.number().min(0),
  uomConversions: z.array(z.object({
  fromUomId: z.string().min(1),
  toUomId: z.string().min(1),
  factor: z.number().positive()
  })),
  isActive: z.boolean().optional().nullable(),
  version: z.number().optional().nullable()
});

export const SupplierFormSchema = z.object({
  code: z.string().nullable().optional()
    .refine(val => !val || val.length >= 1, { message: 'master_data.suppliers.validation.code_required' }),
  name: z.string().min(1, 'master_data.suppliers.validation.name_required'),
  currencyId: z.string().optional().nullable(),
  paymentTerms: z.string(),
  contactEmail: z.string().email().or(z.literal('')).nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  contactName: z.string().nullable().optional(),
  isActive: z.boolean().optional().nullable(),
  version: z.number().optional().nullable()
});

export const CurrencyFormSchema = z.object({
  code: z.string()
    .min(1, 'master_data.currencies.validation.code_required')
    .refine(val => val.length === 3, { message: 'master_data.currencies.validation.code_length' })
    .refine(val => /^[a-zA-Z]{3}$/.test(val), { message: 'master_data.currencies.validation.code_format' }),
  name: z.string().min(1, 'master_data.currencies.validation.name_required'),
  symbol: z.string().optional().nullable(),
  isBase: z.boolean(),
  isActive: z.boolean().optional().nullable(),
  version: z.number().optional().nullable()
});

export const FXRateFormSchema = z.object({
  fromCurrencyId: z.string().min(1, 'master_data.fx_rates.validation.from_currency_required'),
  toCurrencyId: z.string().min(1, 'master_data.fx_rates.validation.to_currency_required'),
  rate: z.number().positive('master_data.fx_rates.validation.rate_positive').step(0.000001, 'master_data.fx_rates.validation.rate_precision'),
  effectiveDate: z.string().min(1, 'master_data.fx_rates.validation.date_required'),
  isActive: z.boolean().optional().nullable(),
  version: z.number().optional()
}).refine(data => data.fromCurrencyId !== data.toCurrencyId, {
  message: 'master_data.fx_rates.validation.currencies_must_differ',
  path: ['toCurrencyId']
});

export const BarcodeFormSchema = z.object({
  itemId: z.string().min(1, 'master_data.barcodes.validation.item_required'),
  code: z.string().min(1, 'master_data.barcodes.validation.code_required'),
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
