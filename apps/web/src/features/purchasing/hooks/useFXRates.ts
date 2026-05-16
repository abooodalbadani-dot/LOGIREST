'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export const FXRateSchema = z.object({
 from_currency_id: z.string(),
 to_currency_id: z.string(),
 rate: z.number(),
 effective_date: z.string(),
});

export type FXRate = z.infer<typeof FXRateSchema>;

export function useFXRates(fromCurr?: string, toCurr?: string) {
 return useQuery({
 queryKey: ['fx-rates', fromCurr, toCurr],
    queryFn: ({ signal }) => {
      const qs = `?from=${encodeURIComponent(fromCurr!)}&to=${encodeURIComponent(toCurr!)}`;
      return apiClient.get(`/currencies/fx-rates${qs}`, z.object({ data: z.array(FXRateSchema) }), { signal }).then(res => res.data);
    },
 enabled: !!fromCurr && !!toCurr,
 staleTime: 60_000,
 });
}
