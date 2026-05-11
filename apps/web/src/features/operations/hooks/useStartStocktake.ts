'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { StocktakeSessionSchema } from '../types/stocktake';

export function useStartStocktake(options?: { onConflict?: () => void }) {
 const qc = useQueryClient();
 return useSafeMutation({
 onConflict: options?.onConflict,
 mutationFn: (body: { warehouse_id: string }) =>
 apiClient.post('/stocktake/sessions', StocktakeSessionSchema, body),
 onSuccess: (data) => {
 qc.invalidateQueries({ queryKey: ['stocktake-sessions'] });
 qc.invalidateQueries({ queryKey: ['warehouse-lock', data.warehouse_id] });
 },
 });
}
