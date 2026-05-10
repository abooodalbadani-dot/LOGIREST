'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api/client';
import { AdminSettingsSchema, type AdminSettings } from '@/types/admin';

export { AdminSettingsSchema, type AdminSettings };

export function useAdminSettings() {
  return useQuery({
    queryKey: ['admin/settings'],
    queryFn: () => apiClient.get('/admin/settings', AdminSettingsSchema),
    staleTime: 60_000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const t = useTranslations('admin.settings');

  return useMutation({
    mutationFn: (newSettings: AdminSettings) => 
      apiClient.put('/admin/settings', AdminSettingsSchema, newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin/settings'] });
      toast.success(t('settings_saved'));
    },
    onError: (error: any) => {
      // Conflict handling is managed by global apiClient/ConflictDialog
      if (error.status !== 409) {
        toast.error(error.message || 'Failed to update settings');
      }
    }
  });
}
