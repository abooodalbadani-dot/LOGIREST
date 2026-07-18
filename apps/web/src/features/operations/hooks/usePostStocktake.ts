'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { StocktakeSessionSchema } from '../types/stocktake';
import { invalidateStocktakeQueries, invalidateInventoryQueries } from '@/lib/react-query/invalidation';

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
   invalidateStocktakeQueries(qc, sessionId);
   invalidateInventoryQueries(qc);
   qc.invalidateQueries({ queryKey: ['warehouse-lock', warehouseId] });
  },
  onError: (error) => {
   console.error('Failed to post stocktake:', error);
  }
 });
}
