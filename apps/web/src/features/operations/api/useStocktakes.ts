import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { toast } from 'sonner';
import { 
  StocktakeSessionSchema, 
  CreateStocktakeDTO, 
  SubmitCountDTO,
  StocktakeItemSchema
} from '../types/stocktake';
import { successSchema } from '@/types/api';
import { STOCKTAKE_STATUS } from '@/contracts/statuses';

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
    queryFn: ({ signal }) => apiClient.get('/stocktake/sessions', StocktakeListSchema, { signal }),
  });
}

export function useStocktake(id: string) {
  return useQuery({
    queryKey: ['stocktakes', id],
    queryFn: ({ signal }) => apiClient.get(`/stocktake/sessions/${id}`, StocktakeSessionSchema, { signal }),
    enabled: !!id,
  });
}

export function useCreateStocktake() {
  const qc = useQueryClient();
  return useSafeMutation({
    mutationFn: ({ data, signal }: { data: CreateStocktakeDTO; signal?: AbortSignal }) => 
      apiClient.post('/stocktake/sessions', StocktakeSessionSchema, data, { signal }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stocktakes'] }),
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    },
  });
}

export function useStartStocktake(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, signal }: { id: string; signal?: AbortSignal }) => 
      apiClient.post(`/stocktake/sessions/${id}/start`, StocktakeSessionSchema, null, { signal }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
      qc.invalidateQueries({ queryKey: ['warehouse-lock'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    },
  });
}

export function useBeginCounting(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, signal }: { id: string; signal?: AbortSignal }) => 
      apiClient.post(`/stocktake/sessions/${id}/count`, StocktakeSessionSchema, null, { signal }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    },
  });
}

export function useCompleteCounting(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, signal, headers }: { id: string; signal?: AbortSignal; headers?: Record<string, string> }) => 
      apiClient.post(`/stocktake/sessions/${id}/submit`, StocktakeSessionSchema, null, { signal, headers }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    },
  });
}

export function useSubmitVariance(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, items, signal }: { id: string; items: { line_id: string; variance_reason?: string }[]; signal?: AbortSignal }) => 
      apiClient.post(`/stocktake/sessions/${id}/review_variance`, StocktakeSessionSchema, { items }, { signal }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    },
  });
}

export function useUpdateItemCount(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ stocktakeId, itemId: _itemId, lineId, countedQty, varianceReason, signal, headers }: { stocktakeId: string; itemId: string; lineId: string; countedQty: number; varianceReason?: string; signal?: AbortSignal; headers?: Record<string, string> }) => 
      apiClient.put(`/stocktake/sessions/${stocktakeId}/items/${lineId}`, StocktakeItemSchema, { 
        counted_qty: countedQty, 
        variance_reason: varianceReason 
      }, { signal, headers }),
    onSuccess: (_, { stocktakeId }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes', stocktakeId] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
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
      apiClient.post(`/stocktake/sessions/${dto.stocktake_id}/submit`, StocktakeSessionSchema, dto, { signal }),
    onSuccess: (_, { dto }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', dto.stocktake_id] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    },
  });
}

export function useApproveStocktake(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, comment, signal }: { id: string; comment?: string; signal?: AbortSignal }) => 
      apiClient.post(`/stocktake/sessions/${id}/approve`, StocktakeSessionSchema, { comment }, { signal }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    },
  });
}

export function useRejectStocktake(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, comment, signal }: { id: string; comment: string; signal?: AbortSignal }) => 
      apiClient.post(`/stocktake/sessions/${id}/reject`, StocktakeSessionSchema, { comment }, { signal }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    },
  });
}

export function usePostStocktake(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, signal }: { id: string; signal?: AbortSignal }) => 
      apiClient.post(`/stocktake/sessions/${id}/post`, StocktakeSessionSchema, null, { signal }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
      qc.invalidateQueries({ queryKey: ['warehouse-lock'] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    },
  });
}

export function useCancelStocktake(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, reason, version, signal }: { id: string; reason?: string; version: number; signal?: AbortSignal }) =>
      apiClient.post(`/stocktake/sessions/${id}/cancel`, successSchema, { reason, version }, { signal }),
    onSuccess: (_, { id }) => {
      qc.setQueryData(['stocktakes', id], (old: Record<string, unknown> | undefined) => {
        if (!old) return old;
        return { ...old, status: STOCKTAKE_STATUS.CANCELLED };
      });
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
    onError: (error) => {
      console.error('[useCancelStocktake] Failed to cancel stocktake:', error);
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    },
  });
}

export function useRecountItems(options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, itemIds, signal }: { id: string; itemIds: string[]; signal?: AbortSignal }) =>
      apiClient.post(`/stocktake/sessions/${id}/recount`, StocktakeSessionSchema, { item_ids: itemIds }, { signal }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['stocktakes'] });
      qc.invalidateQueries({ queryKey: ['stocktakes', id] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Operation failed';
      toast.error(message);
    },
  });
}
