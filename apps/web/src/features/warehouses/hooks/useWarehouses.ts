'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type Warehouse, type WarehouseFormValues, WarehouseSchema } from '@/types/master-data';
import { type ApiError, paginatedSchema, PaginatedResponse } from '@/types/api';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

const QUERY_KEY = ['warehouses'];

export function useWarehouses(filters?: { branch_id?: string; search?: string; includeInactive?: boolean }) {
 return useQuery({
  queryKey: [...QUERY_KEY, filters],
  queryFn: ({ signal }) => {
   const params = new URLSearchParams();
   if (filters?.branch_id) params.append('branchId', filters.branch_id);
   if (filters?.search) params.append('search', filters.search);
   if (filters?.includeInactive) params.append('includeInactive', 'true');
   
   const path = `/warehouses${params.toString() ? `?${params.toString()}` : ''}`;
   return apiClient.get<PaginatedResponse<Warehouse>>(path, paginatedSchema(WarehouseSchema), { signal });
  }
 });
}

export function useWarehouse(id: string | null) {
 return useQuery({
  queryKey: [...QUERY_KEY, id],
  queryFn: ({ signal }) => {
   if (!id) return null;
   return apiClient.get(`/warehouses/${id}`, WarehouseSchema, { signal });
  },
  enabled: !!id && id !== 'undefined' && id !== 'null'
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
    code: values.code ? values.code.toUpperCase() : undefined
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

export function useUpdateWarehouse(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.warehouses');

 return useSafeMutation({
  onConflict: options?.onConflict,
  meta: { suppressGlobalConflict: true },
  mutationFn: ({ id, values, version, signal }: { id: string; values: WarehouseFormValues; version?: number; signal?: AbortSignal }) => {
   return apiClient.put(`/warehouses/${id}`, WarehouseSchema, {
    ...values,
    code: values.code ? values.code.toUpperCase() : undefined,
    version
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
   const translationKey = `errors.${errorCode}`;
   toast.error(t.has(translationKey) ? t(translationKey) : t('errors.update_failed'));
  }
 });
}

export function useDeleteWarehouse() {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.warehouses');

 return useMutation({
  mutationFn: ({ id, version, signal }: { id: string; version?: number; signal?: AbortSignal }) => {
   const url = version != null ? `/warehouses/${id}?version=${version}` : `/warehouses/${id}`;
   return apiClient.del(url, z.object({ id: z.string() }).or(z.unknown()), { signal });
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

export function useArchiveWarehouse() {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.warehouses');

 return useMutation({
  mutationFn: ({ id, version, signal }: { id: string; version?: number; signal?: AbortSignal }) => {
   const url = version != null ? `/warehouses/${id}/archive?version=${version}` : `/warehouses/${id}/archive`;
   return apiClient.post(url, WarehouseSchema, {}, { signal });
  },
  onSuccess: (data) => {
   queryClient.invalidateQueries({ queryKey: QUERY_KEY });
   queryClient.setQueryData([...QUERY_KEY, data.id], data);
   toast.success(t('archived_success') || 'Warehouse archived successfully');
  },
  onError: (error: unknown) => {
   if (error instanceof Error && error.name === 'AbortError') return;
   
   const errorCode = (error as ApiError)?.code || (error as Error)?.message || 'archive_failed';
   const translationKey = `errors.${errorCode}`;
   toast.error(t.has(translationKey) ? t(translationKey) : t('errors.archive_failed') || 'Failed to archive warehouse');
  }
 });
}

