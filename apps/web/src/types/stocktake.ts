import { z } from 'zod';
import { STOCKTAKE_STATUSES } from './documents';

import { StocktakeStatus } from '@logirest/shared-types';


export interface StocktakeCount { 
  id: string; 
  sessionId: string; 
  itemId: string; 
  item: { id: string; code: string; name: string; nameAr?: string; nameEn?: string; }; 
  lotId: string | null; 
  snapshotQty: number; 
  countedQty: number | null; 
  variance: number | null; 
  varianceReason: string | null; 
}

export interface StocktakeSession { 
  id: string; 
  sessionNumber: string; 
  sessionName: string;
  warehouseId: string; 
  warehouseName?: string;
  status: StocktakeStatus; 
  snapshotAt: string; 
  startedBy: string; 
  postedAt: string | null; 
  postedBy: string | null; 
  createdAt: string;
  updatedAt: string;
  items: StocktakeCount[]; 
}

export interface WarehouseLockState { 
  isLocked: boolean; 
  sessionId: string | null; 
  sessionNumber: string | null; 
  lockStartedAt: string | null; 
}

export const StocktakeCountSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  itemId: z.string(),
  item: z.object({ id: z.string(), code: z.string(), name: z.string(), nameAr: z.string().optional(), nameEn: z.string().optional() }),
  lotId: z.string().nullable(),
  snapshotQty: z.number(),
  countedQty: z.number().nullable(),
  variance: z.number().nullable(),
  varianceReason: z.string().nullable(),
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
  postedAt: z.string().nullable(),
  postedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(StocktakeCountSchema),
});

