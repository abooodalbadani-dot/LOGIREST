'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type BranchFormValues, BranchSchema } from '@/types/master-data';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';

/**
 * LOGIREST ENTERPRISE STANDARDS: MASTER DATA
 * Query Key Discipline: ["branches"]
 */

const QUERY_KEY = ['branches'];

const PaginatedBranchesSchema = z.object({
  data: z.array(BranchSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
    total_pages: z.number()
  })
});

export function useBranches(filters?: { search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      
      const path = `/branches${params.toString() ? `?${params.toString()}` : ''}`;
      return apiClient.get(path, PaginatedBranchesSchema, signal);
    },
    staleTime: 60_000,
  });
}

export function useBranch(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: ({ signal }) => {
      if (!id) return null;
      return apiClient.get(`/branches/${id}`, BranchSchema, signal);
    },
    enabled: !!id,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.branches');

  return useMutation({
    mutationFn: (variables: BranchFormValues & { signal?: AbortSignal }) => {
      const { signal, ...values } = variables;
      return apiClient.post('/branches', BranchSchema, {
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

export function useUpdateBranch(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.branches');

  return useSafeMutation({
    onConflict: options?.onConflict,
    meta: { suppressGlobalConflict: true },
    mutationFn: ({ id, values, signal }: { id: string; values: BranchFormValues; signal?: AbortSignal }) => {
      return apiClient.put(`/branches/${id}`, BranchSchema, {
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
      const err = error as { name?: string; code?: string; message?: string };
      if (err.name === 'AbortError') return;
      
      const errorCode = err.code || err.message || 'update_failed';
      const translationKey = `errors.${errorCode}`;
      toast.error(t.has(translationKey) ? t(translationKey) : t('errors.update_failed'));
    }
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.branches');

  return useMutation({
    mutationFn: ({ id, signal }: { id: string; signal?: AbortSignal }) => {
      return apiClient.del(`/branches/${id}`, z.unknown(), signal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('deleted_success'));
    },
    onError: (error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      const errorCode = (error as { code?: string })?.code || (error as Error)?.message || 'delete_failed';
      const translationKey = `errors.${errorCode}`;
      toast.error(t.has(translationKey) ? t(translationKey) : t('errors.delete_failed'));
    }
  });
}

