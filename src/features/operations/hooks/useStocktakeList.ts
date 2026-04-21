'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

const StocktakeSummarySchema = z.object({
  id: z.string(),
  session_number: z.string(),
  warehouse_id: z.string(),
  status: z.enum(['OPEN', 'COUNTING', 'REVIEW', 'POSTED', 'CANCELLED']),
  snapshot_at: z.string(),
  started_by: z.string(),
  posted_at: z.string().nullable(),
  posted_by: z.string().nullable(),
});

export type StocktakeSummary = z.infer<typeof StocktakeSummarySchema>;

export function useStocktakeList(filters: { status?: string; warehouse_id?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.warehouse_id) params.set('warehouse_id', filters.warehouse_id);
  params.set('page', String(filters.page ?? 1));
  return useQuery({
    queryKey: ['stocktake-sessions', filters],
    queryFn: () => apiClient.get(`/stocktake/sessions?${params}`, paginatedSchema(StocktakeSummarySchema)),
    staleTime: 30_000,
  });
}
