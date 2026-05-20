'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type UoM, type UoMFormValues, UoMSchema } from '@/types/master-data';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

const QUERY_KEY = ['uoms'];

const PaginatedUoMsSchema = z.object({
  data: z.array(UoMSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
    total_pages: z.number()
  })
});

export function useUoMs(filters?: { search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    placeholderData: { data: [], meta: { total: 0, page: 1, page_size: 50, total_pages: 0 } },
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);

      return apiClient.get(`/uoms${params.toString() ? `?${params.toString()}` : ''}`, PaginatedUoMsSchema, { signal });
    },
    staleTime: 60_000,
  });
}

export function useUoM(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: ({ signal }) => {
      if (!id) return null;
      return apiClient.get(`/uoms/${id}`, UoMSchema, { signal });
    },
    enabled: !!id,
  });
}

export function useCreateUoM() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.uoms');

  return useMutation({
    mutationFn: (values: UoMFormValues & { signal?: AbortSignal }) => {
      const { signal, ...dataValues } = values;
      return apiClient.post('/uoms', UoMSchema, {
        ...dataValues,
        code: dataValues.code.toUpperCase()
      }, { signal });
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

export function useUpdateUoM(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.uoms');

  return useSafeMutation({
    onConflict: options?.onConflict,
    meta: { suppressGlobalConflict: true },
    mutationFn: ({ id, values, signal }: { id: string; values: UoMFormValues; signal?: AbortSignal }) => {
      return apiClient.put(`/uoms/${id}`, UoMSchema, {
        ...values,
        code: values.code.toUpperCase()
      }, { signal });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.setQueryData([...QUERY_KEY, data.id], data);
      toast.success(t('updated_success'));
    },
    onError: (error: Error) => {
      if (error.message === 'Aborted') return;
      toast.error(t('errors.update_failed'));
    }
  });
}

export function useDeleteUoM() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.uoms');

  return useMutation({
    mutationFn: ({ id, version, signal }: { id: string; version?: number; signal?: AbortSignal }) => {
      const url = version != null ? `/uoms/${id}?version=${version}` : `/uoms/${id}`;
      return apiClient.del(url, z.unknown(), { signal });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('deleted_success'));
    },
    onError: (error: Error) => {
      if (error.message === 'Aborted') return;
      toast.error(t('errors.delete_failed'));
    }
  });
}
