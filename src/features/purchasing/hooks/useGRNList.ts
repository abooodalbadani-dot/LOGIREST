'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';
import { BadgeStatusSchema } from '@/components/ui/status-badge';

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

export function useGRNList(filters: { status?: string; warehouse_id?: string; search?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.warehouse_id) params.set('warehouse_id', filters.warehouse_id);
  if (filters.search) params.set('search', filters.search);
  params.set('page', String(filters.page ?? 1));
  
  return useQuery({
    queryKey: ['grns', filters],
    queryFn: () => apiClient.get(`/procurement/grns?${params.toString()}`, paginatedSchema(GRNSummarySchema)),
    staleTime: 60_000,
  });
}
