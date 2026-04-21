'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

const POSummarySchema = z.object({ 
  id: z.string(), 
  document_number: z.string(), 
  status: z.string(), 
  supplier_id: z.string(), 
  currency_id: z.string(), 
  expected_delivery_date: z.string().optional(),
  total: z.number().optional(),
  created_at: z.string(), 
});

export type POSummary = z.infer<typeof POSummarySchema>;

export function usePOList(filters: { status?: string; supplier_id?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.supplier_id) params.set('supplier_id', filters.supplier_id);
  params.set('page', String(filters.page ?? 1));
  
  return useQuery({
    queryKey: ['purchase-orders', filters],
    queryFn: () => apiClient.get(`/procurement/purchase-orders?${params.toString()}`, paginatedSchema(POSummarySchema)),
    staleTime: 60_000,
  });
}
