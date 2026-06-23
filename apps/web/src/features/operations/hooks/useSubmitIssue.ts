'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { ISSUE_STATUS } from '@logirest/shared-types';
import { useAuth } from '@/providers/AuthProvider';

export function useSubmitIssue(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 const { user } = useAuth();
 const userName = user?.name || 'Unknown';

 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ id, version, signal }: { id: string; version: number; signal?: AbortSignal }) =>
   apiClient.post(`/operations/issues/${id}/submit`, successSchema, { version }, { signal, isRetry: true }),
  onSuccess: (_, { id }) => {
   queryClient.setQueryData(['issues', id], (old: Record<string, unknown> | undefined) => {
    if (!old) return old;
    return {
     ...old,
     status: ISSUE_STATUS.SUBMITTED,
     timeline: [
      { status: ISSUE_STATUS.DRAFT.toLowerCase(), at: old.created_at as string ?? '', by: old.created_by as string ?? 'System' },
      { status: ISSUE_STATUS.SUBMITTED.toLowerCase(), at: new Date().toISOString(), by: userName },
     ],
    };
   });
   queryClient.invalidateQueries({ queryKey: ['issues'] });
   queryClient.invalidateQueries({ queryKey: ['issues', id] });
  },
  onError: (error) => {
   console.error('[useSubmitIssue] Failed to submit issue:', error);
  },
 });
}
