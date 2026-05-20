'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

import { ADJUSTMENT_STATUS } from '@/contracts/statuses';
import { AdjustmentDetail } from './useAdjustment';
import { useAuth } from '@/providers/AuthProvider';

export function useSubmitAdjustment(id: string, options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userName = user?.name || 'Unknown';
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ version, signal }: { version: number; signal?: AbortSignal }) =>
      apiClient.post(`/operations/adjustments/${id}/submit`, successSchema, { version }, { signal }),
    onSuccess: () => {
      queryClient.setQueryData(['adjustment', id], (old: AdjustmentDetail | undefined) => {
        if (!old) return old;
        return {
          ...old,
          status: ADJUSTMENT_STATUS.SUBMITTED,
          timeline: [
            ...(old.timeline || []),
            { status: ADJUSTMENT_STATUS.SUBMITTED, at: new Date().toISOString(), by: userName }
          ]
        };
      });
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
    },
    onError: (error) => {
      console.error('Failed to submit adjustment:', error);
    }
  });
}
