'use client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';
import { BadgeStatusSchema } from '@/components/shared/StatusBadge';

const GRNSummarySchema = z.object({ 
 id: z.string(), 
 documentNumber: z.string(), 
 status: BadgeStatusSchema, 
 supplierId: z.string().optional(), 
 supplierName: z.string().optional().nullable(), 
 poId: z.string().optional(), 
 poNumber: z.string().optional(), 
 warehouseId: z.string().optional(), 
 warehouseName: z.string().optional().nullable(), 
 createdAt: z.string().optional(), 
 supplierTotalAmount: z.number().optional(),
 postedAt: z.string().nullable().optional(),
});

export type GRNSummary = z.infer<typeof GRNSummarySchema>;

export function useGRNList(filters: { status?: string; warehouseId?: string; search?: string; page?: number; sortField?: string; sortOrder?: string } = {}) {
 const params = new URLSearchParams();
 if (filters.status) params.set('status', filters.status);
 if (filters.warehouseId) params.set('warehouseId', filters.warehouseId);
 if (filters.search) params.set('search', filters.search);
 if (filters.sortField) params.set('sortField', filters.sortField);
 if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);
 params.set('page', String(filters.page ?? 1));
 
 return useQuery({
  queryKey: ['grns', filters],
  queryFn: ({ signal }) => apiClient.get(`/procurement/grns?${params.toString()}`, paginatedSchema(GRNSummarySchema), { signal }),
  staleTime: 60_000,
  placeholderData: keepPreviousData,
 });
}
