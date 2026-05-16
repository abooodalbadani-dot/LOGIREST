'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { InventoryMovementSchema } from '@/types/inventory';

export function useInventoryMovements(filters: { 
 page?: number,
 search?: string,
 document_type?: string 
} = {}) {
 return useQuery({
 queryKey: ['inventory/movements', filters],
  queryFn: async ({ signal }) => {
 const qs = new URLSearchParams();
 if (filters.page) qs.append('page', filters.page.toString());
 if (filters.search) qs.append('search', filters.search);
 if (filters.document_type) qs.append('document_type', filters.document_type);
 
 const path = `/inventory/movements${qs.toString() ? `?${qs.toString()}` : ''}`;
  return apiClient.get(path, paginatedSchema(InventoryMovementSchema), { signal });
 },
 staleTime: 60_000,
 });
}

