import { z } from 'zod';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { BadgeStatusSchema } from '@/components/shared/StatusBadge';

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

export function useAdjustmentList(filters: { status?: string; warehouse_id?: string; search?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.warehouse_id) params.set('warehouse_id', filters.warehouse_id);
  if (filters.search) params.set('search', filters.search);
  params.set('page', String(filters.page ?? 1));

  return useQuery({
    queryKey: ['adjustments', filters],
    queryFn: ({ signal }) => apiClient.get(`/operations/adjustments?${params.toString()}`, paginatedSchema(AdjustmentSummarySchema), { signal }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
