'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { InventoryLotSchema } from '@/types/inventory';

export function useInventoryLots(filters: { include_expired?: boolean; page?: number } = {}) {
 return useQuery({
 queryKey: ['inventory/lots', filters],
 queryFn: async () => {
 const qs = new URLSearchParams();
 if (filters.include_expired) qs.append('include_expired', 'true');
 if (filters.page) qs.append('page', filters.page.toString());
 const path = `/inventory/lots ${qs.toString() ? `?${qs.toString()}` : ''}`;
 return apiClient.get(path, paginatedSchema(InventoryLotSchema));
 },
 staleTime: 60_000,
 });
}
