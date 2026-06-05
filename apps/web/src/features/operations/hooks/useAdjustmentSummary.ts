'use client';

import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useOperationalScope } from '@/hooks/useOperationalScope';

export const AdjustmentSummaryMetricsSchema = z.object({
  total: z.number(),
  pending: z.number(),
  criticalLosses: z.number(),
});

export type AdjustmentSummaryMetrics = z.infer<typeof AdjustmentSummaryMetricsSchema>;

export function useAdjustmentSummary() {
  const { warehouseId, branchId } = useOperationalScope();
  const params = new URLSearchParams();
  if (warehouseId) params.set('warehouse_id', warehouseId);
  if (branchId) params.set('branch_id', branchId);

  return useQuery({
    queryKey: ['adjustments', 'summary', { warehouseId, branchId }],
    queryFn: ({ signal }) => apiClient.get(`/operations/adjustments/summary?${params.toString()}`, AdjustmentSummaryMetricsSchema, { signal }),
    staleTime: 30_000,
  });
}