'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { toast } from 'sonner';
import { GRNDetailSchema } from './useGRN';

const CreateGRNPayloadSchema = z.object({
 poId: z.string(),
 currencyId: z.string().optional(),
 warehouseId: z.string(),
 notes: z.string().optional(),
 lines: z.array(z.object({
  itemId: z.string(),
  lotId: z.string().nullable().optional(),
  lotNumber: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  receivedQty: z.number().positive(),
  unitCostForeign: z.number().nonnegative(),
 }))
});

export type CreateGRNPayload = z.infer<typeof CreateGRNPayloadSchema>;

export function useCreateGRN(options?: { onConflict?: () => void, messages?: { successMessage?: string } }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ payload, signal, headers }: { payload: CreateGRNPayload; signal?: AbortSignal; headers?: Record<string, string> }) => 
   apiClient.post('/procurement/grns', z.object({ data: GRNDetailSchema }), CreateGRNPayloadSchema.parse(payload), { signal, headers }).then(res => res.data),
  onSuccess: (data) => {
   queryClient.setQueryData(['grn', data.id], data);
   queryClient.invalidateQueries({ queryKey: ['grns'] });
   toast.success(options?.messages?.successMessage || 'Goods received note created successfully');
  },
  onError: (error: unknown) => {
   // Handled globally by useSafeMutation
  },
 });
}
