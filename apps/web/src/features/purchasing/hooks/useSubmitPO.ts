'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

import { PO_STATUS } from '@/contracts/statuses';
import { type PODetail } from './usePO';

export function useSubmitPO(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();

  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: async ({ id, version }: { id: string; version: number }) => {
      const response = await apiClient.post(`/procurement/purchase-orders/${id}/submit`, successSchema, { version });
      return response;
    },
    onSuccess: (_, { id }) => {
      // Simulate state transition in cache
      queryClient.setQueryData(['purchase-order', id], (old: PODetail | undefined) => {
        if (!old) return old;
        return { ...old, status: PO_STATUS.SUBMITTED };
      });
      
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
    onError: (error) => {
      console.error('Failed to submit PO:', error);
    },
  });
}

