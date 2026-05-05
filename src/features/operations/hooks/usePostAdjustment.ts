'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

import { AdjustmentDetail } from './useAdjustment';

export function usePostAdjustment(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, version }: { id: string; version: number }) => 
      apiClient.post(`/operations/adjustments/${id}/post`, successSchema, { version }),
    onSuccess: (_, { id }) => {
      queryClient.setQueryData(['adjustment', id], (old: AdjustmentDetail | undefined) => {
        if (!old) return old;
        return {
          ...old,
          status: 'POSTED' as const,
          posted_at: new Date().toISOString(),
          timeline: [
            ...(old.timeline || []),
            { status: 'POSTED', at: new Date().toISOString(), by: 'Current User' }
          ]
        };
      });
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
    },
    onError: (error) => {
      console.error('Failed to post adjustment:', error);
    }
  });
}
