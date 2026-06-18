'use client';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { GRNDetailSchema } from './useGRN';

const UpdateGRNPayloadSchema = z.object({
 version: z.number(),
 poId: z.string().optional(),
 currencyId: z.string().optional(),
 warehouseId: z.string().optional(),
 notes: z.string().optional(),
 lines: z.array(z.object({
  id: z.string().optional(),
  itemId: z.string(),
  lotId: z.string().nullable().optional(),
  lotNumber: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  receivedQty: z.number().positive(),
  unitCostForeign: z.number().nonnegative(),
 }))
});

export type UpdateGRNPayload = z.infer<typeof UpdateGRNPayloadSchema>;

export function useUpdateGRN(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ id, payload, signal, headers }: { id: string; payload: UpdateGRNPayload; signal?: AbortSignal; headers?: Record<string, string> }) => 
   apiClient.put(`/procurement/grns/${id}`, z.object({ data: GRNDetailSchema }), UpdateGRNPayloadSchema.parse(payload), { signal, headers }).then(res => res.data),
  onSuccess: (data, { id }) => {
   queryClient.setQueryData(['grn', id], data);
   queryClient.invalidateQueries({ queryKey: ['grns'] });
   queryClient.invalidateQueries({ queryKey: ['grn', id] });
  },
  onError: (error) => {
   const message = (error as { message?: string }).message;
   const code = (error as { code?: string }).code;
   const fieldErrors = (error as { fieldErrors?: unknown }).fieldErrors;
   console.error('[useUpdateGRN] Failed to update GRN:', { code, message, fieldErrors, raw: error });
  }
 });
}
