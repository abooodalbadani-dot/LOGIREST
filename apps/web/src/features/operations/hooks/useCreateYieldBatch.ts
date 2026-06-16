'use client';

import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { toast } from 'sonner';
import { QUERY_KEY, YieldBatchSchema } from './useYield';

export interface CreateYieldBatchRequest {
 recipeName: string;
 category: string;
 inputQty: number;
 outputQty: number;
 standardYield?: number;
 warehouseId?: string;
}

export function useCreateYieldBatch() {
 const queryClient = useQueryClient();

 return useSafeMutation({
  mutationFn: (data: CreateYieldBatchRequest) =>
   apiClient.post('/operations/yield', YieldBatchSchema, data),
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  },
  onError: (error: unknown) => {
   const message = error instanceof Error ? error.message : 'Operation failed';
   toast.error(message);
  },
  meta: {
   suppressGlobalConflict: false,
  },
 });
}
