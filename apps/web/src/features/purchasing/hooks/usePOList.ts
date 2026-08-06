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
 supplierName: z.string().optional().nullable(),
 warehouseName: z.string().optional().nullable(),
 currencyCode: z.string().optional(),
 expectedDate: z.string().optional(),
 supplierTotalAmount: z.number().optional(),
 createdAt: z.string().optional(), 
});

export type POSummary = z.infer<typeof POSummarySchema>;

export function usePOList(filters: { status?: string | string[]; supplierId?: string; search?: string; page?: number } = {}) {
 const params = new URLSearchParams();
 if (filters.status) {
   const statusVal = Array.isArray(filters.status) ? filters.status.join(',') : filters.status;
   params.set('status', statusVal);
 }
 if (filters.supplierId) params.set('supplierId', filters.supplierId);
 if (filters.search) params.set('search', filters.search);
 params.set('page', String(filters.page ?? 1));
 
 return useQuery({
  queryKey: ['purchase-orders', filters],
  queryFn: ({ signal }) => apiClient.get(`/procurement/purchase-orders?${params.toString()}`, paginatedSchema(POSummarySchema), { signal }),
  staleTime: 60_000,
  placeholderData: keepPreviousData,
 });
}
