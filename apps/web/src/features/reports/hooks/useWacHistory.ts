import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export const WacHistoryItemSchema = z.object({
 postedAt: z.string(),
 newWac: z.number().or(z.string().transform(Number)),
 documentId: z.string().nullable().optional(),
 documentType: z.string().nullable().optional(),
 documentNumber: z.string().nullable().optional(),
 quantity: z.number().or(z.string().transform(Number)).nullable().optional(),
 unitPrice: z.number().or(z.string().transform(Number)).nullable().optional(),
 item: z.object({
  sku: z.string(),
  name: z.string(),
 }).optional(),
});

export type WacHistoryItem = z.infer<typeof WacHistoryItemSchema>;

export function useWacHistory(itemId: string | null) {
 return useQuery({
  queryKey: ['reports', 'wac-history', itemId],
  queryFn: ({ signal }) => {
   if (!itemId) return [];
   return apiClient.get(`/reports/wac-history?itemId=${itemId}`, z.array(WacHistoryItemSchema), { signal });
  },
  enabled: !!itemId,
  staleTime: 5 * 60 * 1000,
 });
}
