'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export const CurrencySchema = z.object({
  id: z.string(),
  code: z.string(),
  is_base: z.boolean(),
  name_ar: z.string(),
  name_en: z.string(),
});

export type Currency = z.infer<typeof CurrencySchema>;

export function useCurrencies() {
 return useQuery({
 queryKey: ['currencies'],
 queryFn: () => apiClient.get('/currencies', z.object({ data: z.array(CurrencySchema) })).then(res => res.data),
 staleTime: Infinity,
 });
}
