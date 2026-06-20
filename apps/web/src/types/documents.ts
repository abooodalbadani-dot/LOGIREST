import { z } from 'zod';
import { ALL_STATUSES as ALL_DOCUMENT_STATUSES, DocumentStatus, ALL_TRANSFER_STATUSES, TransferStatus, ALL_STOCKTAKE_STATUSES as STOCKTAKE_STATUSES, StocktakeStatus } from '@logirest/shared-types';

export type { DocumentStatus, TransferStatus, StocktakeStatus };
export { STOCKTAKE_STATUSES };
export type DocumentStatusTypes = DocumentStatus;
export type DocumentType = 'GRN'|'ISSUE'|'TRANSFER'|'ADJUSTMENT'|'PR'|'PO'|'STOCKTAKE'|'KITCHEN_REQUEST';

export const BaseDocumentSchema = z.object({
  id: z.string(),
  documentNumber: z.string(),
  type: z.enum(['GRN', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'PR', 'PO', 'STOCKTAKE', 'KITCHEN_REQUEST']),
  status: z.enum(ALL_DOCUMENT_STATUSES),
  warehouseId: z.string(),
  branchId: z.string(),
  notes: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
  postedAt: z.string().nullable(),
  postedBy: z.string().nullable(),
  version: z.number().default(1),
});

export const LotAllocationSchema = z.object({
  lotId: z.string(),
  lotNumber: z.string(),
  expiryDate: z.string().nullable().optional(),
  allocatedQty: z.number(),
  overrideReason: z.string().nullable().optional(),
});

export const DocItemSummarySchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  
  primaryUom: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string().optional(),
  }),
  category: z.object({
    id: z.string(),
    name: z.string(),
  }).optional().nullable(),
});

export const GRNLineItemSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  itemId: z.string(),
  item: DocItemSummarySchema,
  lotId: z.string().nullable(),
  lot: z.object({
    id: z.string(),
    lotNumber: z.string(),
    expiryDate: z.string().nullable(),
    isExpired: z.boolean(),
  }).nullable(),
  qty: z.number(),
  uomId: z.string(),
  unitCost: z.number().nullable(),
  poQty: z.number().nullable(),
  receivedQty: z.number(),
  unitCostForeign: z.number(),
  unitCostBase: z.number(),
});

export const GRNSchema = BaseDocumentSchema.extend({
  type: z.literal('GRN'),
  poId: z.string().nullable(),
  supplierId: z.string(),
  supplierName: z.string().optional().nullable(),
  warehouseName: z.string().optional().nullable(),
  currencyId: z.string(),
  currencyCode: z.string().optional().nullable(),
  fxRate: z.number().nullable(),
  fxRateCapturedAt: z.string().nullable(),
  lines: z.array(GRNLineItemSchema),
});

export const PRLineItemSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  itemId: z.string(),
  item: DocItemSummarySchema,
  lotId: z.string().nullable(),
  lot: z.object({
    id: z.string(),
    lotNumber: z.string(),
    expiryDate: z.string().nullable(),
    isExpired: z.boolean(),
  }).nullable(),
  qty: z.number(),
  uomId: z.string(),
  unitCost: z.number().nullable(),
  requestedQty: z.number(),
  approvedQty: z.number().nullable(),
});

export const PurchaseRequestSchema = BaseDocumentSchema.extend({
  type: z.literal('PR'),
  requestedByDept: z.string(),
  requiredByDate: z.string(),
  warehouseName: z.string().optional().nullable(),
  branchName: z.string().optional().nullable(),
  lines: z.array(PRLineItemSchema),
});

export const POLineItemSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  itemId: z.string(),
  item: DocItemSummarySchema,
  lotId: z.string().nullable(),
  lot: z.object({
    id: z.string(),
    lotNumber: z.string(),
    expiryDate: z.string().nullable(),
    isExpired: z.boolean(),
  }).nullable(),
  qty: z.number(),
  uomId: z.string(),
  unitCost: z.number().nullable(),
  orderedQty: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
});

export const PurchaseOrderSchema = BaseDocumentSchema.extend({
  type: z.literal('PO'),
  prId: z.string().nullable(),
  supplierId: z.string(),
  supplierName: z.string().optional().nullable(),
  warehouseName: z.string().optional().nullable(),
  currencyId: z.string(),
  currencyCode: z.string().optional().nullable(),
  expectedDeliveryDate: z.string(),
  lines: z.array(POLineItemSchema),
});

