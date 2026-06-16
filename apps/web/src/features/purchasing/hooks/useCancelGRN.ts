'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { GRN_STATUS } from '@logirest/shared-types';

export function useCancelGRN(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();

 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: async ({ id, reason, version, signal }: { id: string; reason?: string; version: number; signal?: AbortSignal }) => {
   return apiClient.post(`/procurement/grns/${id}/cancel`, successSchema, { reason, version }, { signal });
  },
  onSuccess: (_, { id }) => {
   queryClient.invalidateQueries({ queryKey: ['grns'] });
   queryClient.invalidateQueries({ queryKey: ['grn', id] });
   queryClient.invalidateQueries({ queryKey: ['grn', id] });
  },
  onError: (error) => {
   console.error('[useCancelGRN] Failed to cancel GRN:', error);
  },
 });
}