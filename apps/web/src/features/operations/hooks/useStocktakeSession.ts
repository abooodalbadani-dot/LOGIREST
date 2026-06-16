'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { BadgeStatusSchema } from '@/components/shared/StatusBadge';

const StocktakeCountSchema = z.object({
 id: z.string(),
 sessionId: z.string(),
 itemId: z.string(),
 item: z.object({ 
  id: z.string(), 
  code: z.string(), 
  nameAr: z.string(), 
  nameEn: z.string(),
  category: z.object({ nameAr: z.string(), nameEn: z.string() }).optional()
 }),
 lotId: z.string().nullable(),
 snapshotQty: z.number(),
 countedQty: z.number().nullable(),
 variance: z.number().nullable(),
 varianceReason: z.string().nullable(),
});

const StocktakeSessionSchema = z.object({
 id: z.string(),
 sessionNumber: z.string(),
 warehouseId: z.string(),
 status: BadgeStatusSchema,
 snapshotAt: z.string(),
 startedBy: z.string(),
 postedAt: z.string().nullable(),
 postedBy: z.string().nullable(),
 counts: z.array(StocktakeCountSchema),
});

export type StocktakeCount = z.infer<typeof StocktakeCountSchema>;
export type StocktakeSession = z.infer<typeof StocktakeSessionSchema>;

export function useStocktakeSession(id: string | null) {
 return useQuery({
  queryKey: ['stocktakes', id],
  queryFn: ({ signal }) => apiClient.get(`/stocktake/sessions/${id}`, StocktakeSessionSchema, { signal }),
  enabled: !!id && id !== 'undefined' && id !== 'null',
  staleTime: 30_000,
 });
}
