import { z } from 'zod';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { BadgeStatusSchema } from '@/components/shared/StatusBadge';
import { useOperationalScope } from '@/hooks/useOperationalScope';

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
  const { warehouseId, branchId } = useOperationalScope();
  const scopeWarehouseId = filters.warehouse_id ?? warehouseId ?? undefined;
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (scopeWarehouseId) params.set('warehouse_id', scopeWarehouseId);
  if (branchId) params.set('branch_id', branchId);
  if (filters.search) params.set('search', filters.search);
  params.set('page', String(filters.page ?? 1));

  return useQuery({
    queryKey: ['adjustments', { ...filters, warehouseId: scopeWarehouseId, branchId }],
    queryFn: ({ signal }) => apiClient.get(`/operations/adjustments?${params.toString()}`, paginatedSchema(AdjustmentSummarySchema), { signal }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
