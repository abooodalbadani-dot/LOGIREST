'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function usePostGRN(id: string, options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ signal, ...data }: { fx_rate: number; confirmation: 'ACKNOWLEDGE_IRREVERSIBLE'; version: number; signal?: AbortSignal }) => 
      apiClient.post(`/procurement/grns/${id}/post`, successSchema, data, signal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['grn', id] });
    },
    onError: (error) => {
      console.error('[usePostGRN] Failed to post GRN:', error);
    }
  });
}

