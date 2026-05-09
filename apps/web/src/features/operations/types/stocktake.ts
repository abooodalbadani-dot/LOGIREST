import { z } from 'zod';
import { ALL_DOCUMENT_STATUSES, DocumentStatus } from '@/types/DocumentStatus';

export type StocktakeStatus = DocumentStatus;

export const StocktakeItemSchema = z.object({
  id: z.string(),
  item_id: z.string(),
  item_name: z.string(),
  barcode: z.string().optional(),
  uom: z.string(),
  snapshot_qty: z.number().nullable(),
  counted_qty: z.number().nullable(),
  variance: z.number().nullable(),
  variance_reason: z.string().nullable(),
  lot_number: z.string().optional(),
  expiry_date: z.string().optional(),
  unit_cost: z.number(),
});

export const StocktakeSessionSchema = z.object({
  id: z.string(),
  session_number: z.string(),
  session_name: z.string(),
  warehouse_id: z.string(),
  warehouse_name: z.string().optional(),
  status: z.enum(ALL_DOCUMENT_STATUSES),
  snapshot_at: z.string(),
  started_by: z.string(),
  started_at: z.string().optional(),
  posted_at: z.string().nullable(),
  posted_by: z.string().nullable(),
  items: z.array(StocktakeItemSchema),
  version: z.number().default(1),
  description: z.string().optional(),
  approver_comment: z.string().optional(),
  approved_at: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type StocktakeSession = z.infer<typeof StocktakeSessionSchema>;
export type StocktakeItem = z.infer<typeof StocktakeItemSchema>;

export interface Stocktake extends StocktakeSession {
  // Keeping this for backward compatibility if needed, 
  // but StocktakeSession is now the source of truth
}

export interface CreateStocktakeDTO {
  session_name: string;
  warehouse_id: string;
  description?: string;
}

export interface SubmitCountDTO {
  stocktake_id: string;
  counts: { item_id: string; counted_qty: number; variance_reason?: string }[];
}

