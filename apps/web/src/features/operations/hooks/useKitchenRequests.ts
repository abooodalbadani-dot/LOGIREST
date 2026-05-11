'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';
import { BadgeStatusSchema } from '@/components/shared/StatusBadge';
import { 
 KitchenRequestDetailSchema,
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
    queryFn: ({ signal }) => apiClient.get(`/operations/kitchen-requests?${params.toString()}`, paginatedSchema(KitchenRequestSummarySchema), signal),
    staleTime: 60_000,
  });
}

export function useKitchenRequest(id: string) {
  return useQuery({
    queryKey: ['kitchen-requests', id],
    queryFn: ({ signal }) => apiClient.get(`/operations/kitchen-requests/${id}`, KitchenRequestDetailSchema, signal),
    enabled: !!id,
  });
}

export function useCreateKitchenRequest(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
 onConflict: options?.onConflict,
 mutationFn: (data: CreateKitchenRequestDTO & { isDraft?: boolean }) => 
 apiClient.post('/operations/kitchen-requests', KitchenRequestDetailSchema, data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['kitchen-requests'] });
 },
 onError: (error) => {
 console.error('Failed to create kitchen request:', error);
 },
 });
}

export function useUpdateKitchenRequestStatus(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
   return useSafeMutation({
     onConflict: options?.onConflict,
     mutationFn: ({ id, status, reason, version }: { id: string; status: string; reason?: string; version: number }) =>
       apiClient.post(`/operations/kitchen-requests/${id}/status`, KitchenRequestDetailSchema, { status, reason, version }),
  onSuccess: (_, variables) => {
  queryClient.invalidateQueries({ queryKey: ['kitchen-requests'] });
  queryClient.invalidateQueries({ queryKey: ['kitchen-requests', variables.id] });
  },
  onError: (error) => {
    console.error('Failed to update kitchen request status:', error);
  },
  });
}

export function useFulfillKitchenRequest(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
   return useSafeMutation({
     onConflict: options?.onConflict,
     mutationFn: ({ id, items, version }: { id: string; items: { itemId: string; fulfilledQuantity: number }[]; version: number }) =>
       apiClient.post(`/operations/kitchen-requests/${id}/fulfill`, KitchenRequestDetailSchema, { items, version }),
  onSuccess: (_, variables) => {
  queryClient.invalidateQueries({ queryKey: ['kitchen-requests'] });
  queryClient.invalidateQueries({ queryKey: ['kitchen-requests', variables.id] });
  },
  onError: (error) => {
    console.error('Failed to fulfill kitchen request:', error);
  },
  });
}

