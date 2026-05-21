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

export function useTransferList(filters: { status?: string; page?: number; search?: string; warehouse_id?: string; date_from?: string; date_to?: string; sort_by?: string; sort_dir?: string } = {}) {
  const { warehouseId, branchId } = useOperationalScope();
  const scopeWarehouseId = filters.warehouse_id ?? warehouseId ?? undefined;
  const params = new URLSearchParams();
  if (filters.status) params.set('transfer_status', filters.status);
  if (scopeWarehouseId) params.set('warehouse_id', scopeWarehouseId);
  if (branchId) params.set('branch_id', branchId);
  if (filters.search) params.set('search', filters.search);
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.sort_dir) params.set('sort_dir', filters.sort_dir);
  params.set('page', String(filters.page ?? 1));
 
  return useQuery({
    queryKey: ['transfers', { ...filters, warehouseId: scopeWarehouseId, branchId, date_from: filters.date_from, date_to: filters.date_to, sort_by: filters.sort_by, sort_dir: filters.sort_dir }],
    queryFn: ({ signal }) => apiClient.get(`/operations/transfers?${params.toString()}`, paginatedSchema(TransferSummarySchema), { signal }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
