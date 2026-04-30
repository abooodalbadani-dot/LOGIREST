'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function useApproveAdjustment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post(`/operations/adjustments/${id}/approve`, successSchema, {}),
    onSuccess: () => {
      queryClient.setQueryData(['adjustment', id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          status: 'APPROVED',
          approved_by: 'Current User',
          timeline: [
            ...(old.timeline || []),
            { status: 'APPROVED', at: new Date().toISOString(), by: 'Current User' }
          ]
        };
      });
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
    }
  });
}
