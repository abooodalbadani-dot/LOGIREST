'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { StockIssueDetailSchema, StockIssueDetail } from './useIssue';

export function useCreateIssue(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 
 return useSafeMutation({
 onConflict: options?.onConflict,
 mutationFn: ({ signal, ...data }: Partial<StockIssueDetail> & { signal?: AbortSignal }) => 
 apiClient.post(`/operations/issues`, z.object({ data: StockIssueDetailSchema }), data, { signal }).then(res => res.data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['issues'] });
 }
 });
}
