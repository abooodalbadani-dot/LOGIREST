'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

import { BadgeStatusSchema } from '@/components/shared/StatusBadge';

const POSummarySchema = z.object({ 
 id: z.string(), 
 document_number: z.string(), 
 status: BadgeStatusSchema, 
 supplier_id: z.string(), 
 currency_code: z.string(), 
 expected_date: z.string(),
 supplier_total_amount: z.number(),
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
    queryFn: ({ signal }) => apiClient.get(`/procurement/purchase-orders?${params.toString()}`, paginatedSchema(POSummarySchema), signal),
    staleTime: 60_000,
  });
}
