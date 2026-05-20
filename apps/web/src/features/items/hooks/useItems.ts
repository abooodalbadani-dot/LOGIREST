'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type ItemFormValues, ItemSchema } from '@/types/master-data';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

const QUERY_KEY = ['items'];

const PaginatedItemsSchema = z.object({
  data: z.array(ItemSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
    total_pages: z.number()
  })
});

export function useItems(filters?: { search?: string; category_id?: string; is_active?: boolean }) {
  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.category_id) params.append('category_id', filters.category_id);
      if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
      
      const path = `/items${params.toString() ? `?${params.toString()}` : ''}`;
      return apiClient.get(path, PaginatedItemsSchema, { signal });
    }
  });
}

export function useItem(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: ({ signal }) => {
      if (!id) return null;
      return apiClient.get(`/items/${id}`, ItemSchema, { signal });
    },
    enabled: !!id,
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.items');

  return useMutation({
    mutationFn: (values: ItemFormValues & { signal?: AbortSignal }) => {
      const { signal, ...dataValues } = values;
      return apiClient.post('/items', ItemSchema, {
        ...dataValues,
        code: dataValues.code.toUpperCase()
      }, { signal });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('created_success'));
    },
    onError: (error) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      toast.error(t('errors.create_failed'));
    }
  });
}

export function useUpdateItem(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.items');

  return useSafeMutation({
    onConflict: options?.onConflict,
    meta: { suppressGlobalConflict: true },
    mutationFn: ({ id, values, version, signal }: { id: string; values: ItemFormValues; version?: number; signal?: AbortSignal }) => {
      return apiClient.put(`/items/${id}`, ItemSchema, {
        ...values,
        code: values.code.toUpperCase(),
        version
      }, { signal });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.setQueryData([...QUERY_KEY, data.id], data);
      toast.success(t('updated_success'));
    },
    onError: (error: unknown) => {
      const err = error as { name?: string; code?: string; message?: string };
      if (err.name === 'AbortError') return;
      
      const errorCode = err.code || err.message;
      if (errorCode === 'GUARD_STOCK_EXISTS') {
        toast.error(t('errors.cannot_deactivate_with_stock'));
      } else {
        toast.error(t(`errors.${errorCode}`) || t('errors.update_failed'));
      }
    }
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.items');

  return useMutation({
    mutationFn: ({ id, version, signal }: { id: string; version?: number; signal?: AbortSignal }) => {
      const url = version != null ? `/items/${id}?version=${version}` : `/items/${id}`;
      return apiClient.del(url, z.unknown(), { signal });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('deleted_success'));
    },
    onError: (error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') return;

      const errorCode = (error as { code?: string })?.code || (error as Error)?.message;
      if (errorCode === 'GUARD_STOCK_EXISTS') {
        toast.error(t('errors.cannot_deactivate_with_stock'));
      } else {
        toast.error(t(`errors.${errorCode}`) || t('errors.delete_failed'));
      }
    }
  });
}

