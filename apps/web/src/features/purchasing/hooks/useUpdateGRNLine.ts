'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function useUpdateGRNLine(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();

  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ grnId, lineId, payload, signal }: { grnId: string; lineId: string; payload: { lot_number: string; expiry_date: string; qty: number }; signal?: AbortSignal }) =>
      apiClient.put(`/procurement/grns/${grnId}/items/${lineId}`, successSchema, payload, { signal }),
    onSuccess: (_, { grnId }) => {
      queryClient.invalidateQueries({ queryKey: ['goods-receipts', grnId] });
      queryClient.invalidateQueries({ queryKey: ['grn', grnId] });
    },
    onError: (error) => {
      console.error('[useUpdateGRNLine] Failed to update GRN line:', error);
    }
  });
}
