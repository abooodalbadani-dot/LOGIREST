'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export function usePostPO() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      apiClient.post(`/procurement/purchase-orders/${id}/post`, z.any(), {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
    }
  });
}