export const IssueLineItemSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  itemId: z.string(),
  item: DocItemSummarySchema,
  lotId: z.string().nullable(),
  lot: z.object({
    id: z.string(),
    lotNumber: z.string(),
    expiryDate: z.string().nullable(),
    isExpired: z.boolean(),
  }).nullable(),
  qty: z.number(),
  uomId: z.string(),
  unitCost: z.number().nullable(),
  requestedQty: z.number(),
  issuedQty: z.number(),
  lotAllocations: z.array(LotAllocationSchema),
});

export const StockIssueSchema = BaseDocumentSchema.extend({
  type: z.literal('ISSUE'),
  destinationDeptId: z.string(),
  destinationDepartmentName: z.string().optional().nullable(),
  departmentName: z.string().optional().nullable(),
  warehouseName: z.string().optional().nullable(),
  requestedBy: z.string(),
  lines: z.array(IssueLineItemSchema),
  kitchenRequest: z.object({
    id: z.string(),
    requestNumber: z.string(),
  }).nullable().optional(),
});

export const TransferLineItemSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  itemId: z.string(),
  item: DocItemSummarySchema,
  lotId: z.string().nullable(),
  lot: z.object({
    id: z.string(),
    lotNumber: z.string(),
    expiryDate: z.string().nullable(),
    isExpired: z.boolean(),
  }).nullable(),
  qty: z.number(),
  uomId: z.string(),
  unitCost: z.number().nullable(),
  shippedQty: z.number(),
  receivedQty: z.number().nullable(),
  lotAllocations: z.array(LotAllocationSchema).default([]),
});

export const TransferSchema = BaseDocumentSchema.extend({
  type: z.literal('TRANSFER'),
  fromWarehouseId: z.string(),
  fromWarehouseName: z.string().optional(),
  toWarehouseId: z.string(),
  toWarehouseName: z.string().optional(),
  transferStatus: z.enum(ALL_TRANSFER_STATUSES),
  shippedAt: z.string().nullable(),
  receivedAt: z.string().nullable(),
  varianceReason: z.string().nullable().optional(),
  lines: z.array(TransferLineItemSchema),
});

export const AdjustmentLineItemSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  itemId: z.string(),
  item: DocItemSummarySchema,
  lotId: z.string().nullable(),
  lot: z.object({
    id: z.string(),
    lotNumber: z.string(),
    expiryDate: z.string().nullable(),
    isExpired: z.boolean(),
  }).nullable(),
  qty: z.number(),
  uomId: z.string(),
  unitCost: z.number().nullable(),
  direction: z.enum(['INCREASE', 'DECREASE']),
  qtyBefore: z.number(),
  qtyAdjusted: z.number(),
  reasonNotes: z.string(),
});

export const AdjustmentSchema = BaseDocumentSchema.extend({
  type: z.literal('ADJUSTMENT'),
  reason: z.enum(['DAMAGE', 'EXPIRY', 'THEFT', 'COUNTING_ERROR', 'OTHER']),
  approvedBy: z.string().nullable(),
  lines: z.array(AdjustmentLineItemSchema),
  warehouseName: z.string().optional().nullable(),
});

