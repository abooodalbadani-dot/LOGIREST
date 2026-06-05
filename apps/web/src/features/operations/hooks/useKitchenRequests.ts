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
 requestNumber: z.string(),
 status: BadgeStatusSchema,
 departmentId: z.string(),
 warehouseId: z.string(),
 requestedBy: z.string(),
 requestedAt: z.string(),
 createdAt: z.string(),
});

export type KitchenRequestSummary = z.infer<typeof KitchenRequestSummarySchema>;

export function useKitchenRequestList(filters: { status?: string; department_id?: string; page?: number } = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.department_id) params.set('department_id', filters.department_id);
  params.set('page', String(filters.page ?? 1));

  return useQuery({
    queryKey: ['kitchen-requests', filters],
    queryFn: ({ signal }) => apiClient.get(`/operations/kitchen-requests?${params.toString()}`, paginatedSchema(KitchenRequestSummarySchema), { signal }),
    staleTime: 60_000,
    refetchInterval: 15000,
  });
}

export function useKitchenRequest(id: string) {
  return useQuery({
    queryKey: ['kitchen-requests', id],
    queryFn: ({ signal }) => apiClient.get(`/operations/kitchen-requests/${id}`, KitchenRequestDetailSchema, { signal }),
    enabled: !!id,
  });
}

export function useCreateKitchenRequest(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 return useSafeMutation({
 onConflict: options?.onConflict,
  mutationFn: ({ data, signal }: { data: CreateKitchenRequestDTO & { isDraft?: boolean }; signal?: AbortSignal }) => 
  apiClient.post('/operations/kitchen-requests', KitchenRequestDetailSchema, data, { signal }),
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
      mutationFn: ({ id, status, reason, version, headers, signal }: { id: string; status: string; reason?: string; version: number; headers?: Record<string, string>; signal?: AbortSignal }) =>
        apiClient.post(`/operations/kitchen-requests/${id}/status`, KitchenRequestDetailSchema, { status, reason, version }, { headers, signal }),
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
      mutationFn: ({ id, items, version, headers, signal }: { id: string; items: { item_id: string; fulfilled_quantity: number }[]; version: number; headers?: Record<string, string>; signal?: AbortSignal }) =>
        apiClient.post(`/operations/kitchen-requests/${id}/fulfill`, KitchenRequestDetailSchema, { items, version }, { headers, signal }),
  onSuccess: (_, variables) => {
  queryClient.invalidateQueries({ queryKey: ['kitchen-requests'] });
  queryClient.invalidateQueries({ queryKey: ['kitchen-requests', variables.id] });
  },
  onError: (error) => {
    console.error('Failed to fulfill kitchen request:', error);
  },
  });
}
