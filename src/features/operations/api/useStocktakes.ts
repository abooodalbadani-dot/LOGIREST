import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { 
  StocktakeSession, 
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
    queryFn: () => apiClient.get('/stocktake/sessions', StocktakeListSchema),
  });
}

export function useStocktake(id: string) {
  return useQuery({
    queryKey: ['stocktakes', id],
    queryFn: () => apiClient.get(`/stocktake/sessions/${id}`, StocktakeSessionSchema),
    enabled: !!id,
  });
}

export function useCreateStocktake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateStocktakeDTO) => 
      apiClient.post('/stocktake/sessions', StocktakeSessionSchema, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stocktakes'] }),
  });
}

export function useStartStocktake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      apiClient.post(`/stocktake/sessions/${id}/start`, StocktakeSessionSchema),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
      qc.invalidateQueries({ queryKey: ['warehouse-lock'] });
    },
  });
}

export function useBeginCounting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      apiClient.post(`/stocktake/sessions/${id}/count`, StocktakeSessionSchema),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
  });
}

export function useCompleteCounting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      apiClient.post(`/stocktake/sessions/${id}/submit`, StocktakeSessionSchema),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
  });
}

export function useSubmitVariance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: { lineId: string; varianceReason?: string }[] }) => 
      apiClient.post(`/stocktake/sessions/${id}/review_variance`, StocktakeSessionSchema, { items }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
  });
}

export function useUpdateItemCount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stocktakeId, itemId, lineId, countedQty, varianceReason }: { stocktakeId: string; itemId: string; lineId: string; countedQty: number; varianceReason?: string }) => 
      apiClient.put(`/stocktake/sessions/${stocktakeId}/items/${lineId}`, StocktakeItemSchema, { countedQty, varianceReason }),
    onSuccess: (_, { stocktakeId }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes', stocktakeId] });
    },
  });
}

/**
 * @deprecated Use useUpdateItemCount for real-time saving. 
 * This remains for bulk submission if needed by legacy parts of the UI.
 */
export function useSubmitCounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: SubmitCountDTO) => 
      apiClient.post(`/stocktake/sessions/${dto.stocktakeId}/submit`, StocktakeSessionSchema, dto),
    onSuccess: (_, dto) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', dto.stocktakeId] });
    },
  });
}

export function useApproveStocktake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment?: string }) => 
      apiClient.post(`/stocktake/sessions/${id}/approve`, StocktakeSessionSchema, { comment }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
  });
}

export function useRejectStocktake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: string; comment: string }) => 
      apiClient.post(`/stocktake/sessions/${id}/reject`, StocktakeSessionSchema, { comment }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
  });
}

export function usePostStocktake() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => 
      apiClient.post(`/stocktake/sessions/${id}/post`, StocktakeSessionSchema),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
      qc.invalidateQueries({ queryKey: ['warehouse-lock'] });
    },
  });
}
