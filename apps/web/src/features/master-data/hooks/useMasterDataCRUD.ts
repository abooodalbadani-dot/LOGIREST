import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import type { ZodSchema } from 'zod';
import { paginatedSchema } from '@/types/api';
import { toast } from 'sonner';
import { toSnakeCase } from '@/lib/api/adapters';

import { useAuth } from '@/providers/AuthProvider';

export function useMasterDataList<T>(
  entity: string,
  schema: ZodSchema<T>,
  filters = {},
  options?: { enabled?: boolean }
) {
  const params = new URLSearchParams(filters as Record<string, string>);
  const { activeScope } = useAuth();
  const isUnscoped = ['branches', 'warehouses', 'currencies'].includes(entity);

  return useQuery({ 
    queryKey: [entity, filters], 
    queryFn: ({ signal }) => apiClient.get(`/${entity}?${params.toString()}`, paginatedSchema(schema), { signal }), 
    staleTime: 60_000,
    ...options,
    enabled: options?.enabled !== undefined ? options.enabled : (isUnscoped ? true : !!activeScope.warehouseId)
  });
}

export function useMasterDataItem<T>(
  entity: string,
  id: string | null,
  schema: ZodSchema<T>,
  options?: { enabled?: boolean }
) {
  const { activeScope } = useAuth();
  const isUnscoped = ['branches', 'warehouses', 'currencies'].includes(entity);

  return useQuery({ 
    queryKey: [entity, id], 
    queryFn: ({ signal }) => apiClient.get(`/${entity}/${id}`, schema, { signal }), 
    ...options,
    enabled: options?.enabled !== undefined ? options.enabled : (isUnscoped ? !!id : (!!id && !!activeScope.warehouseId))
  });
}

export function useMasterDataCreate<T>(entity: string, schema: ZodSchema<T>) {
  const qc = useQueryClient();
  return useMutation({ 
    mutationFn: ({ body, signal }: { body: unknown; signal?: AbortSignal }) => apiClient.post(`/${entity}`, schema, toSnakeCase(body), { signal }), 
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
    mutationFn: ({ id, body, signal }: { id: string; body: unknown; signal?: AbortSignal }) => apiClient.put(`/${entity}/${id}`, schema, toSnakeCase(body), { signal }), 
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entity] });
      toast.success('Resource updated successfully');
    },
    onError: () => {
      toast.error('Failed to update resource');
    }
  });
}
