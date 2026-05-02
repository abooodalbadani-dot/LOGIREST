'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { StockIssueDetailSchema, StockIssueDetail } from './useIssue';

export function useCreateIssue() {
 const queryClient = useQueryClient();
 
 return useMutation({
 mutationFn: (data: Partial<StockIssueDetail>) => 
 apiClient.post(`/operations/issues`, z.object({ data: StockIssueDetailSchema }), data).then(res => res.data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['issues'] });
 }
 });
}
