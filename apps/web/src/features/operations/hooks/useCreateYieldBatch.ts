'use client';

import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { QUERY_KEY, YieldBatchSchema } from './useYield';

export interface CreateYieldBatchRequest {
  recipe_id: string;
  input_qty: number;
}

export function useCreateYieldBatch() {
  const queryClient = useQueryClient();

  return useSafeMutation({
    mutationFn: (data: CreateYieldBatchRequest) =>
      apiClient.post('/operations/yield', YieldBatchSchema, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    meta: {
      suppressGlobalConflict: false,
    },
  });
}
