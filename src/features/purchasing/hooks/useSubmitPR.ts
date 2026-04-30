'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function useSubmitPR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/procurement/purchase-requests/${id}/submit`, successSchema);
      return response;
    },
    onSuccess: (_, id) => {
      // Simulate state transition in cache
      queryClient.setQueryData(['purchase-request', id], (old: any) => {
        if (!old) return old;
        return { ...old, status: 'SUBMITTED' };
      });
      
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });
}
