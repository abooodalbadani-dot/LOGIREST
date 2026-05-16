'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function usePostIssue(id: string, options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: (data: { confirmation: 'ACKNOWLEDGE_IRREVERSIBLE'; version: number; signal?: AbortSignal }) => {
      const { signal, ...payload } = data;
      return apiClient.post(`/operations/issues/${id}/post`, successSchema, payload, { signal });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'Aborted') return;
      console.error('Failed to post issue:', error);
    }
  });
}
