import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { PRDetail } from './usePR';

export function useRejectPR(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, reason, version }: { id: string; reason: string; version: number }) => 
      apiClient.post(`/procurement/purchase-requests/${id}/reject`, successSchema, { reason, version }),
    onSuccess: (_, { id }) => {
      // Simulate state transition in cache
      queryClient.setQueryData(['purchase-request', id], (old: PRDetail | undefined) => {
        if (!old) return old;
        return { ...old, status: 'REJECTED' as const };
      });

      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
    onError: (error) => {
      console.error('[useRejectPR] Failed to reject PR:', error);
    },
  });
}
