'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

import { AdjustmentDetail } from './useAdjustment';

export function useSubmitAdjustment(id: string) {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: () =>
 apiClient.post(`/operations/adjustments/${id}/submit`, successSchema, {}),
 onSuccess: () => {
 queryClient.setQueryData(['adjustment', id], (old: AdjustmentDetail | undefined) => {
 if (!old) return old;
 return {
 ...old,
 status: 'SUBMITTED' as const,
 timeline: [
 ...(old.timeline || []),
 { status: 'SUBMITTED', at: new Date().toISOString(), by: 'Current User' }
 ]
 };
 });
 queryClient.invalidateQueries({ queryKey: ['adjustments'] });
 },
 onError: (error: Error) => {
 console.error('Failed to submit adjustment:', error);
 }
 });
}
