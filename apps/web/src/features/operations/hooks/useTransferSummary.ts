'use client';

import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useOperationalScope } from '@/hooks/useOperationalScope';

export const TransferSummaryMetricsSchema = z.object({
  total: z.number(),
  inTransit: z.number(),
  overdueCount: z.number(),
});

export type TransferSummaryMetrics = z.infer<typeof TransferSummaryMetricsSchema>;

export function useTransferSummary() {
  const { warehouseId, branchId } = useOperationalScope();
  const params = new URLSearchParams();
  if (warehouseId) params.set('warehouse_id', warehouseId);
  if (branchId) params.set('branch_id', branchId);

  return useQuery({
    queryKey: ['transfers', 'summary', { warehouseId, branchId }],
    queryFn: ({ signal }) => apiClient.get(`/operations/transfers/summary?${params.toString()}`, TransferSummaryMetricsSchema, { signal }),
    staleTime: 30_000,
  });
}