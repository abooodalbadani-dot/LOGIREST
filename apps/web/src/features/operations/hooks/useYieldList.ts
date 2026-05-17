'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { QUERY_KEY, YieldBatchSchema } from './useYield';

const YieldListResponseSchema = z.array(YieldBatchSchema);

export function useYieldList(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    queryFn: ({ signal }) => 
      apiClient.get('/operations/yield', YieldListResponseSchema, { signal }),
    staleTime: 60_000,
  });
}
