import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

import { paginatedSchema } from '@/types/api';
import { toast } from 'sonner';
import { toCamelCase } from '@/lib/api/adapters';

import { useAuth } from '@/providers/AuthProvider';

export function useMasterDataList<T>(
  entity: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  filters = {},
  options?: { enabled?: boolean }
) {
  const params = new URLSearchParams(filters as Record<string, string>);
  const { activeScope } = useAuth();
  const isUnscoped = ['branches', 'warehouses', 'currencies', 'items'].includes(entity);

  return useQuery({ 
    queryKey: [entity, filters], 
    queryFn: ({ signal }) => apiClient.get(`/${entity}?${params.toString()}`, z.unknown(), { signal })
      .then(data => {
        try {
          if (Array.isArray(data)) {
            return {
              data: z.array(schema).parse(toCamelCase(data)),
              meta: { total: data.length, page: 1, pageSize: data.length || 50, totalPages: 1 }
            };
          }
          return paginatedSchema(schema).parse(toCamelCase(data));
        } catch (error) {
          console.error(`[Zod Error] Failed to parse ${entity} list response:`, error);
          return { data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 1 } };
        }
      }), 
    staleTime: 60_000,
    ...options,
    enabled: options?.enabled !== undefined ? options.enabled : (isUnscoped ? true : !!activeScope?.warehouseId)
  });
}

export function useMasterDataItem<T>(
  entity: string,
  id: string | null,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  options?: { enabled?: boolean }
) {
  const { activeScope } = useAuth();
  const isUnscoped = ['branches', 'warehouses', 'currencies', 'items'].includes(entity);

  return useQuery({ 
    queryKey: [entity, id], 
    queryFn: ({ signal }) => apiClient.get(`/${entity}/${id}`, z.unknown(), { signal })
      .then(data => {
        try {
          return schema.parse(toCamelCase(data));
        } catch (error) {
          console.error(`[Zod Error] Failed to parse ${entity} item response:`, error);
          return null;
        }
      }), 
    ...options,
    enabled: options?.enabled !== undefined ? options.enabled : (isUnscoped ? !!id : (!!id && !!activeScope?.warehouseId))
  });
}

export function useMasterDataCreate<T>(entity: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, options?: { messages?: { successMessage?: string; errorMessage?: string } }) {
  const qc = useQueryClient();
  return useMutation({ 
    mutationFn: ({ body, signal }: { body: unknown; signal?: AbortSignal }) => apiClient.post(`/${entity}`, schema, body, { signal }), 
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entity] });
      toast.success(options?.messages?.successMessage || 'Resource created successfully');
    },
    onError: () => toast.error(options?.messages?.errorMessage || 'Failed to create resource')
  });
}

export function useMasterDataUpdate<T>(entity: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, options?: { onConflict?: () => void, messages?: { successMessage?: string; errorMessage?: string } }) {
  const qc = useQueryClient();
  return useSafeMutation({ 
    onConflict: options?.onConflict,
    mutationFn: ({ id, body, signal }: { id: string; body: unknown; signal?: AbortSignal }) => apiClient.put(`/${entity}/${id}`, schema, body, { signal }), 
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entity] });
      toast.success(options?.messages?.successMessage || 'Resource updated successfully');
    },
    onError: () => {
      toast.error(options?.messages?.errorMessage || 'Failed to update resource');
    }
  });
}
