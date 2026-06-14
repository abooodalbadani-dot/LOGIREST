'use client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';
import { BadgeStatusSchema } from '@/components/shared/StatusBadge';
import { useOperationalScope } from '@/hooks/useOperationalScope';

export const TransferSummarySchema = z.object({ 
  id: z.string(), 
  documentNumber: z.string(), 
  transferStatus: BadgeStatusSchema, 
  fromWarehouseId: z.string(), 
  fromWarehouseName: z.string().optional().nullable(),
  toWarehouseId: z.string(), 
  toWarehouseName: z.string().optional().nullable(),
  shippedAt: z.string().nullable().optional(),
  receivedAt: z.string().nullable().optional(),
  createdAt: z.string(), 
});

export type TransferSummary = z.infer<typeof TransferSummarySchema>;

export function useTransferList(filters: { status?: string; page?: number; search?: string; warehouseId?: string; dateFrom?: string; dateTo?: string; sortBy?: string; sortDir?: string } = {}) {
  const { warehouseId, branchId } = useOperationalScope();
  const scopeWarehouseId = filters.warehouseId ?? warehouseId ?? undefined;
  const params = new URLSearchParams();
  if (filters.status) params.set('transfer_status', filters.status);
  if (scopeWarehouseId) params.set('warehouse_id', scopeWarehouseId);
  if (branchId) params.set('branch_id', branchId);
  if (filters.search) params.set('search', filters.search);
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  if (filters.sortBy) params.set('sort_by', filters.sortBy);
  if (filters.sortDir) params.set('sort_dir', filters.sortDir);
  params.set('page', String(filters.page ?? 1));
 
  return useQuery({
    queryKey: ['transfers', { ...filters, warehouseId: scopeWarehouseId, branchId }],
    queryFn: ({ signal }) => apiClient.get(`/operations/transfers?${params.toString()}`, paginatedSchema(TransferSummarySchema), { signal }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
