import { z } from 'zod';
import { STOCKTAKE_STATUSES } from '@/types/documents';

export type StocktakeStatus = typeof STOCKTAKE_STATUSES[number];

export const StocktakeItemSchema = z.object({
 id: z.string(),
 itemId: z.string(),
 itemName: z.string(),
 barcode: z.string().optional(),
 uom: z.string(),
 snapshotQty: z.number().nullable(),
 countedQty: z.number().nullable(),
 variance: z.number().nullable(),
 varianceReason: z.string().nullable(),
 lotNumber: z.string().optional(),
 expiryDate: z.string().optional(),
 unitCost: z.number(),
 image: z.string().nullable().optional(),
});

export const StocktakeSessionSchema = z.object({
 id: z.string(),
 sessionNumber: z.string(),
 sessionName: z.string(),
 warehouseId: z.string(),
 warehouseName: z.string().optional(),
 status: z.enum(STOCKTAKE_STATUSES),
 snapshotAt: z.string(),
 startedBy: z.string(),
 startedAt: z.string().optional(),
 postedAt: z.string().nullable(),
 postedBy: z.string().nullable(),
 items: z.array(StocktakeItemSchema),
 version: z.number().default(1),
 description: z.string().optional(),
 approverComment: z.string().optional(),
 approvedAt: z.string().optional(),
 createdAt: z.string().optional(),
 updatedAt: z.string().optional(),
 auditLog: z.array(z.object({
  status: z.string(),
  createdAt: z.string(),
  userName: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
 })).optional(),
});

export type StocktakeSession = z.infer<typeof StocktakeSessionSchema>;
export type StocktakeItem = z.infer<typeof StocktakeItemSchema>;

export type Stocktake = StocktakeSession;

export interface CreateStocktakeDTO {
 sessionName: string;
 warehouseId: string;
 description?: string;
}

export interface SubmitCountDTO {
 stocktake_id: string;
 counts: { itemId: string; countedQty: number; varianceReason?: string }[];
}

