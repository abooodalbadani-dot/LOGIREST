'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/types/api';

export function useDeletePR() {
 const queryClient = useQueryClient();
 const t = useTranslations('procurement.pr');
 const tc = useTranslations('common');

 return useMutation({
  mutationFn: ({ id, version, signal }: { id: string; version?: number; signal?: AbortSignal }) => {
   const url = version != null ? `/procurement/purchase-requests/${id}?version=${version}` : `/procurement/purchase-requests/${id}`;
   return apiClient.del(url, z.unknown(), { signal });
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
   toast.success(t('deleted_success'));
  },
  onError: (error: unknown) => {
   if (error instanceof Error && error.name === 'AbortError') return;
   const errObj = error as Record<string, unknown>;
   if (errObj?._isToastShown) return;
   toast.error(tc('error'));
  }
 });
}
