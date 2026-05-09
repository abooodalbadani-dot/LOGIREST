'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export const SupplierSchema = z.object({
 id: z.string(),
 code: z.string(),
 name_ar: z.string(),
 name_en: z.string(),
 currency_id: z.string(),
});

export type Supplier = z.infer<typeof SupplierSchema>;

export function useSuppliers() {
 return useQuery({
 queryKey: ['suppliers'],
 queryFn: () => apiClient.get('/suppliers', z.object({ data: z.array(SupplierSchema) })).then(res => res.data),
 staleTime: 60_000,
 });
}
