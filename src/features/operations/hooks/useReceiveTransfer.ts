'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

const ReceiveLineSchema = z.object({
  line_id: z.string(),
  received_qty: z.number(),
});

const ReceivePayloadSchema = z.object({
  lines: z.array(ReceiveLineSchema),
  confirmation: z.string(),
});

export function useReceiveTransfer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { lines: { line_id: string; received_qty: number }[]; confirmation: string }) =>
      apiClient.post(`/operations/transfers/${id}/receive`, z.any(), body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transfer', id] });
    }
  });
}
