'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

const CreatePOPayloadSchema = z.object({
  supplier_id: z.string(),
  target_warehouse_id: z.string(),
  currency_id: z.string(),
  expected_delivery_date: z.string().optional(),
  linked_pr_id: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    item_id: z.string(),
    qty: z.number().positive(),
    uom_id: z.string(),
    unit_cost_foreign: z.number().positive()
  }))
});

export type CreatePOPayload = z.infer<typeof CreatePOPayloadSchema>;

export function useCreatePO() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePOPayload) => 
      apiClient.post('/procurement/purchase-orders', z.any(), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    }
  });
}
