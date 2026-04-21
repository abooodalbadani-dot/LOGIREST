'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export function usePostTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      apiClient.post(`/operations/transfers/${id}/post`, z.any(), {}),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transfer', id] });
    }
  });
}
