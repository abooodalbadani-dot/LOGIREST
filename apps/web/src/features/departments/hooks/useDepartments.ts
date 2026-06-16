'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type DepartmentFormValues, DepartmentSchema } from '@/types/master-data';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

const QUERY_KEY = ['departments'];

export function useDepartments(filters?: { branchId?: string; warehouseId?: string; search?: string }) {
 return useQuery({
  queryKey: [...QUERY_KEY, filters],
  queryFn: ({ signal }) => {
   const params = new URLSearchParams();
   if (filters?.branchId) params.append('branchId', filters.branchId);
   if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId);
   if (filters?.search) params.append('search', filters.search);
   
   const path = `/departments${params.toString() ? `?${params.toString()}` : ''}`;
   return apiClient.get(path, paginatedSchema(DepartmentSchema), { signal });
  }
 });
}

export function useDepartment(id: string | null) {
 return useQuery({
  queryKey: [...QUERY_KEY, id],
  queryFn: ({ signal }) => {
   if (!id) return null;
   return apiClient.get(`/departments/${id}`, DepartmentSchema, { signal });
  },
  enabled: !!id && id !== 'undefined' && id !== 'null'
 });
}

export function useCreateDepartment() {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.departments');

 return useMutation({
  mutationFn: (variables: DepartmentFormValues & { signal?: AbortSignal }) => {
   const { signal, ...values } = variables;
   return apiClient.post('/departments', DepartmentSchema, {
    ...values
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

export function useUpdateDepartment(options?: { onConflict?: () => void }) {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.departments');

 return useSafeMutation({
  onConflict: options?.onConflict,
  meta: { suppressGlobalConflict: true },
  mutationFn: ({ id, values, signal }: { id: string; values: DepartmentFormValues; signal?: AbortSignal }) => {
   return apiClient.put(`/departments/${id}`, DepartmentSchema, {
    ...values
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
   
   const errorCode = err.code || err.message || 'update_failed';
   const translationKey = `errors.${errorCode}`;
   toast.error(t.has(translationKey) ? t(translationKey) : t('errors.update_failed'));
  }
 });
}

export function useDeleteDepartment() {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.departments');

 return useMutation({
  mutationFn: ({ id, version, signal }: { id: string; version?: number; signal?: AbortSignal }) => {
   const url = version != null ? `/departments/${id}?version=${version}` : `/departments/${id}`;
   return apiClient.del(url, z.unknown(), { signal });
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: QUERY_KEY });
   toast.success(t('deleted_success'));
  },
  onError: (error: unknown) => {
   const err = error as { name?: string; code?: string; message?: string };
   if (err.name === 'AbortError') return;
   
   const errorCode = err.code || err.message || 'delete_failed';
   const translationKey = `errors.${errorCode}`;
   toast.error(t.has(translationKey) ? t(translationKey) : t('errors.delete_failed'));
  }
 });
}

