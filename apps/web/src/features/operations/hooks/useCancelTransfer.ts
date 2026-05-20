'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { TRANSFER_STATUS } from '@/contracts/statuses';
import { TransferDetail } from './useTransfer';
import { useAuth } from '@/providers/AuthProvider';

export function useCancelTransfer(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userName = user?.name || 'Unknown';

  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: async ({ id, reason, version, signal }: { id: string; reason?: string; version: number; signal?: AbortSignal }) => {
      return apiClient.post(`/operations/transfers/${id}/cancel`, successSchema, { reason, version }, { signal });
    },
    onSuccess: (_, { id }) => {
      queryClient.setQueryData(['transfers', id], (old: TransferDetail | undefined) => {
        if (!old) return old;
        return {
          ...old,
          transfer_status: TRANSFER_STATUS.CANCELLED,
          status: TRANSFER_STATUS.CANCELLED,
        };
      });
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transfers', id] });
    },
    onError: (error) => {
      console.error('[useCancelTransfer] Failed to cancel transfer:', error);
    },
  });
}