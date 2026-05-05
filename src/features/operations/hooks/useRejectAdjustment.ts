'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

import { AdjustmentDetail } from './useAdjustment';

export function useRejectAdjustment(id: string, options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ version, reject }: { version: number; reject: string }) =>
      apiClient.post(`/operations/adjustments/${id}/reject`, successSchema, { version, reject }),
    onSuccess: (_, { reject }) => {
      queryClient.setQueryData(['adjustment', id], (old: AdjustmentDetail | undefined) => {
        if (!old) return old;
        return {
          ...old,
          status: 'REJECTED' as const,
          reject,
          timeline: [
            ...(old.timeline || []),
            { status: 'REJECTED', at: new Date().toISOString(), by: 'Current User' }
          ]
        };
      });
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
    },
    onError: (error) => {
      console.error('Failed to reject adjustment:', error);
    }
  });
}
