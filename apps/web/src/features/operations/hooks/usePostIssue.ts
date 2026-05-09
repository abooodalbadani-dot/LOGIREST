'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function usePostIssue(id: string, options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: (data: { confirmation: 'ACKNOWLEDGE_IRREVERSIBLE'; version: number }) => 
      apiClient.post(`/operations/issues/${id}/post`, successSchema, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
    },
    onError: (error) => {
      console.error('Failed to post issue:', error);
    }
  });
}
