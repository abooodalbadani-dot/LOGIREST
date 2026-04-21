'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { InventoryMovementSchema } from '@/types/inventory';

export function useInventoryMovements(filters: { page?: number } = {}) {
  return useQuery({
    queryKey: ['inventory/movements', filters],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (filters.page) qs.append('page', filters.page.toString());
      const path = `/inventory/movements${qs.toString() ? `?${qs.toString()}` : ''}`;
      return apiClient.get(path, paginatedSchema(InventoryMovementSchema));
    },
    staleTime: 60_000,
  });
}
