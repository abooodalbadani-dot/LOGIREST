'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type Category, type CategoryFormValues, CategorySchema } from '@/types/master-data';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

const QUERY_KEY = ['categories'];

const PaginatedCategoriesSchema = z.object({
  data: z.array(CategorySchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
    total_pages: z.number()
  })
});

export function useCategories(filters?: { search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    placeholderData: { data: [], meta: { total: 0, page: 1, page_size: 50, total_pages: 0 } },
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);

      return apiClient.get(`/categories${params.toString() ? `?${params.toString()}` : ''}`, PaginatedCategoriesSchema, { signal });
    },
    staleTime: 60_000,
  });
}

export function useCategory(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: ({ signal }) => {
      if (!id) return null;
      return apiClient.get(`/categories/${id}`, CategorySchema, { signal });
    },
    enabled: !!id && id !== 'undefined' && id !== 'null',
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.categories');

  return useMutation({
    mutationFn: ({ values, signal }: { values: CategoryFormValues; signal?: AbortSignal }) => {
      return apiClient.post('/categories', CategorySchema, values, { signal });
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

export function useUpdateCategory(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.categories');

  return useSafeMutation({
    onConflict: options?.onConflict,
    meta: { suppressGlobalConflict: true },
    mutationFn: ({ id, values, signal }: { id: string; values: CategoryFormValues; signal?: AbortSignal }) => {
      return apiClient.put(`/categories/${id}`, CategorySchema, values, { signal });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.setQueryData([...QUERY_KEY, data.id], data);
      toast.success(t('updated_success'));
    },
    onError: (error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      toast.error(t('errors.update_failed'));
    }
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.categories');

  return useMutation({
    mutationFn: ({ id, version, signal }: { id: string; version?: number; signal?: AbortSignal }) => {
      const url = version != null ? `/categories/${id}?version=${version}` : `/categories/${id}`;
      return apiClient.del(url, z.unknown(), { signal });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('deleted_success'));
    },
    onError: (error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      toast.error(t('errors.delete_failed'));
    }
  });
}
