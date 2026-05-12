import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { 
  StocktakeSessionSchema, 
  CreateStocktakeDTO, 
  SubmitCountDTO,
  StocktakeItemSchema
} from '../types/stocktake';

const StocktakeListSchema = z.object({
  data: z.array(StocktakeSessionSchema.omit({ items: true })),
  meta: z.object({
    page: z.number(),
    page_size: z.number(),
    total: z.number(),
    total_pages: z.number(),
  }),
});

export function useStocktakes() {
  return useQuery({
    queryKey: ['stocktakes'],
    queryFn: ({ signal }) => apiClient.get('/stocktake/sessions', StocktakeListSchema, signal),
  });
}

export function useStocktake(id: string) {
  return useQuery({
    queryKey: ['stocktakes', id],
    queryFn: ({ signal }) => apiClient.get(`/stocktake/sessions/${id}`, StocktakeSessionSchema, signal),
    enabled: !!id,
  });
}

export function useCreateStocktake() {
  const qc = useQueryClient();
  return useSafeMutation({
    mutationFn: ({ data, signal }: { data: CreateStocktakeDTO; signal?: AbortSignal }) => 
      apiClient.post('/stocktake/sessions', StocktakeSessionSchema, data, signal),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stocktakes'] }),
  });
}

export function useStartStocktake(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, signal }: { id: string; signal?: AbortSignal }) => 
      apiClient.post(`/stocktake/sessions/${id}/start`, StocktakeSessionSchema, null, signal),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
      qc.invalidateQueries({ queryKey: ['warehouse-lock'] });
    },
  });
}

export function useBeginCounting(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, signal }: { id: string; signal?: AbortSignal }) => 
      apiClient.post(`/stocktake/sessions/${id}/count`, StocktakeSessionSchema, null, signal),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
  });
}

export function useCompleteCounting(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, signal }: { id: string; signal?: AbortSignal }) => 
      apiClient.post(`/stocktake/sessions/${id}/submit`, StocktakeSessionSchema, null, signal),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
  });
}

export function useSubmitVariance(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, items, signal }: { id: string; items: { line_id: string; variance_reason?: string }[]; signal?: AbortSignal }) => 
      apiClient.post(`/stocktake/sessions/${id}/review_variance`, StocktakeSessionSchema, { items }, signal),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
  });
}

export function useUpdateItemCount(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ stocktakeId, itemId: _itemId, lineId, countedQty, varianceReason, signal }: { stocktakeId: string; itemId: string; lineId: string; countedQty: number; varianceReason?: string; signal?: AbortSignal }) => 
      apiClient.put(`/stocktake/sessions/${stocktakeId}/items/${lineId}`, StocktakeItemSchema, { 
        counted_qty: countedQty, 
        variance_reason: varianceReason 
      }, signal),
    onSuccess: (_, { stocktakeId }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes', stocktakeId] });
    },
  });
}

/**
 * @deprecated Use useUpdateItemCount for real-time saving. 
 * This remains for bulk submission if needed by legacy parts of the UI.
 */
export function useSubmitCounts(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ dto, signal }: { dto: SubmitCountDTO; signal?: AbortSignal }) => 
      apiClient.post(`/stocktake/sessions/${dto.stocktake_id}/submit`, StocktakeSessionSchema, dto, signal),
    onSuccess: (_, { dto }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', dto.stocktake_id] });
    },
  });
}

export function useApproveStocktake(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, comment, signal }: { id: string; comment?: string; signal?: AbortSignal }) => 
      apiClient.post(`/stocktake/sessions/${id}/approve`, StocktakeSessionSchema, { comment }, signal),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
  });
}

export function useRejectStocktake(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, comment, signal }: { id: string; comment: string; signal?: AbortSignal }) => 
      apiClient.post(`/stocktake/sessions/${id}/reject`, StocktakeSessionSchema, { comment }, signal),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
  });
}

export function usePostStocktake(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, signal }: { id: string; signal?: AbortSignal }) => 
      apiClient.post(`/stocktake/sessions/${id}/post`, StocktakeSessionSchema, null, signal),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
      qc.invalidateQueries({ queryKey: ['warehouse-lock'] });
    },
  });
}
