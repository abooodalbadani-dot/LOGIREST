import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

import { VarianceReasonSchema } from '@/types/master-data';

export const VarianceReasonListSchema = z.array(VarianceReasonSchema)
 .transform((data) => ({
  data,
  meta: {
   page: 1,
   pageSize: data.length,
   total: data.length,
   totalPages: 1,
  }
 }));

export type VarianceReasonItem = z.infer<typeof VarianceReasonSchema>;

export function useVarianceReasons() {
 return useQuery({
  queryKey: ['variance-reasons'],
  queryFn: ({ signal }) => apiClient.get('/master-data/variance-reasons', VarianceReasonListSchema, { signal }),
 });
}
