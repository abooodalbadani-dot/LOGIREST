'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema, PaginatedResponse } from '@/types/api';
import { InventoryLotSchema, InventoryLot } from '@/types/inventory';
import { useAuth } from '@/providers/AuthProvider';

export function useInventoryLots(
 filters: { include_expired?: boolean; page?: number; search?: string } = {},
 options?: { enabled?: boolean }
) {
 const { activeScope } = useAuth();
 return useQuery({
  queryKey: ['inventory/lots', filters],
  queryFn: async ({ signal }) => {
   const qs = new URLSearchParams();
   if (filters.include_expired) qs.append('include_expired', 'true');
   if (filters.page) qs.append('page', filters.page.toString());
   if (filters.search) qs.append('search', filters.search);
   const path = `/inventory/lots${qs.toString() ? `?${qs.toString()}` : ''}`;
   return apiClient.get<PaginatedResponse<InventoryLot>>(path, paginatedSchema(InventoryLotSchema), { signal });
  },
  staleTime: 60_000,
  ...options,
  enabled: options?.enabled !== undefined ? options.enabled : !!activeScope.warehouseId,
 });
}
