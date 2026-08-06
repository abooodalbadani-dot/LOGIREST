'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { GRN_STATUS } from '@logirest/shared-types';
import { type GRNDetail } from './useGRN';

export function useSubmitGRN(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();

  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: async ({
      id,
      version,
      signal,
    }: {
      id: string;
      version: number;
      signal?: AbortSignal;
    }) => {
      const response = await apiClient.post(
        `/procurement/grns/${id}/submit`,
        successSchema,
        { version },
        { signal },
      );
      return response;
    },
    onSuccess: (_, { id }) => {
      // Optimistically update the cache to RECEIVED status
      queryClient.setQueryData(['grn', id], (old: GRNDetail | undefined) => {
        if (!old) return old;
        return { ...old, status: GRN_STATUS.RECEIVED };
      });

      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['grn', id] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => {
      console.error('[useSubmitGRN] Failed to submit GRN:', error);
    },
  });
}
