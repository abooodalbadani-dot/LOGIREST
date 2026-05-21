import { z } from 'zod';
import { STOCKTAKE_STATUSES } from '@/types/documents';

export type StocktakeStatus = typeof STOCKTAKE_STATUSES[number];

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
  status: z.enum(STOCKTAKE_STATUSES),
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
  audit_log: z.array(z.object({
    status: z.string(),
    created_at: z.string(),
    user_name: z.string().nullable().optional(),
    comment: z.string().nullable().optional(),
  })).optional(),
});

export type StocktakeSession = z.infer<typeof StocktakeSessionSchema>;
export type StocktakeItem = z.infer<typeof StocktakeItemSchema>;

export type Stocktake = StocktakeSession;

export interface CreateStocktakeDTO {
  session_name: string;
  warehouse_id: string;
  description?: string;
}

export interface SubmitCountDTO {
  stocktake_id: string;
  counts: { item_id: string; counted_qty: number; variance_reason?: string }[];
}

