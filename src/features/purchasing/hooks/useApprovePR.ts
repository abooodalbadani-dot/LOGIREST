'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function useApprovePR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      apiClient.post(`/procurement/purchase-requests/${id}/approve`, successSchema, {}),
    onSuccess: (_, id) => {
      // Simulate state transition in cache
      queryClient.setQueryData(['purchase-request', id], (old: any) => {
        if (!old) return old;
        return { ...old, status: 'APPROVED' };
      });

      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    }
  });
}
