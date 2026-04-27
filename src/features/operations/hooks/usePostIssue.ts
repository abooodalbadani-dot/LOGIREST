'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function usePostIssue(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { confirmation: 'ACKNOWLEDGE_IRREVERSIBLE' }) => 
      apiClient.post(`/operations/issues/${id}/post`, successSchema, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
    }
  });
}
