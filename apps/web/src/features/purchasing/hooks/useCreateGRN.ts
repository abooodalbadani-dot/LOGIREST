'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { toast } from 'sonner';
import { GRNDetailResponseSchema } from './useGRN';

const CreateGRNPayloadSchema = z.object({
  poId: z.string().optional().nullable().or(z.literal('')),
  supplierId: z.string().optional().nullable(),
  currencyId: z.string().optional(),
  warehouseId: z.string(),
  fxRate: z.number().optional().nullable(),
 notes: z.string().optional(),
 lines: z.array(z.object({
  itemId: z.string(),
  uomId: z.string().optional().nullable(),
  lotId: z.string().nullable().optional(),
  lotNumber: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  receivedQty: z.number().min(0),
  unitCostForeign: z.number().nonnegative(),
 }))
});

export type CreateGRNPayload = z.infer<typeof CreateGRNPayloadSchema>;

export function useCreateGRN(options?: { onConflict?: () => void, messages?: { successMessage?: string } }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ payload, signal, headers }: { payload: CreateGRNPayload; signal?: AbortSignal; headers?: Record<string, string> }) => 
   apiClient.post('/procurement/grns', z.object({ data: GRNDetailResponseSchema }), CreateGRNPayloadSchema.parse(payload), { signal, headers }).then(res => res.data),
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
