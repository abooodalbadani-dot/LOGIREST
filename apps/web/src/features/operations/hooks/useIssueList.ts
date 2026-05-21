'use client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { BadgeStatusSchema } from '@/components/shared/StatusBadge';
import { paginatedSchema } from '@/types/api';
import { useOperationalScope } from '@/hooks/useOperationalScope';

export const IssueSummarySchema = z.object({
  id: z.string(),
  document_number: z.string(),
  status: BadgeStatusSchema,
  destination_dept_id: z.string().nullable().optional(),
  warehouse_id: z.string(),
  created_at: z.string(),
  posted_at: z.string().nullable().optional()
});

export type IssueSummary = z.infer<typeof IssueSummarySchema>;

export function useIssueList({ status, page = 1 }: { status?: string; page?: number }) {
  const { warehouseId, branchId } = useOperationalScope();
  return useQuery({
    queryKey: ['issues', { status, page, warehouseId, branchId }],
    queryFn: async ({ signal }) => {
      const qs = new URLSearchParams();
      if (status) qs.append('status', status);
      if (warehouseId) qs.append('warehouse_id', warehouseId);
      if (branchId) qs.append('branch_id', branchId);
      qs.append('page', page.toString());

      return apiClient.get(`/operations/issues?${qs.toString()}`, paginatedSchema(IssueSummarySchema), { signal });
    },
    placeholderData: keepPreviousData,
  });
}
