'use client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';
import { BadgeStatusSchema } from '@/components/shared/StatusBadge';
import { useOperationalScope } from '@/hooks/useOperationalScope';

export const TransferSummarySchema = z.object({ 
  id: z.string(), 
  document_number: z.string(), 
  transfer_status: BadgeStatusSchema, 
  from_warehouse_id: z.string(), 
  to_warehouse_id: z.string(), 
  shipped_at: z.string().nullable().optional(),
  received_at: z.string().nullable().optional(),
  created_at: z.string(), 
});

export type TransferSummary = z.infer<typeof TransferSummarySchema>;

export function useTransferList(filters: { status?: string; page?: number; search?: string } = {}) {
  const { warehouseId, branchId } = useOperationalScope();
  const params = new URLSearchParams();
  if (filters.status) params.set('transfer_status', filters.status);
  if (warehouseId) params.set('warehouse_id', warehouseId);
  if (branchId) params.set('branch_id', branchId);
  params.set('page', String(filters.page ?? 1));
  if (filters.search) params.set('search', filters.search);
 
  return useQuery({
    queryKey: ['transfers', { ...filters, warehouseId, branchId }],
    queryFn: ({ signal }) => apiClient.get(`/operations/transfers?${params.toString()}`, paginatedSchema(TransferSummarySchema), { signal }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
