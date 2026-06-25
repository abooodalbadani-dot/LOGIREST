'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema, type PaginatedResponse } from '@/types/api';
import { StockBalanceItemSchema, type StockBalanceItem } from '@/types/inventory';

export function useWarehouseInventory(
  warehouseId: string | null | undefined,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['warehouse-inventory', warehouseId],
    queryFn: async ({ signal }) => {
      if (!warehouseId) {
        return {
          data: [],
          meta: { total: 0, page: 1, pageSize: 1000, totalPages: 1 },
        } as PaginatedResponse<StockBalanceItem>;
      }
      const path = `/inventory?warehouseId=${warehouseId}&limit=1000`;
      return apiClient.get<PaginatedResponse<StockBalanceItem>>(
        path,
        paginatedSchema(StockBalanceItemSchema),
        { signal }
      );
    },
    staleTime: 60_000,
    ...options,
    enabled: options?.enabled !== undefined ? options.enabled : !!warehouseId,
  });
}
