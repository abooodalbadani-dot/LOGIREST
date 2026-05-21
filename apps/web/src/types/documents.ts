import { z } from 'zod';
import { ALL_STATUSES as ALL_DOCUMENT_STATUSES, DocumentStatus, ALL_TRANSFER_STATUSES, TransferStatus, ALL_STOCKTAKE_STATUSES as STOCKTAKE_STATUSES, StocktakeStatus } from '@logirest/shared-types';

export type { DocumentStatus, TransferStatus, StocktakeStatus };
export { STOCKTAKE_STATUSES };
export type DocumentStatusTypes = DocumentStatus;
export type DocumentType = 'GRN'|'ISSUE'|'TRANSFER'|'ADJUSTMENT'|'PR'|'PO'|'STOCKTAKE'|'KITCHEN_REQUEST';

export const BaseDocumentSchema = z.object({
  id: z.string(),
  document_number: z.string(),
  type: z.enum(['GRN', 'ISSUE', 'TRANSFER', 'ADJUSTMENT', 'PR', 'PO', 'STOCKTAKE', 'KITCHEN_REQUEST']),
  status: z.enum(ALL_DOCUMENT_STATUSES),
  warehouse_id: z.string(),
  branch_id: z.string(),
  notes: z.string().nullable(),
  created_by: z.string(),
  created_at: z.string().default(() => new Date().toISOString()),
  updated_at: z.string().default(() => new Date().toISOString()),
  posted_at: z.string().nullable(),
  posted_by: z.string().nullable(),
  version: z.number().default(1),
});

export const LotAllocationSchema = z.object({
  lot_id: z.string(),
  lot_number: z.string(),
  expiry_date: z.string().nullable().optional(),
  allocated_qty: z.number(),
  override_reason: z.string().nullable().optional(),
});

export const DocItemSummarySchema = z.object({
  id: z.string(),
  code: z.string(),
  name_ar: z.string(),
  name_en: z.string(),
  primary_uom: z.object({
    id: z.string(),
    code: z.string(),
    name_ar: z.string(),
    name_en: z.string(),
  }),
});

export const GRNLineItemSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  item_id: z.string(),
  item: DocItemSummarySchema,
  lot_id: z.string().nullable(),
  lot: z.object({
    id: z.string(),
    lot_number: z.string(),
    expiry_date: z.string().nullable(),
    is_expired: z.boolean(),
  }).nullable(),
  qty: z.number(),
  uom_id: z.string(),
  unit_cost: z.number().nullable(),
  po_qty: z.number().nullable(),
  received_qty: z.number(),
  unit_cost_foreign: z.number(),
  unit_cost_base: z.number(),
});

export const GRNSchema = BaseDocumentSchema.extend({
  type: z.literal('GRN'),
  po_id: z.string().nullable(),
  supplier_id: z.string(),
  currency_id: z.string(),
  fx_rate: z.number().nullable(),
  fx_rate_captured_at: z.string().nullable(),
  lines: z.array(GRNLineItemSchema),
});

export const PRLineItemSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  item_id: z.string(),
  item: DocItemSummarySchema,
  lot_id: z.string().nullable(),
  lot: z.object({
    id: z.string(),
    lot_number: z.string(),
    expiry_date: z.string().nullable(),
    is_expired: z.boolean(),
  }).nullable(),
  qty: z.number(),
  uom_id: z.string(),
  unit_cost: z.number().nullable(),
  requested_qty: z.number(),
  approved_qty: z.number().nullable(),
});

export const PurchaseRequestSchema = BaseDocumentSchema.extend({
  type: z.literal('PR'),
  requested_by_dept: z.string(),
  required_by_date: z.string(),
  lines: z.array(PRLineItemSchema),
});

export const POLineItemSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  item_id: z.string(),
  item: DocItemSummarySchema,
  lot_id: z.string().nullable(),
  lot: z.object({
    id: z.string(),
    lot_number: z.string(),
    expiry_date: z.string().nullable(),
    is_expired: z.boolean(),
  }).nullable(),
  qty: z.number(),
  uom_id: z.string(),
  unit_cost: z.number().nullable(),
  ordered_qty: z.number(),
  unit_price: z.number(),
  total_price: z.number(),
});

