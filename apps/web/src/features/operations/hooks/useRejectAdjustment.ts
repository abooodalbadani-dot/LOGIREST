'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { ADJUSTMENT_STATUS } from '@logirest/shared-types';

import { AdjustmentDetail } from './useAdjustment';
import { useAuth } from '@/providers/AuthProvider';

export function useRejectAdjustment(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 const { user } = useAuth();
 const userName = user?.name || 'Unknown';
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ id, version, reject, signal }: { id: string; version: number; reject: string; signal?: AbortSignal }) =>
   apiClient.post(`/operations/adjustments/${id}/reject`, successSchema, { version, comments: reject, reject }, { signal, isRetry: true }),
  onSuccess: (_, { id, reject }) => {
   queryClient.setQueryData(['adjustments', id], (old: AdjustmentDetail | undefined) => {
    if (!old) return old;
    return {
     ...old,
     status: ADJUSTMENT_STATUS.REJECTED,
     reject,
     timeline: [
      ...(old.timeline || []),
      { status: ADJUSTMENT_STATUS.REJECTED, at: new Date().toISOString(), by: userName }
     ]
    };
   });
   queryClient.invalidateQueries({ queryKey: ['adjustments'] });
   queryClient.invalidateQueries({ queryKey: ['adjustments', id] });
   queryClient.invalidateQueries({ queryKey: ['adjustments', 'summary'] });
  },
  onError: (error) => {
   console.error('Failed to reject adjustment:', error);
  }
 });
}
