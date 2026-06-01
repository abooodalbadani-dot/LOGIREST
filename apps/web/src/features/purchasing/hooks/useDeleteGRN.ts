'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/types/api';

export function useDeleteGRN() {
  const queryClient = useQueryClient();
  const t = useTranslations('procurement.grn');

  return useMutation({
    mutationFn: ({ id, version, signal }: { id: string; version?: number; signal?: AbortSignal }) => {
      const url = version != null ? `/procurement/grns/${id}?version=${version}` : `/procurement/grns/${id}`;
      return apiClient.del(url, z.unknown(), { signal });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      toast.success(t('deleted_success') || 'GRN deleted successfully');
    },
    onError: (error: unknown) => {
      if (error instanceof Error && error.name === 'AbortError') return;
      
      const errorCode = (error as ApiError)?.code || (error as Error)?.message || 'delete_failed';
      const translationKey = `errors.${errorCode}`;
      toast.error(t.has(translationKey) ? t(translationKey) : t('errors.delete_failed') || 'Failed to delete GRN');
    }
  });
}
