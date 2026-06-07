'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { toast } from 'sonner';

export function usePostPO(options?: { onConflict?: () => void, messages?: { successMessage?: string } }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, version, signal }: { id: string; version: number; signal?: AbortSignal }) => 
      apiClient.post(`/procurement/purchase-orders/${id}/post`, successSchema, { version }, { signal }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders', id] });
      toast.success(options?.messages?.successMessage || 'Purchase order posted successfully');
    },
    onError: (error) => {
      console.error('[usePostPO] Failed to post PO:', error);
    }
  });
}

