'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type Warehouse, type WarehouseFormValues, WarehouseSchema } from '@/types/master-data';
import { type ApiError } from '@/types/api';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

const QUERY_KEY = ['warehouses'];

const PaginatedWarehousesSchema = z.object({
  data: z.array(WarehouseSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
    total_pages: z.number()
  })
});

export function useWarehouses(filters?: { branch_id?: string; search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.branch_id) params.append('branch_id', filters.branch_id);
      if (filters?.search) params.append('search', filters.search);
      
      const path = `/warehouses${params.toString() ? `?${params.toString()}` : ''}`;
      return apiClient.get(path, PaginatedWarehousesSchema, signal);
    }
  });
}

export function useWarehouse(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: ({ signal }) => {
      if (!id) return null;
      return apiClient.get(`/warehouses/${id}`, WarehouseSchema, signal);
    },
    enabled: !!id
  });
}

export function useCreateWarehouse() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.warehouses');

  return useMutation({
    mutationFn: (variables: WarehouseFormValues & { signal?: AbortSignal }) => {
      const { signal, ...values } = variables;
      return apiClient.post('/warehouses', WarehouseSchema, {
        ...values,
        code: values.code.toUpperCase()
      }, signal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('created_success'));
    },
    onError: (error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      toast.error(t('errors.create_failed'));
    }
  });
}

export function useUpdateWarehouse(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.warehouses');

  return useSafeMutation({
    onConflict: options?.onConflict,
    meta: { suppressGlobalConflict: true },
    mutationFn: ({ id, values, signal }: { id: string; values: WarehouseFormValues; signal?: AbortSignal }) => {
      return apiClient.put(`/warehouses/${id}`, WarehouseSchema, {
        ...values,
        code: values.code.toUpperCase()
      }, signal);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.setQueryData([...QUERY_KEY, data.id], data);
      toast.success(t('updated_success'));
    },
    onError: (error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      
      const errorCode = (error as ApiError)?.code || (error as Error)?.message || 'update_failed';
      const translationKey = `errors.${errorCode}`;
      toast.error(t.has(translationKey) ? t(translationKey) : t('errors.update_failed'));
    }
  });
}

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.warehouses');

  return useMutation({
    mutationFn: ({ id, signal }: { id: string; signal?: AbortSignal }) => {
      return apiClient.del(`/warehouses/${id}`, z.object({ id: z.string() }).or(z.unknown()), signal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('deleted_success'));
    },
    onError: (error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      
      const errorCode = (error as ApiError)?.code || (error as Error)?.message || 'delete_failed';
      const translationKey = `errors.${errorCode}`;
      toast.error(t.has(translationKey) ? t(translationKey) : t('errors.delete_failed'));
    }
  });
}

