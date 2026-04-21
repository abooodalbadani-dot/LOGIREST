'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export function useRejectPR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      apiClient.post(`/procurement/purchase-requests/${id}/reject`, z.any(), {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-request', id] });
    }
  });
}
