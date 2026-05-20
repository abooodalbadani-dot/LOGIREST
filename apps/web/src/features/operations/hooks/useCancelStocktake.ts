'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { STOCKTAKE_STATUS } from '@/contracts/statuses';
import { useAuth } from '@/providers/AuthProvider';

export function useCancelStocktake(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userName = user?.name || 'Unknown';

  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: async ({ id, reason, version, signal }: { id: string; reason?: string; version: number; signal?: AbortSignal }) => {
      return apiClient.post(`/stocktake/sessions/${id}/cancel`, successSchema, { reason, version }, { signal });
    },
    onSuccess: (_, { id }) => {
      queryClient.setQueryData(['stocktakes', id], (old: Record<string, unknown> | undefined) => {
        if (!old) return old;
        return {
          ...old,
          status: STOCKTAKE_STATUS.CANCELLED,
          timeline: [...((old as Record<string, unknown[]>).timeline || []), { status: STOCKTAKE_STATUS.CANCELLED, at: new Date().toISOString(), by: userName }],
        };
      });
      queryClient.invalidateQueries({ queryKey: ['stocktakes'] });
      queryClient.invalidateQueries({ queryKey: ['stocktake-session', id] });
    },
    onError: (error) => {
      console.error('[useCancelStocktake] Failed to cancel stocktake:', error);
    },
  });
}