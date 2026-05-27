import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export const LotTraceAllocationSchema = z.object({
  documentNumber: z.string(),
  documentType: z.string(),
  quantity: z.number().or(z.string().transform(Number)),
  date: z.string(),
  status: z.string(),
});

export const LotTraceReportSchema = z.object({
  lotNumber: z.string(),
  itemSku: z.string(),
  itemName: z.string(),
  receivedDate: z.string(),
  expiryDate: z.string().nullable(),
  status: z.string(),
  allocations: z.array(LotTraceAllocationSchema),
});

export type LotTraceReport = z.infer<typeof LotTraceReportSchema>;

export function useLotTrace(lotId: string | null) {
  return useQuery({
    queryKey: ['reports', 'lot-trace', lotId],
    queryFn: ({ signal }) => {
      if (!lotId) return null;
      return apiClient.get(`/reports/lot-trace?lotId=${lotId}`, LotTraceReportSchema, { signal });
    },
    enabled: !!lotId,
    staleTime: 5 * 60 * 1000,
  });
}
