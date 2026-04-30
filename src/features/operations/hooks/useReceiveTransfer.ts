'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { successSchema } from '@/types/api';
import { z } from 'zod';

const ReceiveLineSchema = z.object({
  line_id: z.string(),
  received_qty: z.number(),
});

const ReceivePayloadSchema = z.object({
  lines: z.array(ReceiveLineSchema),
  confirmation: z.string(),
  variance_reason: z.string().optional(),
});

type ReceivePayload = z.infer<typeof ReceivePayloadSchema>;

export function useReceiveTransfer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReceivePayload) =>
      apiClient.post(`/operations/transfers/${id}/receive`, successSchema, ReceivePayloadSchema.parse(body)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transfer', id] });
    }
  });
}
