'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

const preprocessDecimal = (val: unknown) => {
 if (typeof val === 'number') return val;
 if (typeof val === 'string') return parseFloat(val);
 if (val && typeof val === 'object') {
  const raw = val as Record<string, unknown>;
  if (typeof raw.toNumber === 'function') {
   return (raw as { toNumber: () => number }).toNumber();
  }
  if ('d' in raw && 's' in raw && 'e' in raw && Array.isArray(raw.d)) {
   try {
    const s = raw.s as number;
    const e = raw.e as number;
    const d = raw.d as number[];
    let digits = '';
    for (let i = 0; i < d.length; i++) {
     let segment = String(d[i]);
     if (i > 0) {
      segment = segment.padStart(7, '0');
     }
     digits += segment;
    }
    return s * parseInt(digits, 10) * Math.pow(10, e - digits.length + 1);
   } catch (err) {
    console.error('Error parsing decimal object:', err);
   }
  }
 }
 return val;
};

export const FXRateSchema = z.preprocess(
 (data: unknown) => {
  if (data && typeof data === 'object') {
   const raw = data as Record<string, unknown>;
   return {
    ...raw,
    rate: preprocessDecimal(raw.rate),
    effectiveDate: (raw.effectiveDate as string) || (raw.effectiveFrom as string) || '',
   };
  }
  return data;
 },
 z.object({
  fromCurrencyId: z.string(),
  toCurrencyId: z.string(),
  rate: z.number(),
  effectiveDate: z.string(),
 })
);

export type FXRate = z.infer<typeof FXRateSchema>;

export function useFXRates(fromCurr?: string, toCurr?: string) {
 return useQuery({
  queryKey: ['fx-rates', fromCurr, toCurr],
  queryFn: ({ signal }) => {
   const qs = `?from=${encodeURIComponent(fromCurr!)}&to=${encodeURIComponent(toCurr!)}&isActive=true`;
   return apiClient.get(`/currencies/fx-rates${qs}`, z.array(FXRateSchema), { signal });
  },
  enabled: !!fromCurr && !!toCurr,
  staleTime: 60_000,
 });
}
