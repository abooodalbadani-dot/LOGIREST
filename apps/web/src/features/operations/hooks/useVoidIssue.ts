'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { toast } from 'sonner';

export function useVoidIssue(issueId: string, options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ version, signal, headers }: { version: number; signal?: AbortSignal; headers?: Record<string, string> }) =>
      apiClient.post(`/operations/issues/${issueId}/void`, successSchema, { version }, { signal, headers, isRetry: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] });
      queryClient.invalidateQueries({ queryKey: ['issues', issueId] });
      toast.success('Issue voided successfully');
    },
    onError: (error) => {
      console.error('Failed to void issue:', error);
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    }
  });
}
