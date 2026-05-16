'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { StockBalanceItemSchema } from '@/types/inventory';

export function useInventoryBalance(filters: { warehouse_id?: string; search?: string; page?: number } = {}) {
 return useQuery({
 queryKey: ['inventory/balance', filters],
  queryFn: async ({ signal }) => {
 const qs = new URLSearchParams();
 if (filters.warehouse_id) qs.append('warehouse_id', filters.warehouse_id);
 if (filters.search) qs.append('search', filters.search);
 if (filters.page) qs.append('page', filters.page.toString());
 const path = `/inventory/balance${qs.toString() ? `?${qs.toString()}` : ''}`;
  return apiClient.get(path, paginatedSchema(StockBalanceItemSchema), { signal });
 },
 staleTime: 60_000,
 });
}
