'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export const CurrencySchema = z.object({
  id: z.string(),
  code: z.string(),
  isBase: z.boolean(),
  name: z.string(),
  nameAr: z.string().optional(),
  nameEn: z.string().optional(),
});

export type Currency = z.infer<typeof CurrencySchema>;

export function useCurrencies() {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: ({ signal }) => apiClient.get('/currencies', z.object({ data: z.array(CurrencySchema) }), { signal }).then(res => res.data),
    staleTime: Infinity,
  });
}
