'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema, PaginatedResponse } from '@/types/api';
import { InventoryMovementSchema, InventoryMovement } from '@/types/inventory';

import { useAuth } from '@/providers/AuthProvider';

export function useInventoryMovements(
 filters: { 
  page?: number;
  search?: string;
  documentType?: string;
  startDate?: string;
  endDate?: string;
 } = {},
 options?: { enabled?: boolean }
) {
 const { activeScope } = useAuth();
 return useQuery({
  queryKey: ['inventory/movements', filters],
  queryFn: async ({ signal }) => {
   const qs = new URLSearchParams();
   if (filters.page) qs.append('page', filters.page.toString());
   if (filters.search) qs.append('search', filters.search);
   if (filters.documentType) qs.append('documentType', filters.documentType);
   if (filters.startDate) qs.append('startDate', filters.startDate);
   if (filters.endDate) qs.append('endDate', filters.endDate);
   
   const path = `/inventory/movements${qs.toString() ? `?${qs.toString()}` : ''}`;
   return apiClient.get<PaginatedResponse<InventoryMovement>>(path, paginatedSchema(InventoryMovementSchema), { signal });
  },
  staleTime: 60_000,
  ...options,
  enabled: options?.enabled !== undefined ? options.enabled : !!activeScope.warehouseId,
 });
}
