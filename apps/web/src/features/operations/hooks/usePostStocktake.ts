'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { StocktakeSessionSchema } from '../types/stocktake';

export function usePostStocktake(options?: { onConflict?: () => void }) {
 const qc = useQueryClient();
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ sessionId, warehouseId, version, signal }: { sessionId: string; warehouseId: string; version: number; signal?: AbortSignal }) =>
   apiClient.post(`/stocktake/sessions/${sessionId}/post`, StocktakeSessionSchema, { 
    version,
    confirmation: 'ACKNOWLEDGE_IRREVERSIBLE' 
   }, { signal, isRetry: true }),
  onSuccess: (_, { sessionId, warehouseId }) => {
   qc.invalidateQueries({ queryKey: ['stocktakes'] });
   qc.invalidateQueries({ queryKey: ['stocktakes', sessionId] });
   qc.invalidateQueries({ queryKey: ['stocktakes', 'summary'] });
   qc.invalidateQueries({ queryKey: ['warehouse-lock', warehouseId] });
  },
  onError: (error) => {
   console.error('Failed to post stocktake:', error);
  }
 });
}
