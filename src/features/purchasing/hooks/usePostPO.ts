'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function usePostPO(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, version }: { id: string; version: number }) => 
      apiClient.post(`/procurement/purchase-orders/${id}/post`, successSchema, { version }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
    },
    onError: (error) => {
      console.error('[usePostPO] Failed to post PO:', error);
    }
  });
}

