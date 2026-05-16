'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { BadgeStatusSchema } from '@/components/shared/StatusBadge';

const StocktakeCountSchema = z.object({
 id: z.string(),
 session_id: z.string(),
 item_id: z.string(),
 item: z.object({ 
 id: z.string(), 
 code: z.string(), 
 name_ar: z.string(), 
 name_en: z.string(),
 category: z.object({ name_ar: z.string(), name_en: z.string() }).optional()
 }),
 lot_id: z.string().nullable(),
 snapshot_qty: z.number(),
 counted_qty: z.number().nullable(),
 variance: z.number().nullable(),
 variance_reason: z.string().nullable(),
});

const StocktakeSessionSchema = z.object({
 id: z.string(),
 session_number: z.string(),
 warehouse_id: z.string(),
 status: BadgeStatusSchema,
 snapshot_at: z.string(),
 started_by: z.string(),
 posted_at: z.string().nullable(),
 posted_by: z.string().nullable(),
 counts: z.array(StocktakeCountSchema),
});

export type StocktakeCount = z.infer<typeof StocktakeCountSchema>;
export type StocktakeSession = z.infer<typeof StocktakeSessionSchema>;

export function useStocktakeSession(id: string | null) {
  return useQuery({
    queryKey: ['stocktake-session', id],
    queryFn: ({ signal }) => apiClient.get(`/stocktake/sessions/${id}`, StocktakeSessionSchema, { signal }),
    enabled: !!id,
    staleTime: 30_000,
  });
}
