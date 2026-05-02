'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function useShipTransfer() {
 const queryClient = useQueryClient();
 return useMutation({
 mutationFn: (id: string) =>
 apiClient.post(`/operations/transfers/ ${id}/ship`, successSchema, {}),
 onSuccess: (_, id) => {
 queryClient.invalidateQueries({ queryKey: ['transfers'] });
 queryClient.invalidateQueries({ queryKey: ['transfer', id] });
 }
 });
}
