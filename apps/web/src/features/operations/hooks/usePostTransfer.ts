'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function usePostTransfer(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ id, version, signal, headers }: { id: string; version: number; signal?: AbortSignal; headers?: Record<string, string> }) => 
   apiClient.post(`/operations/transfers/${id}/post`, successSchema, { version }, { signal, headers }),
  onSuccess: (_, { id }) => {
   queryClient.invalidateQueries({ queryKey: ['transfers'] });
   queryClient.invalidateQueries({ queryKey: ['transfers', id] });
  },
  onError: (error) => {
   console.error('Failed to post transfer:', error);
  }
 });
}
