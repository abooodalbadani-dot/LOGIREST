'use client';

import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export const QUERY_KEY = ['yield'] as const;

export const YieldBatchSchema = z.object({
  id: z.string(),
  recipe_name: z.string(),
  category: z.string(),
  input_qty: z.number(),
  output_qty: z.number(),
  waste_qty: z.number(),
  yield_pct: z.number(),
  standard_yield: z.number(),
  efficiency: z.number(),
  created_at: z.string().optional(),
});

export type YieldBatch = z.infer<typeof YieldBatchSchema>;

export function useYield(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: ({ signal }) => apiClient.get(`/operations/yield/${id}`, YieldBatchSchema, { signal }),
    enabled: !!id && id !== 'new' && id !== 'undefined' && id !== 'null',
    staleTime: 60_000,
  });
}
