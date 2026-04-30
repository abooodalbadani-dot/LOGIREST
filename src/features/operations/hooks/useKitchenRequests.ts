'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';
import { BadgeStatusSchema } from '@/components/ui/status-badge';
import { 
  KitchenRequest, 
  KitchenRequestSchema, 
  CreateKitchenRequestDTO 
} from '../types/kitchen-request';

const KitchenRequestSummarySchema = z.object({
  id: z.string(),
  request_number: z.string(),
  status: BadgeStatusSchema,
  department_id: z.string(),
  warehouse_id: z.string(),
  requested_by: z.string(),
  requested_at: z.string(),
  created_at: z.string(),
});

export type KitchenRequestSummary = z.infer<typeof KitchenRequestSummarySchema>;

export function useKitchenRequestList(filters: { status?: string; department_id?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.department_id) params.set('department_id', filters.department_id);
  params.set('page', String(filters.page ?? 1));

  return useQuery({
    queryKey: ['kitchen-requests', filters],
    queryFn: () => apiClient.get(`/operations/kitchen-requests?${params.toString()}`, paginatedSchema(KitchenRequestSummarySchema)),
    staleTime: 60_000,
  });
}

export function useKitchenRequest(id: string) {
  return useQuery({
    queryKey: ['kitchen-requests', id],
    queryFn: () => apiClient.get(`/operations/kitchen-requests/${id}`, z.any() as any),
    enabled: !!id,
  });
}

export function useCreateKitchenRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateKitchenRequestDTO & { isDraft?: boolean }) => 
      apiClient.post('/operations/kitchen-requests', z.any() as any, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-requests'] });
    },
  });
}

export function useUpdateKitchenRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      apiClient.post(`/operations/kitchen-requests/${id}/status`, z.any() as any, { status, reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-requests'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-requests', variables.id] });
    },
  });
}

export function useFulfillKitchenRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: { itemId: string; fulfilledQuantity: number }[] }) =>
      apiClient.post(`/operations/kitchen-requests/${id}/fulfill`, z.any() as any, { items }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-requests'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-requests', variables.id] });
    },
  });
}
