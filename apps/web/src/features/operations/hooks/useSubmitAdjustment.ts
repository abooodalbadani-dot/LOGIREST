'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

import { ADJUSTMENT_STATUS } from '@logirest/shared-types';
import { AdjustmentDetail } from './useAdjustment';
import { useAuth } from '@/providers/AuthProvider';

export function useSubmitAdjustment(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 const { user } = useAuth();
 const userName = user?.name || 'Unknown';
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ id, version, signal }: { id: string; version: number; signal?: AbortSignal }) =>
   apiClient.post(`/operations/adjustments/${id}/submit`, successSchema, { version }, { signal, isRetry: true }),
  onSuccess: (_, { id }) => {
   queryClient.setQueryData(['adjustments', id], (old: AdjustmentDetail | undefined) => {
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
