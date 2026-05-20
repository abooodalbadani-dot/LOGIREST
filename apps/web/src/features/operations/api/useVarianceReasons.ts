import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

export const VarianceReasonSchema = z.object({
  id: z.string(),
  code: z.string(),
  name_ar: z.string(),
  name_en: z.string(),
  is_active: z.boolean(),
});

export const VarianceReasonListSchema = z.object({
  data: z.array(VarianceReasonSchema),
  meta: z.object({
    page: z.number(),
    page_size: z.number(),
    total: z.number(),
    total_pages: z.number(),
  }).optional(),
});

export type VarianceReasonItem = z.infer<typeof VarianceReasonSchema>;

export function useVarianceReasons() {
  return useQuery({
    queryKey: ['variance-reasons'],
    queryFn: ({ signal }) => apiClient.get('/master-data/variance-reasons', VarianceReasonListSchema, { signal }),
  });
}
