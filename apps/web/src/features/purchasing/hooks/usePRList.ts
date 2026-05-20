'use client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

import { BadgeStatusSchema } from '@/components/shared/StatusBadge';

const PRSummarySchema = z.object({ 
 id: z.string(), 
 document_number: z.string(), 
 status: BadgeStatusSchema, 
 department_id: z.string(), 
 warehouse_id: z.string(), 
 expected_date: z.string(), 
 created_at: z.string(), 
 created_by: z.string(), 
});

export type PRSummary = z.infer<typeof PRSummarySchema>;

export function usePRList(filters: { status?: string; department_id?: string; search?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.department_id) params.set('department_id', filters.department_id);
  if (filters.search) params.set('search', filters.search);
  params.set('page', String(filters.page ?? 1));

  return useQuery({
    queryKey: ['purchase-requests', filters],
    queryFn: ({ signal }) => apiClient.get(`/procurement/purchase-requests?${params.toString()}`, paginatedSchema(PRSummarySchema), { signal }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
