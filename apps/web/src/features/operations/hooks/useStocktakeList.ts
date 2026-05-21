'use client';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';
import { BadgeStatusSchema } from '@/components/shared/StatusBadge';
import { useOperationalScope } from '@/hooks/useOperationalScope';

const StocktakeSummarySchema = z.object({
  id: z.string(),
  session_number: z.string(),
  warehouse_id: z.string(),
  status: BadgeStatusSchema,
  snapshot_at: z.string(),
  started_by: z.string(),
  posted_at: z.string().nullable(),
  posted_by: z.string().nullable(),
  total_items: z.number().optional().default(0),
  counted_items: z.number().optional().default(0),
});

export type StocktakeSummary = z.infer<typeof StocktakeSummarySchema>;

export function useStocktakeList(filters: { status?: string; warehouse_id?: string; search?: string; page?: number; date_from?: string; date_to?: string; sort_by?: string; sort_dir?: string } = {}) {
  const { warehouseId: scopeWarehouseId, branchId } = useOperationalScope();
  const effectiveWarehouseId = filters.warehouse_id ?? scopeWarehouseId ?? undefined;
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (effectiveWarehouseId) params.set('warehouse_id', effectiveWarehouseId);
  if (branchId) params.set('branch_id', branchId);
  if (filters.search) params.set('search', filters.search);
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.sort_by) params.set('sort_by', filters.sort_by);
  if (filters.sort_dir) params.set('sort_dir', filters.sort_dir);
  params.set('page', String(filters.page ?? 1));
  return useQuery({
    queryKey: ['stocktakes', { ...filters, warehouseId: effectiveWarehouseId, branchId, date_from: filters.date_from, date_to: filters.date_to, sort_by: filters.sort_by, sort_dir: filters.sort_dir }],
    queryFn: ({ signal }) => apiClient.get(`/stocktake/sessions?${params}`, paginatedSchema(StocktakeSummarySchema), { signal }),
    staleTime: 30_000,
    refetchInterval: 10000,
    placeholderData: keepPreviousData,
  });
}
