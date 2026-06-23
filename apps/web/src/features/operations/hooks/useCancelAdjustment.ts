'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { ADJUSTMENT_STATUS } from '@logirest/shared-types';
import { AdjustmentDetail } from './useAdjustment';
import { useAuth } from '@/providers/AuthProvider';

export function useCancelAdjustment(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 const { user } = useAuth();
 const userName = user?.name || 'Unknown';

 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: async ({ id, reason, version, signal }: { id: string; reason?: string; version: number; signal?: AbortSignal }) => {
   return apiClient.post(`/operations/adjustments/${id}/cancel`, successSchema, { reason, version }, { signal, isRetry: true });
  },
  onSuccess: (_, { id }) => {
   queryClient.setQueryData(['adjustments', id], (old: AdjustmentDetail | undefined) => {
    if (!old) return old;
    return {
     ...old,
     status: ADJUSTMENT_STATUS.CANCELLED,
     timeline: [...(old.timeline || []), { status: ADJUSTMENT_STATUS.CANCELLED, at: new Date().toISOString(), by: userName }],
    };
   });
   queryClient.invalidateQueries({ queryKey: ['adjustments'] });
   queryClient.invalidateQueries({ queryKey: ['adjustments', id] });
   queryClient.invalidateQueries({ queryKey: ['adjustments', 'summary'] });
  },
  onError: (error) => {
   console.error('[useCancelAdjustment] Failed to cancel adjustment:', error);
  },
 });
}