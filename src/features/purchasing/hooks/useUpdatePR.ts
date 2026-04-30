'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { PRDetailSchema } from './usePR';

const UpdatePRPayloadSchema = z.object({
  department_id: z.string().optional(),
  expected_date: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(z.object({
    id: z.string().optional(), // For existing lines
    item_id: z.string(),
    req_qty: z.number().positive(),
    uom_id: z.string()
  })).optional()
});

export type UpdatePRPayload = z.infer<typeof UpdatePRPayloadSchema>;

export function useUpdatePR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePRPayload }) => 
      apiClient.put(`/procurement/purchase-requests/${id}`, PRDetailSchema, UpdatePRPayloadSchema.parse(payload)),
    onSuccess: (data) => {
      // Update individual PR cache with the returned data
      queryClient.setQueryData(['purchase-request', data.id], data);
      
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    }
  });
}
