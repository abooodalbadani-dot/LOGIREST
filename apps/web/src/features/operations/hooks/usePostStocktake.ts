'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { StocktakeSessionSchema } from '../types/stocktake';

export function usePostStocktake(sessionId: string, warehouseId: string, options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ version, signal }: { version: number; signal?: AbortSignal }) =>
      apiClient.post(`/stocktake/sessions/${sessionId}/post`, StocktakeSessionSchema, { 
        version,
        confirmation: 'ACKNOWLEDGE_IRREVERSIBLE' 
      }, { signal }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stocktake-sessions'] });
      qc.invalidateQueries({ queryKey: ['stocktake-session', sessionId] });
      qc.invalidateQueries({ queryKey: ['warehouse-lock', warehouseId] });
    },
    onError: (error) => {
      console.error('Failed to post stocktake:', error);
    }
  });
}
