'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { PRDetailSchema } from './usePR';

const CreatePRPayloadSchema = z.object({
  department_id: z.string(),
  expected_date: z.string(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    item_id: z.string(),
    req_qty: z.number().positive(),
    uom_id: z.string()
  }))
});

export type CreatePRPayload = z.infer<typeof CreatePRPayloadSchema>;

export function useCreatePR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePRPayload) => 
      apiClient.post('/procurement/purchase-requests', PRDetailSchema, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    }
  });
}
