import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

import { VarianceReasonSchema } from '@/types/master-data';

export const VarianceReasonListSchema = z.object({
  data: z.array(VarianceReasonSchema),
  meta: z.object({
    page: z.number(),
    pageSize: z.number().optional(),
    total: z.number(),
    totalPages: z.number().optional(),
  }).optional(),
});

export type VarianceReasonItem = z.infer<typeof VarianceReasonSchema>;

export function useVarianceReasons() {
  return useQuery({
    queryKey: ['variance-reasons'],
    queryFn: ({ signal }) => apiClient.get('/master-data/variance-reasons', VarianceReasonListSchema, { signal }),
  });
}
