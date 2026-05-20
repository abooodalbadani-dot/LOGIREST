'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';
import { BadgeStatusSchema } from '@/components/shared/StatusBadge';

const GRNSummarySchema = z.object({ 
 id: z.string(), 
 document_number: z.string(), 
 status: BadgeStatusSchema, 
 supplier_id: z.string(), 
 currency_id: z.string(), 
 warehouse_id: z.string(), 
 created_at: z.string(), 
 posted_at: z.string().nullable() 
});

export type GRNSummary = z.infer<typeof GRNSummarySchema>;

export function useGRNList(filters: { status?: string; warehouse_id?: string; search?: string; page?: number; sort_field?: string; sort_order?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.warehouse_id) params.set('warehouse_id', filters.warehouse_id);
  if (filters.search) params.set('search', filters.search);
  if (filters.sort_field) params.set('sort_field', filters.sort_field);
  if (filters.sort_order) params.set('sort_order', filters.sort_order);
  params.set('page', String(filters.page ?? 1));
 
  return useQuery({
    queryKey: ['grns', filters],
    queryFn: ({ signal }) => apiClient.get(`/procurement/grns?${params.toString()}`, paginatedSchema(GRNSummarySchema), { signal }),
    staleTime: 60_000,
  });
}
