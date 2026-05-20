import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { PO_STATUS } from '@/contracts/statuses';
import { PODetail } from './usePO';

export function useRejectPO(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();

  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: async ({ id, reason, version, signal }: { id: string; reason: string; version: number; signal?: AbortSignal }) => {
      const response = await apiClient.post(`/procurement/purchase-orders/${id}/reject`, successSchema, { reason, version }, { signal });
      return response;
    },
    onSuccess: (_, { id }) => {
      // Simulate state transition in cache
      queryClient.setQueryData(['purchase-order', id], (old: PODetail | undefined) => {
        if (!old) return old;
        return { ...old, status: PO_STATUS.REJECTED };
      });
      
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
    },
    onError: (error) => {
      console.error('[useRejectPO] Failed to reject PO:', error);
    },
  });
}
