'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export const SupplierSchema = z.object({
 id: z.string(),
 code: z.string(),
 nameAr: z.string(),
 nameEn: z.string(),
 currencyId: z.string(),
});

export type Supplier = z.infer<typeof SupplierSchema>;

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: ({ signal }) => apiClient.get('/suppliers', z.object({ data: z.array(SupplierSchema) }), { signal }).then(res => res.data),
    staleTime: 60_000,
  });
}
