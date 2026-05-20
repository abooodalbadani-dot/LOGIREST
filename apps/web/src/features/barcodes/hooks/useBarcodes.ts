'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type Barcode, type BarcodeFormValues, BarcodeSchema } from '@/types/master-data';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

const QUERY_KEY = ['barcodes'];

const PaginatedBarcodesSchema = z.object({
  data: z.array(BarcodeSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
    total_pages: z.number()
  })
});

export function useBarcodes(filters?: { item_id?: string; search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    placeholderData: { data: [], meta: { total: 0, page: 1, page_size: 50, total_pages: 0 } },
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.item_id) params.append('item_id', filters.item_id);
      if (filters?.search) params.append('search', filters.search);

      return apiClient.get(`/barcodes${params.toString() ? `?${params.toString()}` : ''}`, PaginatedBarcodesSchema, { signal });
    },
    staleTime: 60_000,
  });
}

export function useBarcode(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: ({ signal }) => {
      if (!id) return null;
      return apiClient.get(`/barcodes/${id}`, BarcodeSchema, { signal });
    },
    enabled: !!id,
  });
}

export function useCreateBarcode() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.barcodes');

  return useMutation({
    mutationFn: ({ values, signal }: { values: BarcodeFormValues; signal?: AbortSignal }) => {
      return apiClient.post('/barcodes', BarcodeSchema, values, { signal });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('created_success'));
    },
    onError: (error: Error) => {
      if (error.message === 'Aborted') return;
      toast.error(t('errors.create_failed'));
    }
  });
}

export function useUpdateBarcode(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.barcodes');

  return useSafeMutation({
    onConflict: options?.onConflict,
    meta: { suppressGlobalConflict: true },
    mutationFn: ({ id, values, signal }: { id: string; values: BarcodeFormValues; signal?: AbortSignal }) => {
      return apiClient.put(`/barcodes/${id}`, BarcodeSchema, values, { signal });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.setQueryData([...QUERY_KEY, (data as Barcode).id], data);
      toast.success(t('updated_success'));
    },
    onError: (error: Error) => {
      if (error.message === 'Aborted') return;
      toast.error(t('errors.update_failed'));
    }
  });
}

export function useDeleteBarcode() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.barcodes');

  return useMutation({
    mutationFn: ({ id, version, signal }: { id: string; version?: number; signal?: AbortSignal }) => {
      const url = version != null ? `/barcodes/${id}?version=${version}` : `/barcodes/${id}`;
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
