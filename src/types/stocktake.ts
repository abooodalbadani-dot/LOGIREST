import { z } from 'zod';
export type StocktakeStatus = 
 | 'DRAFT'
 | 'STARTED'
 | 'COUNTING_COMPLETED'
 | 'VarianceSubmitted'
 | 'APPROVED'
 | 'REJECTED'
 | 'POSTED';
export interface StocktakeSession { id: string; session_number: string; warehouse_id: string; status: StocktakeStatus; snapshot_at: string; started_by: string; posted_at: string | null; posted_by: string | null; counts: StocktakeCount[]; }
export interface StocktakeCount { id: string; session_id: string; item_id: string; item: { id: string; code: string; name_ar: string; name_en: string; }; lot_id: string | null; snapshot_qty: number; counted_qty: number | null; variance: number | null; variance_reason: string | null; }
export interface WarehouseLockState { is_locked: boolean; session_id: string | null; session_number: string | null; lock_started_at: string | null; }

export const StocktakeCountSchema = z.object({
 id: z.string(),
 session_id: z.string(),
 item_id: z.string(),
 item: z.object({ id: z.string(), code: z.string(), name_ar: z.string(), name_en: z.string() }),
 lot_id: z.string().nullable(),
 snapshot_qty: z.number(),
 counted_qty: z.number().nullable(),
 variance: z.number().nullable(),
 variance_reason: z.string().nullable(),
});

export const StocktakeSessionSchema = z.object({
 id: z.string(),
 session_number: z.string(),
 warehouse_id: z.string(),
 status: z.enum(['DRAFT', 'STARTED', 'COUNTING_COMPLETED', 'VarianceSubmitted', 'APPROVED', 'REJECTED', 'POSTED']),
 snapshot_at: z.string(),
 started_by: z.string(),
 posted_at: z.string().nullable(),
 posted_by: z.string().nullable(),
 counts: z.array(StocktakeCountSchema),
});
