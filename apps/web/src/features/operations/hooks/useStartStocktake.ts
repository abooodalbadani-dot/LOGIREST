'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { StocktakeSessionSchema } from '../types/stocktake';
import { toast } from 'sonner';

export function useStartStocktake(options?: { onConflict?: () => void }) {
 const qc = useQueryClient();
 return useSafeMutation({
 onConflict: options?.onConflict,
 mutationFn: ({ signal, ...body }: { warehouse_id: string; signal?: AbortSignal }) =>
 apiClient.post('/stocktake/sessions', StocktakeSessionSchema, body, { signal }),
 onSuccess: (data) => {
 qc.invalidateQueries({ queryKey: ['stocktake-sessions'] });
qc.invalidateQueries({ queryKey: ['warehouse-lock', data.warehouse_id] });
  },
  onError: (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Operation failed';
    toast.error(message);
  },
  });
}
