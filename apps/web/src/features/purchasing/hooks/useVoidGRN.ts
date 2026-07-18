import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { toast } from 'sonner';
import { invalidateGRNQueries, invalidatePOQueries, invalidateInventoryQueries } from '@/lib/react-query/invalidation';

interface VoidGRNPayload {
  version: number;
}

export function useVoidGRN(grnId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VoidGRNPayload) => {
      try {
        return await apiClient.post(`/procurement/grns/${grnId}/void`, z.unknown(), payload);
      } catch (error: unknown) {
        let errorMessage = 'Failed to void document';
        if (error && typeof error === 'object') {
          const errObj = error as Record<string, unknown>;
          const response = errObj.response as Record<string, unknown> | undefined;
          const data = response?.data as Record<string, unknown> | undefined;
          if (typeof data?.message === 'string') {
            errorMessage = data.message;
          } else if (typeof errObj.message === 'string') {
            errorMessage = errObj.message;
          }
        }
        toast.error(errorMessage);
        throw error;
      }
    },
    onSuccess: () => {
      invalidateGRNQueries(queryClient, grnId);
      invalidatePOQueries(queryClient);
      invalidateInventoryQueries(queryClient);
    },
  });
}
