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
 destinationDepartmentName: z.string().optional().nullable(),
 departmentName: z.string().optional().nullable(),
 warehouseId: z.string(),
 warehouseName: z.string().optional().nullable(),
 createdAt: z.string(),
 postedAt: z.string().nullable().optional()
});

export type IssueSummary = z.infer<typeof IssueSummarySchema>;

export function useIssueList({ status, warehouse_id, page = 1, search }: { status?: string; warehouse_id?: string; page?: number; search?: string } = {}) {
 const { warehouseId, branchId } = useOperationalScope();
 const scopeWarehouseId = warehouse_id ?? warehouseId ?? undefined;
 return useQuery({
  queryKey: ['issues', { status, warehouse_id: scopeWarehouseId, branchId, page, search }],
  queryFn: async ({ signal }) => {
   const qs = new URLSearchParams();
   if (status) qs.append('status', status);
   if (scopeWarehouseId) qs.append('warehouse_id', scopeWarehouseId);
   if (branchId) qs.append('branch_id', branchId);
   if (search) qs.append('search', search);
   qs.append('page', page.toString());

   return apiClient.get(`/operations/issues?${qs.toString()}`, paginatedSchema(IssueSummarySchema), { signal });
  },
  placeholderData: keepPreviousData,
 });
}
