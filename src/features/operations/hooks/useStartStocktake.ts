'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { StocktakeSessionSchema } from '../types/stocktake';

export function useStartStocktake() {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (body: { warehouse_id: string }) =>
 apiClient.post('/stocktake/sessions', StocktakeSessionSchema, body),
 onSuccess: (data) => {
 qc.invalidateQueries({ queryKey: ['stocktake-sessions'] });
 qc.invalidateQueries({ queryKey: ['warehouse-lock', data.warehouse_id] });
 },
 });
}
