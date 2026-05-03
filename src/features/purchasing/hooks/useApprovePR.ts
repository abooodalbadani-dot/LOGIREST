import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { PRDetail } from './usePR';

export function useApprovePR() {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: (id: string) => 
 apiClient.post(`/procurement/purchase-requests/${id}/approve`, successSchema, {}),
 onSuccess: (_, id) => {
 // Simulate state transition in cache
 queryClient.setQueryData(['purchase-request', id], (old: PRDetail | undefined) => {
 if (!old) return old;
 return { ...old, status: 'APPROVED' as const };
 });

 queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
 },
 onError: (error: Error) => {
 console.error('[useApprovePR] Failed to approve PR:', error);
 },
 });
}
