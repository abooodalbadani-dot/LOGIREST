'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

import { AdjustmentDetail } from './useAdjustment';

export function useRejectAdjustment(id: string) {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: (reject: string) =>
 apiClient.post(`/operations/adjustments/${id}/reject`, successSchema, { reject }),
 onSuccess: (_, reject) => {
 queryClient.setQueryData(['adjustment', id], (old: AdjustmentDetail | undefined) => {
 if (!old) return old;
 return {
 ...old,
 status: 'REJECTED' as const,
 reject,
 timeline: [
 ...(old.timeline || []),
 { status: 'REJECTED', at: new Date().toISOString(), by: 'Current User' }
 ]
 };
 });
 queryClient.invalidateQueries({ queryKey: ['adjustments'] });
 },
 onError: (error: Error) => {
 console.error('Failed to reject adjustment:', error);
 }
 });
}
