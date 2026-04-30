'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function useRejectAdjustment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reject: string) =>
      apiClient.post(`/operations/adjustments/${id}/reject`, successSchema, { reject }),
    onSuccess: (_, reject) => {
      queryClient.setQueryData(['adjustment', id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          status: 'REJECTED',
          reject,
          timeline: [
            ...(old.timeline || []),
            { status: 'REJECTED', at: new Date().toISOString(), by: 'Current User' }
          ]
        };
      });
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
    }
  });
}
