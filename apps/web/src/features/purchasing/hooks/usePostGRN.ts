'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { toast } from 'sonner';

export function usePostGRN(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ signal, id, ...data }: { id: string; fx_rate: number; confirmation: 'ACKNOWLEDGE_IRREVERSIBLE'; version: number; signal?: AbortSignal }) => 
      apiClient.post(`/procurement/grns/${id}/post`, successSchema, data, { signal }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['grn', id] });
    },
    onError: (error) => {
      console.error('[usePostGRN] Failed to post GRN:', error);
      const message = error instanceof Error ? error.message : 'Failed to post GRN';
      toast.error(message);
    }
  });
}