export const PurchaseOrderSchema = BaseDocumentSchema.extend({
  type: z.literal('PO'),
  pr_id: z.string().nullable(),
  supplier_id: z.string(),
  currency_id: z.string(),
  expected_delivery_date: z.string(),
  lines: z.array(POLineItemSchema),
});

export const IssueLineItemSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  item_id: z.string(),
  item: DocItemSummarySchema,
  lot_id: z.string().nullable(),
  lot: z.object({
    id: z.string(),
    lot_number: z.string(),
    expiry_date: z.string().nullable(),
    is_expired: z.boolean(),
  }).nullable(),
  qty: z.number(),
  uom_id: z.string(),
  unit_cost: z.number().nullable(),
  requested_qty: z.number(),
  issued_qty: z.number(),
  lot_allocations: z.array(LotAllocationSchema),
});

export const StockIssueSchema = BaseDocumentSchema.extend({
  type: z.literal('ISSUE'),
  destination_dept_id: z.string(),
  requested_by: z.string(),
  lines: z.array(IssueLineItemSchema),
});

export const TransferLineItemSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  item_id: z.string(),
  item: DocItemSummarySchema,
  lot_id: z.string().nullable(),
  lot: z.object({
    id: z.string(),
    lot_number: z.string(),
    expiry_date: z.string().nullable(),
    is_expired: z.boolean(),
  }).nullable(),
  qty: z.number(),
  uom_id: z.string(),
  unit_cost: z.number().nullable(),
  shipped_qty: z.number(),
  received_qty: z.number().nullable(),
  lot_allocations: z.array(LotAllocationSchema).default([]),
});

export const TransferSchema = BaseDocumentSchema.extend({
  type: z.literal('TRANSFER'),
  from_warehouse_id: z.string(),
  from_warehouse_name: z.string().optional(),
  to_warehouse_id: z.string(),
  to_warehouse_name: z.string().optional(),
  transfer_status: z.enum(ALL_TRANSFER_STATUSES),
  shipped_at: z.string().nullable(),
  received_at: z.string().nullable(),
  variance_reason: z.string().nullable().optional(),
  lines: z.array(TransferLineItemSchema),
});

export const AdjustmentLineItemSchema = z.object({
  id: z.string(),
  document_id: z.string(),
  item_id: z.string(),
  item: DocItemSummarySchema,
  lot_id: z.string().nullable(),
  lot: z.object({
    id: z.string(),
    lot_number: z.string(),
    expiry_date: z.string().nullable(),
    is_expired: z.boolean(),
  }).nullable(),
  qty: z.number(),
  uom_id: z.string(),
  unit_cost: z.number().nullable(),
  direction: z.enum(['INCREASE', 'DECREASE']),
  qty_before: z.number(),
  qty_adjusted: z.number(),
  reason_notes: z.string(),
});

export const AdjustmentSchema = BaseDocumentSchema.extend({
  type: z.literal('ADJUSTMENT'),
  reason: z.enum(['DAMAGE', 'EXPIRY', 'THEFT', 'COUNTING_ERROR', 'OTHER']),
  approved_by: z.string().nullable(),
  lines: z.array(AdjustmentLineItemSchema),
});

