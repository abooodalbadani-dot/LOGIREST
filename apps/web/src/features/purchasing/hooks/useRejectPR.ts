import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { PR_STATUS } from '@logirest/shared-types';
import { PRDetail } from './usePR';

export function useRejectPR(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, reason, version, signal }: { id: string; reason: string; version: number; signal?: AbortSignal }) => 
      apiClient.post(`/procurement/purchase-requests/${id}/reject`, successSchema, { reason, version }, { signal }),
    onSuccess: (_, { id }) => {
      // Simulate state transition in cache
      queryClient.setQueryData(['purchase-requests', id], (old: PRDetail | undefined) => {
        if (!old) return old;
        return { ...old, status: PR_STATUS.REJECTED };
      });

      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-requests', id] });
    },
    onError: (error) => {
      console.error('[useRejectPR] Failed to reject PR:', error);
    },
  });
}
