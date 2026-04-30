'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function usePostAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      apiClient.post(`/operations/adjustments/${id}/post`, successSchema, {}),
    onSuccess: (_, id) => {
      queryClient.setQueryData(['adjustment', id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          status: 'POSTED',
          posted_at: new Date().toISOString(),
          timeline: [
            ...(old.timeline || []),
            { status: 'POSTED', at: new Date().toISOString(), by: 'Current User' }
          ]
        };
      });
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
    }
  });
}
