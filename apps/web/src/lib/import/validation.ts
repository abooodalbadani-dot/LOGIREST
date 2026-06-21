import { z } from 'zod';
import { ImportEntity } from './templates';

export interface ValidationError {
  row: number;
  column: string;
  severity: 'error' | 'warning';
  message: string;
  value?: unknown;
}

export interface ValidationResult {
 totalRows: number;
 validRows: number;
 errorRows: number;
 errors: ValidationError[];
}

// Entity Schemas
const ItemSchema = z.object({
 Name: z.string().min(1, 'Name is required'),
 Code: z.string().min(1, 'Code is required'),
 Category: z.string().min(1, 'Category is required'),
 Unit: z.string().min(1, 'Unit is required'),
 LotTracked: z.string().optional(),
 Status: z.string().optional(),
});

const UomSchema = z.object({
 Name: z.string().min(1, 'Name is required'),
 Code: z.string().min(1, 'Code is required'),
 Active: z.string().optional(),
});

const BarcodeSchema = z.object({
 ItemCode: z.string().min(1, 'ItemCode is required'),
 UoMCode: z.string().min(1, 'UoMCode is required'),
 Barcode: z.string().min(1, 'Barcode is required'),
 DefaultQty: z.number().or(z.string()).optional(),
 Active: z.string().optional(),
});

const SupplierSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'name is required'),
  contactName: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
});

const OpeningStockSchema = z.object({
  warehouseCode: z.string().min(1, 'warehouseCode is required'),
  itemSku: z.string().min(1, 'itemSku is required'),
  quantity: z.union([z.number(), z.string()]).refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, 'quantity must be a positive number'),
  unitCost: z.union([z.number(), z.string()]).refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'unitCost must be a non-negative number'),
  lotNumber: z.string().optional(),
  expiryDate: z.union([z.string(), z.date()]).optional(),
});

const getEntitySchema = (entity: ImportEntity) => {
 switch (entity) {
 case 'items': return ItemSchema;
 case 'uoms': return UomSchema;
 case 'barcodes': return BarcodeSchema;
 case 'suppliers': return SupplierSchema;
 case 'openingStock': return OpeningStockSchema;
 default: return z.object({});
 }
};

export const validateImportData = (entity: ImportEntity, data: Record<string, unknown>[]): ValidationResult => {
 const errors: ValidationError[] = [];
 const totalRows = data.length;
 const schema = getEntitySchema(entity);

 data.forEach((row, index) => {
 const rowNum = index + 2; // +1 for 0-indexing, +1 for header row
 const result = schema.safeParse(row);

 if (!result.success) {
 result.error.issues.forEach((issue) => {
 errors.push({
 row: rowNum,
 column: issue.path[0]?.toString() || 'Unknown',
 severity: 'error',
 message: issue.message,
 value: row[issue.path[0]?.toString() || ''],
 });
 });
 }
 });

 const uniqueErrorRows = new Set(errors.map(e => e.row));
 const errorRowsCount = uniqueErrorRows.size;

 return {
 totalRows,
 validRows: totalRows - errorRowsCount,
 errorRows: errorRowsCount,
 errors
 };
};

