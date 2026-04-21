'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export function useApprovePR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      apiClient.post(`/procurement/purchase-requests/${id}/approve`, z.any(), {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-request', id] });
    }
  });
}