export interface BaseDocument { id: string; documentNumber: string; type: DocumentType; status: DocumentStatus; warehouseId: string; branchId: string; notes: string | null; createdBy: string; createdAt: string; updatedAt: string; postedAt: string | null; postedBy: string | null; version: number; }
export interface LotAllocation { lotId: string; lotNumber: string; expiryDate?: string | null; allocatedQty: number; overrideReason?: string | null; }
export interface GRN extends BaseDocument { type: 'GRN'; poId: string | null; supplierId: string; supplierName?: string | null; warehouseName?: string | null; currencyId: string; currencyCode?: string | null; fxRate: number | null; fxRateCapturedAt: string | null; lines: GRNLineItem[]; }
export interface GRNLineItem { id: string; documentId: string; itemId: string; item: { id: string; code: string; name?: string; nameAr?: string; nameEn?: string; primaryUom: { id: string; code: string; name?: string; nameAr?: string; nameEn?: string; }; category?: { id: string; name: string; } | null; }; lotId: string | null; lot: { id: string; lotNumber: string; expiryDate: string | null; isExpired: boolean; } | null; qty: number; uomId: string; unitCost: number | null; poQty: number | null; receivedQty: number; unitCostForeign: number; unitCostBase: number; }
export interface PurchaseRequest extends BaseDocument { type: 'PR'; requestedByDept: string; requiredByDate: string; warehouseName?: string | null; branchName?: string | null; lines: PRLineItem[]; }
export interface PRLineItem { id: string; documentId: string; itemId: string; item: { id: string; code: string; name?: string; nameAr?: string; nameEn?: string; primaryUom: { id: string; code: string; name?: string; nameAr?: string; nameEn?: string; }; category?: { id: string; name: string; } | null; }; lotId: string | null; lot: { id: string; lotNumber: string; expiryDate: string | null; isExpired: boolean; } | null; qty: number; uomId: string; unitCost: number | null; requestedQty: number; approvedQty: number | null; }
export interface PurchaseOrder extends BaseDocument { type: 'PO'; prId: string | null; supplierId: string; supplierName?: string | null; warehouseName?: string | null; currencyId: string; currencyCode?: string | null; expectedDeliveryDate: string; lines: POLineItem[]; }
export interface POLineItem { id: string; documentId: string; itemId: string; item: { id: string; code: string; name?: string; nameAr?: string; nameEn?: string; primaryUom: { id: string; code: string; name?: string; nameAr?: string; nameEn?: string; }; category?: { id: string; name: string; } | null; }; lotId: string | null; lot: { id: string; lotNumber: string; expiryDate: string | null; isExpired: boolean; } | null; qty: number; uomId: string; unitCost: number | null; orderedQty: number; unitPrice: number; totalPrice: number; }
export interface StockIssue extends BaseDocument { type: 'ISSUE'; destinationDeptId: string; destinationDepartmentName?: string | null; departmentName?: string | null; warehouseName?: string | null; requestedBy: string; lines: IssueLineItem[]; kitchenRequest?: { id: string; requestNumber: string; } | null; }
export interface IssueLineItem { id: string; documentId: string; itemId: string; item: { id: string; code: string; name?: string; nameAr?: string; nameEn?: string; primaryUom: { id: string; code: string; name?: string; nameAr?: string; nameEn?: string; }; category?: { id: string; name: string; } | null; }; lotId: string | null; lot: { id: string; lotNumber: string; expiryDate: string | null; isExpired: boolean; } | null; qty: number; uomId: string; unitCost: number | null; requestedQty: number; issuedQty: number; lotAllocations: LotAllocation[]; }
export interface Transfer extends BaseDocument { type: 'TRANSFER'; fromWarehouseId: string; fromWarehouseName?: string; toWarehouseId: string; toWarehouseName?: string; transferStatus: TransferStatus; shippedAt: string | null; receivedAt: string | null; varianceReason?: string | null; lines: TransferLineItem[]; }
export interface TransferLineItem { id: string; documentId: string; itemId: string; item: { id: string; code: string; name?: string; nameAr?: string; nameEn?: string; primaryUom: { id: string; code: string; name?: string; nameAr?: string; nameEn?: string; }; category?: { id: string; name: string; } | null; }; lotId: string | null; lot: { id: string; lotNumber: string; expiryDate: string | null; isExpired: boolean; } | null; qty: number; uomId: string; unitCost: number | null; shippedQty: number; receivedQty: number | null; lotAllocations: LotAllocation[]; }
export type AdjustmentReason = 'DAMAGE'|'EXPIRY'|'THEFT'|'COUNTING_ERROR'|'OTHER';
export interface Adjustment extends BaseDocument { type: 'ADJUSTMENT'; reason: AdjustmentReason; approvedBy: string | null; lines: AdjustmentLineItem[]; warehouseName?: string | null; }
export interface AdjustmentLineItem { id: string; documentId: string; itemId: string; item: { id: string; code: string; name?: string; nameAr?: string; nameEn?: string; primaryUom: { id: string; code: string; name?: string; nameAr?: string; nameEn?: string; }; category?: { id: string; name: string; } | null; }; lotId: string | null; lot: { id: string; lotNumber: string; expiryDate: string | null; isExpired: boolean; } | null; qty: number; uomId: string; unitCost: number | null; direction: 'INCREASE'|'DECREASE'; qtyBefore: number; qtyAdjusted: number; reasonNotes: string; }
