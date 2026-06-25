'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api/client';
import { AdminSettingsSchema, type AdminSettings } from '@/types/admin';

import { useAuth } from '@/providers/AuthProvider';

export { AdminSettingsSchema, type AdminSettings };

export function useAdminSettings(options?: { enabled?: boolean }) {
 const { user } = useAuth();
 const isEnabled = options?.enabled ?? true;
 return useQuery({
  queryKey: ['admin/settings'],
  queryFn: ({ signal }) => apiClient.get('/admin/settings', AdminSettingsSchema, { signal, skipAutoToast: true }),
  staleTime: 60_000,
  enabled: isEnabled && user?.role === 'ADMIN',
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
  onError: (error: unknown) => {
   // Conflict handling is managed by global apiClient/ConflictDialog
   const err = error as { status?: number; message?: string };
   if (err.status !== 409) {
    toast.error(err.message || 'Failed to update settings');
   }
  }
 });
}
