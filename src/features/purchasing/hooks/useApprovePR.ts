import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { PR_STATUS } from '@/contracts/statuses';
import { PRDetail } from './usePR';

export function useApprovePR(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, version }: { id: string; version: number }) => 
      apiClient.post(`/procurement/purchase-requests/${id}/approve`, successSchema, { version }),
    onSuccess: (_, { id }) => {
      // Simulate state transition in cache
      queryClient.setQueryData(['purchase-request', id], (old: PRDetail | undefined) => {
        if (!old) return old;
        return { ...old, status: PR_STATUS.APPROVED };
      });

      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
    onError: (error) => {
      console.error('[useApprovePR] Failed to approve PR:', error);
    },
  });
}

