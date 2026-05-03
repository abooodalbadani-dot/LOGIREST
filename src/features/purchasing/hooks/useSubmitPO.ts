'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

import { type PODetail } from './usePO';

export function useSubmitPO() {
 const queryClient = useQueryClient();

 return useMutation({
 mutationFn: async (id: string) => {
 const response = await apiClient.post(`/procurement/purchase-orders/${id}/submit`, successSchema);
 return response;
 },
 onSuccess: (_, id) => {
 // Simulate state transition in cache
 queryClient.setQueryData(['purchase-order', id], (old: PODetail | undefined) => {
 if (!old) return old;
 return { ...old, status: 'SUBMITTED' as const };
 });
 
 queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
 },
 onError: (error: Error) => {
 console.error('Failed to submit PO:', error);
 },
 });
}
