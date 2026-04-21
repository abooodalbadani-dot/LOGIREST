'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export function usePostAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      apiClient.post(`/operations/adjustments/${id}/post`, z.any(), {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['adjustment', id] });
    }
  });
}