export interface BaseDocument { id: string; document_number: string; type: DocumentType; status: DocumentStatus; warehouse_id: string; branch_id: string; notes: string | null; created_by: string; created_at: string; updated_at: string; posted_at: string | null; posted_by: string | null; version: number; }
export interface LotAllocation { lot_id: string; lot_number: string; expiry_date?: string | null; allocated_qty: number; override_reason?: string | null; }
export interface GRN extends BaseDocument { type: 'GRN'; po_id: string | null; supplier_id: string; currency_id: string; fx_rate: number | null; fx_rate_captured_at: string | null; lines: GRNLineItem[]; }
export interface GRNLineItem { id: string; document_id: string; item_id: string; item: { id: string; code: string; name_ar: string; name_en: string; primary_uom: { id: string; code: string; name_ar: string; name_en: string; } }; lot_id: string | null; lot: { id: string; lot_number: string; expiry_date: string | null; is_expired: boolean; } | null; qty: number; uom_id: string; unit_cost: number | null; po_qty: number | null; received_qty: number; unit_cost_foreign: number; unit_cost_base: number; }
export interface PurchaseRequest extends BaseDocument { type: 'PR'; requested_by_dept: string; required_by_date: string; lines: PRLineItem[]; }
export interface PRLineItem { id: string; document_id: string; item_id: string; item: { id: string; code: string; name_ar: string; name_en: string; primary_uom: { id: string; code: string; name_ar: string; name_en: string; } }; lot_id: string | null; lot: { id: string; lot_number: string; expiry_date: string | null; is_expired: boolean; } | null; qty: number; uom_id: string; unit_cost: number | null; requested_qty: number; approved_qty: number | null; }
export interface PurchaseOrder extends BaseDocument { type: 'PO'; pr_id: string | null; supplier_id: string; currency_id: string; expected_delivery_date: string; lines: POLineItem[]; }
export interface POLineItem { id: string; document_id: string; item_id: string; item: { id: string; code: string; name_ar: string; name_en: string; primary_uom: { id: string; code: string; name_ar: string; name_en: string; } }; lot_id: string | null; lot: { id: string; lot_number: string; expiry_date: string | null; is_expired: boolean; } | null; qty: number; uom_id: string; unit_cost: number | null; ordered_qty: number; unit_price: number; total_price: number; }
export interface StockIssue extends BaseDocument { type: 'ISSUE'; destination_dept_id: string; requested_by: string; lines: IssueLineItem[]; }
export interface IssueLineItem { id: string; document_id: string; item_id: string; item: { id: string; code: string; name_ar: string; name_en: string; primary_uom: { id: string; code: string; name_ar: string; name_en: string; } }; lot_id: string | null; lot: { id: string; lot_number: string; expiry_date: string | null; is_expired: boolean; } | null; qty: number; uom_id: string; unit_cost: number | null; requested_qty: number; issued_qty: number; lot_allocations: LotAllocation[]; }
export interface Transfer extends BaseDocument { type: 'TRANSFER'; from_warehouse_id: string; from_warehouse_name?: string; to_warehouse_id: string; to_warehouse_name?: string; transfer_status: TransferStatus; shipped_at: string | null; received_at: string | null; variance_reason?: string | null; lines: TransferLineItem[]; }
export interface TransferLineItem { id: string; document_id: string; item_id: string; item: { id: string; code: string; name_ar: string; name_en: string; primary_uom: { id: string; code: string; name_ar: string; name_en: string; } }; lot_id: string | null; lot: { id: string; lot_number: string; expiry_date: string | null; is_expired: boolean; } | null; qty: number; uom_id: string; unit_cost: number | null; shipped_qty: number; received_qty: number | null; lot_allocations: LotAllocation[]; }
export type AdjustmentReason = 'DAMAGE'|'EXPIRY'|'THEFT'|'COUNTING_ERROR'|'OTHER';
export interface Adjustment extends BaseDocument { type: 'ADJUSTMENT'; reason: AdjustmentReason; approved_by: string | null; lines: AdjustmentLineItem[]; }
export interface AdjustmentLineItem { id: string; document_id: string; item_id: string; item: { id: string; code: string; name_ar: string; name_en: string; primary_uom: { id: string; code: string; name_ar: string; name_en: string; } }; lot_id: string | null; lot: { id: string; lot_number: string; expiry_date: string | null; is_expired: boolean; } | null; qty: number; uom_id: string; unit_cost: number | null; direction: 'INCREASE'|'DECREASE'; qty_before: number; qty_adjusted: number; reason_notes: string; }
