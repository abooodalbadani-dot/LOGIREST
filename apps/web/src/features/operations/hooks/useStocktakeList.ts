'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';
import { BadgeStatusSchema } from '@/components/shared/StatusBadge';

const StocktakeSummarySchema = z.object({
 id: z.string(),
 session_number: z.string(),
 warehouse_id: z.string(),
 status: BadgeStatusSchema,
 snapshot_at: z.string(),
 started_by: z.string(),
 posted_at: z.string().nullable(),
 posted_by: z.string().nullable(),
 total_items: z.number().optional().default(0),
 counted_items: z.number().optional().default(0),
});

export type StocktakeSummary = z.infer<typeof StocktakeSummarySchema>;

export function useStocktakeList(filters: { status?: string; warehouse_id?: string; page?: number } = {}) {
 const params = new URLSearchParams();
 if (filters.status) params.set('status', filters.status);
 if (filters.warehouse_id) params.set('warehouse_id', filters.warehouse_id);
 params.set('page', String(filters.page ?? 1));
  return useQuery({
    queryKey: ['stocktake-sessions', filters],
    queryFn: ({ signal }) => apiClient.get(`/stocktake/sessions?${params}`, paginatedSchema(StocktakeSummarySchema), { signal }),
    staleTime: 30_000,
    refetchInterval: 10000,
  });
}
