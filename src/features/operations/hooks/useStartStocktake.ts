'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

const SessionSchema = z.object({
  id: z.string(),
  session_number: z.string(),
  warehouse_id: z.string(),
  status: z.enum(['OPEN', 'COUNTING', 'REVIEW', 'POSTED', 'CANCELLED']),
  snapshot_at: z.string(),
  started_by: z.string(),
  posted_at: z.string().nullable(),
  posted_by: z.string().nullable(),
  counts: z.array(z.unknown()),
});

export function useStartStocktake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { warehouse_id: string }) =>
      apiClient.post('/stocktake/sessions', SessionSchema, body),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['stocktake-sessions'] });
      qc.invalidateQueries({ queryKey: ['warehouse-lock', data.warehouse_id] });
    },
  });
}
