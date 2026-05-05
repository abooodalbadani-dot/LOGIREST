'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

import { AdjustmentDetail } from './useAdjustment';

export function useApproveAdjustment(id: string, options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: (version: number) =>
      apiClient.post(`/operations/adjustments/${id}/approve`, successSchema, { version }),
    onSuccess: () => {
      queryClient.setQueryData(['adjustment', id], (old: AdjustmentDetail | undefined) => {
        if (!old) return old;
        return {
          ...old,
          status: 'APPROVED' as const,
          approved_by: 'Current User',
          timeline: [
            ...(old.timeline || []),
            { status: 'APPROVED', at: new Date().toISOString(), by: 'Current User' }
          ]
        };
      });
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
    },
    onError: (error) => {
      console.error('Failed to approve adjustment:', error);
    }
  });
}
