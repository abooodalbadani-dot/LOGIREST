'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type FXRate, type FXRateFormValues, FXRateSchema } from '@/types/master-data';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

const QUERY_KEY = ['fx_rates'];

export function useFXRates() {
 return useQuery({
  queryKey: QUERY_KEY,
  placeholderData: [],
  queryFn: ({ signal }) =>
   apiClient.get('/currencies/fx-rates', z.array(FXRateSchema), { signal }),
  staleTime: 60_000,
 });
}

export function useFXRate(id: string | null) {
 return useQuery({
  queryKey: [...QUERY_KEY, id],
  queryFn: ({ signal }) => {
   if (!id) return null;
   return apiClient.get(`/currencies/fx-rates/${id}`, FXRateSchema, { signal });
  },
  enabled: !!id,
 });
}

export function useCreateFXRate() {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.fx_rates');

 return useMutation({
  mutationFn: ({ values, signal }: { values: FXRateFormValues; signal?: AbortSignal }) => {
   const { effectiveDate, ...rest } = values;
   return apiClient.post('/currencies/fx-rates', FXRateSchema, {
    ...rest,
    effectiveFrom: new Date(effectiveDate).toISOString(),
   }, { signal });
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: QUERY_KEY });
   toast.success(t('save_success'));
  },
  onError: (error: Error) => {
   if (error.message === 'AbortError') return;
   toast.error(t('errors.update_failed'));
  }
 });
}

export function useUpdateFXRate(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.fx_rates');

 return useSafeMutation({
  onConflict: options?.onConflict,
  mutationFn: ({ id, values, signal }: { id: string; values: FXRateFormValues; signal?: AbortSignal }) => {
   const { effectiveDate, ...rest } = values;
   return apiClient.put(`/currencies/fx-rates/${id}`, FXRateSchema, {
    ...rest,
    effectiveFrom: new Date(effectiveDate).toISOString(),
   }, { signal });
  },
  onSuccess: (data) => {
   queryClient.invalidateQueries({ queryKey: QUERY_KEY });
   queryClient.setQueryData([...QUERY_KEY, data.id], data);
   toast.success(t('update_success'));
  },
  onError: (error: Error) => {
   if (error.message === 'AbortError') return;
   toast.error(t('errors.update_failed'));
  }
 });
}
