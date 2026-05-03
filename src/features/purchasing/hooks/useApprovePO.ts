import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { PODetail } from './usePO';

export function useApprovePO() {
 const queryClient = useQueryClient();

 return useMutation({
 mutationFn: async (id: string) => {
 const response = await apiClient.post(`/procurement/purchase-orders/${id}/approve`, successSchema);
 return response;
 },
 onSuccess: (_, id) => {
 // Simulate state transition in cache
 queryClient.setQueryData(['purchase-order', id], (old: PODetail | undefined) => {
 if (!old) return old;
 return { ...old, status: 'APPROVED' as const };
 });
 
 queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
 },
 onError: (error: Error) => {
 console.error('[useApprovePO] Failed to approve PO:', error);
 },
 });
}
