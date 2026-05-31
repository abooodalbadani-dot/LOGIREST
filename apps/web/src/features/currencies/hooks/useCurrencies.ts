'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type Currency, type CurrencyFormValues, CurrencySchema } from '@/types/master-data';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { apiClient } from '@/lib/api/client';
import { type ApiError, paginatedSchema } from '@/types/api';

const QUERY_KEY = ['currencies'];

export function useCurrencies() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async ({ signal }) => {
      const response = await apiClient.get('/currencies', paginatedSchema(CurrencySchema), { signal });
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCurrency(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: ({ signal }) => {
      if (!id) return null;
      return apiClient.get(`/currencies/${id}`, CurrencySchema, { signal });
    },
    enabled: !!id && id !== 'undefined' && id !== 'null'
  });
}

export function useCreateCurrency() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.currencies');

  return useMutation({
    mutationFn: (variables: { values: CurrencyFormValues; signal?: AbortSignal }) => {
      const { signal, values } = variables;
      return apiClient.post('/currencies', CurrencySchema, {
        ...values,
        code: values.code ? values.code.toUpperCase() : undefined
      }, { signal });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('created_success'));
    },
    onError: (error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      const errorCode = (error as ApiError)?.code || (error as Error)?.message || 'create_failed';
      toast.error(t(`errors.${errorCode}`) || t('errors.create_failed'));
    }
  });
}

export function useUpdateCurrency(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.currencies');

  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: ({ id, values, signal }: { id: string; values: CurrencyFormValues; signal?: AbortSignal }) => {
      return apiClient.put(`/currencies/${id}`, CurrencySchema, {
        ...values,
        code: values.code ? values.code.toUpperCase() : undefined,
      }, { signal });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.setQueryData([...QUERY_KEY, data.id], data);
      toast.success(t('updated_success'));
    },
    onError: (error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      const errorCode = (error as ApiError)?.code || (error as Error)?.message || 'update_failed';
      toast.error(t(`errors.${errorCode}`) || t('errors.update_failed'));
    }
  });
}
