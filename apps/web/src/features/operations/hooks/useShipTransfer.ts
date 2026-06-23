'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function useShipTransfer(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ id, version, signal, headers, lines }: { id: string; version: number; signal?: AbortSignal; headers?: Record<string, string>; lines?: Array<{ line_id: string; scanned_qty: number }> }) =>
   apiClient.post(`/operations/transfers/${id}/ship`, successSchema, { version, lines }, { signal, headers, isRetry: true }),
  onSuccess: (_, { id }) => {
   queryClient.invalidateQueries({ queryKey: ['transfers'] });
   queryClient.invalidateQueries({ queryKey: ['transfers', id] });
   queryClient.invalidateQueries({ queryKey: ['transfers', 'summary'] });
  },
  onError: (error) => {
   console.error('Failed to ship transfer:', error);
  }
 });
}
