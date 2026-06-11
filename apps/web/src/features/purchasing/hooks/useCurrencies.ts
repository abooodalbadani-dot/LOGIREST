'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { CurrencySchema, type Currency } from '@/types/master-data';
import { z } from 'zod';

export { CurrencySchema };
export type { Currency };

export function useCurrencies() {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: ({ signal }) =>
      apiClient
        .get('/currencies', z.object({ data: z.array(CurrencySchema) }), { signal })
        .then((res) => res.data),
    staleTime: Infinity,
  });
}

