'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { StocktakeSessionSchema } from '../types/stocktake';

export function usePostStocktake(sessionId: string, warehouseId: string) {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: () =>
 apiClient.post(`/stocktake/sessions/ ${sessionId}/post`, StocktakeSessionSchema, { confirmation: 'ACKNOWLEDGE_IRREVERSIBLE' }),
 onSuccess: () => {
 qc.invalidateQueries({ queryKey: ['stocktake-sessions'] });
 qc.invalidateQueries({ queryKey: ['stocktake-session', sessionId] });
 qc.invalidateQueries({ queryKey: ['warehouse-lock', warehouseId] });
 },
 });
}
