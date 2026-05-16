'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { BadgeStatusSchema } from '@/components/shared/StatusBadge';

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
  return useQuery({
    queryKey: ['issues', { status, page }],
    queryFn: async ({ signal }) => {
      const qs = new URLSearchParams();
      if (status) qs.append('status', status);
      qs.append('page', page.toString());
      
      const res = await apiClient.get(`/operations/issues?${qs.toString()}`, z.object({
        data: z.array(IssueSummarySchema),
        meta: z.object({
          pagination: z.object({
            page: z.number(),
            pageSize: z.number(),
            total: z.number(),
            total_pages: z.number()
          })
        })
      }), { signal });
      return res;
    }
  });
}
