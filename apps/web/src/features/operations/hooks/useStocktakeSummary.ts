'use client';

import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useOperationalScope } from '@/hooks/useOperationalScope';

export const StocktakeSummaryMetricsSchema = z.object({
  total: z.number(),
  in_progress: z.number(),
  posted: z.number(),
});

export type StocktakeSummaryMetrics = z.infer<typeof StocktakeSummaryMetricsSchema>;

export function useStocktakeSummary() {
  const { warehouseId, branchId } = useOperationalScope();
  const params = new URLSearchParams();
  if (warehouseId) params.set('warehouse_id', warehouseId);
  if (branchId) params.set('branch_id', branchId);

  return useQuery({
    queryKey: ['stocktakes', 'summary', { warehouseId, branchId }],
    queryFn: ({ signal }) => apiClient.get(`/stocktake/sessions/summary?${params.toString()}`, StocktakeSummaryMetricsSchema, { signal }),
    staleTime: 10_000,
    refetchInterval: 10000,
  });
}