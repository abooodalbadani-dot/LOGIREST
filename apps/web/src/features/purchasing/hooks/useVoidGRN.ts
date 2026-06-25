import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

interface VoidGRNPayload {
  version: number;
}

export function useVoidGRN(grnId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VoidGRNPayload) =>
      apiClient.post(`/procurement/grns/${grnId}/void`, z.unknown(), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grn', grnId] });
      queryClient.invalidateQueries({ queryKey: ['grns'] });
    },
  });
}
