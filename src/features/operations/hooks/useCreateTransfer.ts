'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { TransferDetailSchema } from './useTransfer';

const LotAllocationSchema = z.object({
  lot_id: z.string(),
  qty: z.number().positive()
});

const CreateTransferPayloadSchema = z.object({
  from_warehouse_id: z.string(),
  to_warehouse_id: z.string(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    item_id: z.string(),
    qty: z.number().positive(),
    uom_id: z.string(),
    lot_allocations: z.array(LotAllocationSchema).optional()
  }))
});

export type CreateTransferPayload = z.infer<typeof CreateTransferPayloadSchema>;

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTransferPayload) => 
      apiClient.post('/operations/transfers', TransferDetailSchema, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    }
  });
}
