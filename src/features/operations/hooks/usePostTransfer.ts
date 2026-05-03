'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function usePostTransfer() {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: (id: string) => 
 apiClient.post(`/operations/transfers/${id}/post`, successSchema, {}),
 onSuccess: (_, id) => {
 queryClient.invalidateQueries({ queryKey: ['transfers'] });
 queryClient.invalidateQueries({ queryKey: ['transfer', id] });
 }
 });
}
