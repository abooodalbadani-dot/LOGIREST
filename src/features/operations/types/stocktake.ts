import { z } from 'zod';
import { ALL_DOCUMENT_STATUSES, DocumentStatus } from '@/types/DocumentStatus';

export type StocktakeStatus = DocumentStatus;

export const StocktakeItemSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  itemName: z.string(),
  barcode: z.string().optional(),
  uom: z.string(),
  snapshotQty: z.number().nullable(), // Allow null during counting if needed, but usually filled
  countedQty: z.number().nullable(),
  variance: z.number().nullable(),
  varianceReason: z.string().nullable(),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  unitCost: z.number(),
});

export const StocktakeSessionSchema = z.object({
  id: z.string(),
  sessionNumber: z.string(),
  sessionName: z.string(),
  warehouseId: z.string(),
  warehouseName: z.string().optional(),
  status: z.enum(ALL_DOCUMENT_STATUSES),
  snapshotAt: z.string(),
  startedBy: z.string(),
  postedAt: z.string().nullable(),
  postedBy: z.string().nullable(),
  items: z.array(StocktakeItemSchema),
  version: z.number().default(1),
  description: z.string().optional(),
  approverComment: z.string().optional(),
  approvedAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type StocktakeSession = z.infer<typeof StocktakeSessionSchema>;
export type StocktakeItem = z.infer<typeof StocktakeItemSchema>;

export interface Stocktake extends StocktakeSession {
  // Keeping this for backward compatibility if needed, 
  // but StocktakeSession is now the source of truth
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

