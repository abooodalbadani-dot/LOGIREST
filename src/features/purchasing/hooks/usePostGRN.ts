'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function usePostGRN(id: string, options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: (data: { fx_rate: number; confirmation: 'ACKNOWLEDGE_IRREVERSIBLE'; version: number }) => 
      apiClient.post(`/procurement/grns/${id}/post`, successSchema, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['grn', id] });
    },
    onError: (error) => {
      console.error('[usePostGRN] Failed to post GRN:', error);
    }
  });
}

