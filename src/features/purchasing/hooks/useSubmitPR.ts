'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

import { type PRDetail } from './usePR';

export function useSubmitPR() {
 const queryClient = useQueryClient();

 return useMutation({
 mutationFn: async (id: string) => {
 const response = await apiClient.post(`/procurement/purchase-requests/ ${id}/submit`, successSchema);
 return response;
 },
 onSuccess: (_, id) => {
 // Simulate state transition in cache
 queryClient.setQueryData(['purchase-request', id], (old: PRDetail | undefined) => {
 if (!old) return old;
 return { ...old, status: 'SUBMITTED' as const };
 });
 
 queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
 },
 onError: (error: Error) => {
 console.error('Failed to submit PR:', error);
 },
 });
}
