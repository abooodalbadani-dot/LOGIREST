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
 documentNumber: z.string(),
 status: BadgeStatusSchema,
 warehouseId: z.string(),
 warehouseName: z.string().optional(),
 reason: AdjustmentReasonSchema.or(z.string()),
 approvedBy: z.string().nullable().optional(),
 createdBy: z.string(),
 createdAt: z.string(),
 postedAt: z.string().nullable().optional(),
 rawReason: z.string().optional(),
});

export type AdjustmentSummary = z.infer<typeof AdjustmentSummarySchema>;

export function useAdjustmentList(filters: { status?: string; warehouse_id?: string; search?: string; page?: number; date_from?: string; date_to?: string; sort_by?: string; sort_dir?: string } = {}) {
 const { warehouseId, branchId } = useOperationalScope();
 const scopeWarehouseId = filters.warehouse_id ?? warehouseId ?? undefined;
 const params = new URLSearchParams();
 if (filters.status) params.set('status', filters.status);
 if (scopeWarehouseId) params.set('warehouse_id', scopeWarehouseId);
 if (branchId) params.set('branch_id', branchId);
 if (filters.search) params.set('search', filters.search);
 if (filters.date_from) params.set('date_from', filters.date_from);
 if (filters.date_to) params.set('date_to', filters.date_to);
 if (filters.sort_by) params.set('sort_by', filters.sort_by);
 if (filters.sort_dir) params.set('sort_dir', filters.sort_dir);
 params.set('page', String(filters.page ?? 1));

 return useQuery({
  queryKey: ['adjustments', { ...filters, warehouseId: scopeWarehouseId, branchId, date_from: filters.date_from, date_to: filters.date_to, sort_by: filters.sort_by, sort_dir: filters.sort_dir }],
  queryFn: ({ signal }) => apiClient.get(`/operations/adjustments?${params.toString()}`, paginatedSchema(AdjustmentSummarySchema), { signal }),
  staleTime: 60_000,
  placeholderData: keepPreviousData,
 });
}
