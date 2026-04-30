'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function useRejectPR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      apiClient.post(`/procurement/purchase-requests/${id}/reject`, successSchema, { reason }),
    onSuccess: (_, { id }) => {
      // Simulate state transition in cache
      queryClient.setQueryData(['purchase-request', id], (old: any) => {
        if (!old) return old;
        return { ...old, status: 'REJECTED' };
      });

      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    }
  });
}
