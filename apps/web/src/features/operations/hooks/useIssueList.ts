'use client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { BadgeStatusSchema } from '@/components/shared/StatusBadge';
import { paginatedSchema } from '@/types/api';
import { useOperationalScope } from '@/hooks/useOperationalScope';

export const IssueSummarySchema = z.object({
  id: z.string(),
  documentNumber: z.string(),
  status: BadgeStatusSchema,
  destinationDeptId: z.string().nullable().optional(),
  warehouseId: z.string(),
  createdAt: z.string(),
  postedAt: z.string().nullable().optional()
});

export type IssueSummary = z.infer<typeof IssueSummarySchema>;

export function useIssueList({ status, warehouse_id, page = 1 }: { status?: string; warehouse_id?: string; page?: number } = {}) {
  const { warehouseId, branchId } = useOperationalScope();
  const scopeWarehouseId = warehouse_id ?? warehouseId ?? undefined;
  return useQuery({
    queryKey: ['issues', { status, warehouse_id: scopeWarehouseId, branchId, page }],
    queryFn: async ({ signal }) => {
      const qs = new URLSearchParams();
      if (status) qs.append('status', status);
      if (scopeWarehouseId) qs.append('warehouse_id', scopeWarehouseId);
      if (branchId) qs.append('branch_id', branchId);
      qs.append('page', page.toString());

      return apiClient.get(`/operations/issues?${qs.toString()}`, paginatedSchema(IssueSummarySchema), { signal });
    },
    placeholderData: keepPreviousData,
  });
}
