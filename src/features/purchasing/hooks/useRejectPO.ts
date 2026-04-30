'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function useRejectPO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await apiClient.post(`/procurement/purchase-orders/${id}/reject`, successSchema, { reason });
      return response;
    },
    onSuccess: (_, { id }) => {
      // Simulate state transition in cache
      queryClient.setQueryData(['purchase-order', id], (old: any) => {
        if (!old) return old;
        return { ...old, status: 'REJECTED' };
      });
      
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
}
