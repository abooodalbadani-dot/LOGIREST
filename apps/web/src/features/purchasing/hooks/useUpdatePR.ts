'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { PRDetailSchema } from './usePR';

const UpdatePRPayloadSchema = z.object({
  version: z.number(),
  department_id: z.string().optional(),
  expected_date: z.string().optional(),
  notes: z.string().optional().or(z.literal('')),
  lines: z.array(z.object({
    id: z.string().optional(), // For existing lines
    item_id: z.string(),
    req_qty: z.number().positive(),
    uom_id: z.string()
  })).optional()
});

export type UpdatePRPayload = z.infer<typeof UpdatePRPayloadSchema>;

export function useUpdatePR(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, payload, signal }: { id: string; payload: UpdatePRPayload; signal?: AbortSignal }) => 
      apiClient.put(`/procurement/purchase-requests/${id}`, PRDetailSchema, UpdatePRPayloadSchema.parse(payload), { signal }),
    onSuccess: (data) => {
      // Update individual PR cache with the returned data
      queryClient.setQueryData(['purchase-requests', data.id], data);
      
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-requests', data.id] });
    },
    onError: (error) => {
      console.error('[useUpdatePR] Failed to update PR:', error);
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    }
  });
}

