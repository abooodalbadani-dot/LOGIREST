'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { toast } from 'sonner';
import { invalidateGRNQueries, invalidatePOQueries, invalidateInventoryQueries } from '@/lib/react-query/invalidation';

export function usePostGRN(options?: { 
  onConflict?: () => void; 
  messages?: { successMessage?: string }; 
  skipAutoToast?: boolean;
}) {
 const queryClient = useQueryClient();
 
 return useSafeMutation({
  onConflict: options?.onConflict,
  skipAutoToast: options?.skipAutoToast,
  mutationFn: ({ signal, id, version, ...data }: { id: string; version: number; signal?: AbortSignal }) => 
   apiClient.post(`/procurement/grns/${id}/post`, successSchema, { version, ...data }, { signal }),
  onSuccess: (_, { id }) => {
   invalidateGRNQueries(queryClient, id);
   invalidatePOQueries(queryClient);
   invalidateInventoryQueries(queryClient);
   if (!options?.skipAutoToast) {
    toast.success(options?.messages?.successMessage || 'Goods received note posted successfully');
   }
  },
  onError: (error) => {
   const errorMsg = error.message || error.response?.data?.message || '';
   console.error('[usePostGRN] Failed to post GRN:', errorMsg || error);
   if (!options?.skipAutoToast) {
    const message = errorMsg || 'Failed to post GRN';
    toast.error(message);
   }
  }
 });
}
