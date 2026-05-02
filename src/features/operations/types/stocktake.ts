import { z } from 'zod';

export type StocktakeStatus =
 | 'DRAFT'
 | 'STARTED'
 | 'COUNTING_COMPLETED'
 | 'VarianceSubmitted'
 | 'APPROVED'
 | 'REJECTED'
 | 'POSTED';

/**
 * Safely normalizes incoming status strings from legacy or external sources.
 * 'VARIANCE' -> 'VarianceSubmitted'
 * 'COUNTING' -> 'STARTED'
 */
export function normalizeStocktakeStatus(status: string): StocktakeStatus {
 if (status === 'VARIANCE') return 'VarianceSubmitted';
 if (status === 'COUNTING') return 'STARTED';
 return status as StocktakeStatus;
}

export const StocktakeItemSchema = z.object({
 id: z.string(),
 itemId: z.string(),
 itemName: z.string(),
 barcode: z.string().optional(),
 uom: z.string(),
 snapshotQty: z.number(),
 countedQty: z.number().optional(),
 variance: z.number().optional(),
 varianceReason: z.string().optional(),
 lotNumber: z.string().optional(),
 expiryDate: z.string().optional(),
 unitCost: z.number(),
});

export const StocktakeSessionSchema = z.object({
 id: z.string(),
 session_number: z.string(),
 warehouse_id: z.string(),
 status: z.enum(['OPEN', 'COUNTING', 'REVIEW', 'POSTED', 'CANCELLED']),
 snapshot_at: z.string(),
 started_by: z.string(),
 posted_at: z.string().nullable(),
 posted_by: z.string().nullable(),
 counts: z.array(StocktakeItemSchema),
});

export type StocktakeSession = z.infer<typeof StocktakeSessionSchema>;

export interface StocktakeItem {
 id: string;
 itemId: string;
 itemName: string;
 barcode?: string;
 uom: string;
 snapshotQty: number; // System qty at lock time (hidden during COUNTING)
 countedQty?: number; // Entered by WH keeper
 variance?: number; // countedQty - snapshotQty (computed)
 varianceReason?: string; // Required when variance !== 0
 lotNumber?: string;
 expiryDate?: string;
 unitCost: number; // Added for financial impact calculation
}

export interface Stocktake {
 id: string;
 sessionName: string;
 warehouseId: string;
 warehouseName?: string; // Added for UI display
 status: StocktakeStatus;
 items: StocktakeItem[];
 description?: string;
 approverComment?: string;
 approvedBy?: string;
 approvedAt?: string;
 postedBy?: string;
 postedAt?: string;
 createdAt: string;
 updatedAt: string;
}

export interface CreateStocktakeDTO {
 sessionName: string;
 warehouseId: string;
 description?: string;
}

export interface SubmitCountDTO {
 stocktakeId: string;
 counts: { itemId: string; countedQty: number; varianceReason?: string }[];
}
