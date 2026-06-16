'use client';

import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export const QUERY_KEY = ['yield'] as const;

export const YieldBatchSchema = z.object({
 id: z.string(),
 recipeName: z.string(),
 category: z.string(),
 inputQty: z.number(),
 outputQty: z.number(),
 wasteQty: z.number(),
 yieldPct: z.number(),
 standardYield: z.number(),
 efficiency: z.number(),
 createdAt: z.string().optional(),
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
