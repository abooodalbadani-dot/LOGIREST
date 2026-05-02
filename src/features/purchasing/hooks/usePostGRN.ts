'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function usePostGRN(id: string) {
 const queryClient = useQueryClient();
 
 return useMutation({
 mutationFn: (data: { fx_rate: number; confirmation: 'ACKNOWLEDGE_IRREVERSIBLE' }) => 
 apiClient.post(`/procurement/grns/ ${id}/post`, successSchema, data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['grns'] });
 queryClient.invalidateQueries({ queryKey: ['grn', id] });
 }
 });
}
