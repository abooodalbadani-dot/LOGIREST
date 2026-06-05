'use client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

import { BadgeStatusSchema } from '@/components/shared/StatusBadge';

const POSummarySchema = z.object({ 
  id: z.string(), 
  documentNumber: z.string(), 
  status: BadgeStatusSchema, 
  supplierId: z.string(), 
  currencyCode: z.string(), 
  expectedDate: z.string(),
  supplierTotalAmount: z.number(),
  createdAt: z.string(), 
});

export type POSummary = z.infer<typeof POSummarySchema>;

export function usePOList(filters: { status?: string; supplierId?: string; search?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.supplierId) params.set('supplier_id', filters.supplierId);
  if (filters.search) params.set('search', filters.search);
  params.set('page', String(filters.page ?? 1));
 
  return useQuery({
    queryKey: ['purchase-orders', filters],
    queryFn: ({ signal }) => apiClient.get(`/procurement/purchase-orders?${params.toString()}`, paginatedSchema(POSummarySchema), { signal }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
