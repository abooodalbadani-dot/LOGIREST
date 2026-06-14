'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type BranchFormValues, BranchSchema } from '@/types/master-data';
import { apiClient } from '@/lib/api/client';
import { paginatedSchema } from '@/types/api';
import { z } from 'zod';

/**
 * Otantik مطاعم STANDARDS: MASTER DATA
 * Query Key Discipline: ["branches"]
 */

const QUERY_KEY = ['branches'];

export function useBranches(filters?: { search?: string }) {
  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    queryFn: ({ signal }) => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      
      const path = `/branches${params.toString() ? `?${params.toString()}` : ''}`;
      return apiClient.get(path, paginatedSchema(BranchSchema), { signal });
    },
    staleTime: 60_000,
  });
}

export function useBranch(id: string | null) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: ({ signal }) => {
      if (!id) return null;
      return apiClient.get(`/branches/${id}`, BranchSchema, { signal });
    },
    enabled: !!id && id !== 'undefined' && id !== 'null',
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.branches');

  return useMutation({
    mutationFn: (variables: BranchFormValues & { signal?: AbortSignal }) => {
      const { signal, name, code, isActive } = variables;
      // Send ONLY the fields the CreateBranchDto accepts: { name, code, isActive }
      // This mirrors the successful test script payload exactly.
      const payload: { name: string; code?: string; isActive?: boolean } = {
        name,
        ...(code ? { code: code.toUpperCase() } : {}),
        isActive: isActive ?? true,
      };
      return apiClient.post('/branches', BranchSchema, payload, { signal });
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
      const { name, code, isActive, version } = values;
      // Send only UpdateBranchDto fields: { name, code, isActive, version }
      const payload: { name?: string; code?: string; isActive?: boolean; version?: number } = {
        ...(name ? { name } : {}),
        ...(code ? { code: code.toUpperCase() } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(version !== undefined ? { version } : {}),
      };
      return apiClient.put(`/branches/${id}`, BranchSchema, payload, { signal });
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
    mutationFn: ({ id, version, signal }: { id: string; version?: number; signal?: AbortSignal }) => {
      const url = version != null ? `/branches/${id}?version=${version}` : `/branches/${id}`;
      return apiClient.del(url, z.unknown(), { signal });
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


