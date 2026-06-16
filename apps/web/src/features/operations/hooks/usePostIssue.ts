'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';

export function usePostIssue(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: (data: { id: string; confirmation: 'ACKNOWLEDGE_IRREVERSIBLE'; version: number; signal?: AbortSignal; headers?: Record<string, string> }) => {
   const { signal, headers, id, ...payload } = data;
   return apiClient.post(`/operations/issues/${id}/post`, successSchema, payload, { signal, headers });
  },
  onSuccess: (_, { id }) => {
   queryClient.invalidateQueries({ queryKey: ['issues'] });
   queryClient.invalidateQueries({ queryKey: ['issues', id] });
  },
  onError: (error) => {
   if (error instanceof Error && error.message === 'Aborted') return;
   console.error('Failed to post issue:', error);
  }
 });
}
