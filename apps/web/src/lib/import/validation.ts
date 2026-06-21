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
const CategorySchema = z.object({
  Name: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, 'Name is required'),
  Code: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, 'Code is required'),
});

const ItemSchema = z.object({
  Name: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, 'Name is required'),
  Code: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, 'Code is required'),
  Category: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, 'Category is required'),
  Unit: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, 'Unit is required'),
  LotTracked: z.union([z.string(), z.boolean(), z.number()]).optional(),
  Status: z.union([z.string(), z.boolean(), z.number()]).optional(),
});

const UomSchema = z.object({
  Name: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, 'Name is required'),
  Code: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, 'Code is required'),
});

const BarcodeSchema = z.object({
  ItemCode: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, 'ItemCode is required'),
  Barcode: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, 'Barcode is required'),
});

const SupplierSchema = z.object({
  code: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  name: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, 'name is required'),
  contactName: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  contactEmail: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  contactPhone: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
});

const OpeningStockSchema = z.object({
  warehouseCode: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, 'warehouseCode is required'),
  itemSku: z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, 'itemSku is required'),
  quantity: z.union([z.number(), z.string()]).refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num > 0;
  }, 'quantity must be a positive number'),
  unitCost: z.union([z.number(), z.string()]).refine((val) => {
    const num = Number(val);
    return !isNaN(num) && num >= 0;
  }, 'unitCost must be a non-negative number'),
  lotNumber: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  expiryDate: z.union([z.string(), z.date(), z.number()]).optional(),
});

const getEntitySchema = (entity: ImportEntity) => {
  switch (entity) {
    case 'categories': return CategorySchema;
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

