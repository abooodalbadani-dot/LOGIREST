import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { BadgeStatusSchema } from '@/components/ui/status-badge';

export const AdjustmentReasonSchema = z.enum(['DAMAGE', 'EXPIRY', 'THEFT', 'COUNTING_ERROR', 'OTHER']);
export type AdjustmentReason = z.infer<typeof AdjustmentReasonSchema>;

export const AdjustmentSummarySchema = z.object({
  id: z.string(),
  document_number: z.string(),
  status: BadgeStatusSchema,
  warehouse_id: z.string(),
  reason: AdjustmentReasonSchema.or(z.string()),
  approved_by: z.string().nullable().optional(),
  created_by: z.string(),
  created_at: z.string(),
  posted_at: z.string().nullable().optional(),
});

export type AdjustmentSummary = z.infer<typeof AdjustmentSummarySchema>;

export function useAdjustmentList(filters: { status?: string; warehouse_id?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.warehouse_id) params.set('warehouse_id', filters.warehouse_id);
  params.set('page', String(filters.page ?? 1));

  return useQuery({
    queryKey: ['adjustments', filters],
    queryFn: () => apiClient.get(`/operations/adjustments?${params.toString()}`, paginatedSchema(AdjustmentSummarySchema)),
    staleTime: 60_000,
  });
}
