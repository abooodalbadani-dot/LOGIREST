'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { invalidateTransferQueries, invalidateInventoryQueries } from '@/lib/react-query/invalidation';

export function usePostTransfer(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ id, version, signal, headers }: { id: string; version: number; signal?: AbortSignal; headers?: Record<string, string> }) => 
   apiClient.post(`/operations/transfers/${id}/post`, successSchema, { version }, { signal, headers, isRetry: true }),
  onSuccess: (_, { id }) => {
   invalidateTransferQueries(queryClient, id);
   invalidateInventoryQueries(queryClient);
  },
  onError: (error) => {
   console.error('Failed to post transfer:', error);
  }
 });
}
