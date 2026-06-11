'use client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema, PaginatedResponse } from '@/types/api';
import { z } from 'zod';

import { BadgeStatusSchema } from '@/components/shared/StatusBadge';

const PRSummarySchema = z.object({ 
  id: z.string(), 
  documentNumber: z.string(), 
  status: BadgeStatusSchema, 
  departmentId: z.string().optional(), 
  warehouseId: z.string().optional(), 
  expectedDate: z.string().optional(), 
  createdAt: z.string().optional(), 
  createdBy: z.string().optional(),
});

export type PRSummary = z.infer<typeof PRSummarySchema>;

export function usePRList(filters: { status?: string; departmentId?: string; search?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.departmentId) params.set('departmentId', filters.departmentId);
  if (filters.search) params.set('search', filters.search);
  params.set('page', String(filters.page ?? 1));

  return useQuery({
    queryKey: ['purchase-requests', filters],
    queryFn: ({ signal }) => apiClient.get<PaginatedResponse<PRSummary>>(`/procurement/purchase-requests?${params.toString()}`, paginatedSchema(PRSummarySchema), { signal }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
