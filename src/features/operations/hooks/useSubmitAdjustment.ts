'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function useSubmitAdjustment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post(`/operations/adjustments/${id}/submit`, successSchema, {}),
    onSuccess: () => {
      queryClient.setQueryData(['adjustment', id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          status: 'SUBMITTED',
          timeline: [
            ...(old.timeline || []),
            { status: 'SUBMITTED', at: new Date().toISOString(), by: 'Current User' }
          ]
        };
      });
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
    }
  });
}
