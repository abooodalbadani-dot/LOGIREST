'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { PR_STATUS } from '@/contracts/statuses';
import { PRDetail } from './usePR';

export function useCancelPR(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();

  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: async ({ id, reason, version, signal }: { id: string; reason?: string; version: number; signal?: AbortSignal }) => {
      return apiClient.post(`/procurement/purchase-requests/${id}/cancel`, successSchema, { reason, version }, { signal });
    },
    onSuccess: (_, { id }) => {
      queryClient.setQueryData(['purchase-requests', id], (old: PRDetail | undefined) => {
        if (!old) return old;
        return { ...old, status: PR_STATUS.CANCELLED };
      });
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-requests', id] });
    },
    onError: (error) => {
      console.error('[useCancelPR] Failed to cancel PR:', error);
    },
  });
}