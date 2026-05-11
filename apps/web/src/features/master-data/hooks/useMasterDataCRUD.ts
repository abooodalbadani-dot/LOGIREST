import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import type { ZodSchema } from 'zod';
import { paginatedSchema } from '@/types/api';
import { toast } from 'sonner';

export function useMasterDataList<T>(entity: string, schema: ZodSchema<T>, filters = {}) {
  const params = new URLSearchParams(filters as Record<string, string>);
  return useQuery({ 
    queryKey: [entity, filters], 
    queryFn: ({ signal }) => apiClient.get(`/${entity}?${params.toString()}`, paginatedSchema(schema), signal), 
    staleTime: 60_000 
  });
}

export function useMasterDataItem<T>(entity: string, id: string | null, schema: ZodSchema<T>) {
  return useQuery({ 
    queryKey: [entity, id], 
    queryFn: ({ signal }) => apiClient.get(`/${entity}/${id}`, schema, signal), 
    enabled: !!id 
  });
}

export function useMasterDataCreate<T>(entity: string, schema: ZodSchema<T>) {
  const qc = useQueryClient();
  return useMutation({ 
    mutationFn: (body: unknown) => apiClient.post(`/${entity}`, schema, body), 
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entity] });
      toast.success('Resource created successfully');
    },
    onError: () => toast.error('Failed to create resource')
  });
}

export function useMasterDataUpdate<T>(entity: string, schema: ZodSchema<T>, options?: { onConflict?: () => void }) {
  const qc = useQueryClient();
  return useSafeMutation({ 
    onConflict: options?.onConflict,
    mutationFn: ({ id, body }: { id: string; body: unknown }) => apiClient.put(`/${entity}/${id}`, schema, body), 
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entity] });
      toast.success('Resource updated successfully');
    },
    onError: () => {
      toast.error('Failed to update resource');
    }
  });
}
