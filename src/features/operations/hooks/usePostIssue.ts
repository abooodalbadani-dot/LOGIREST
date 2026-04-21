'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export function usePostIssue(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { confirmation: 'ACKNOWLEDGE_IRREVERSIBLE' }) => 
      apiClient.post(`/operations/issues/${id}/post`, z.any(), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issue', id] });
    }
  });
}
