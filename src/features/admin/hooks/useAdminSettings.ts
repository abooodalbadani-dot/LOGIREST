'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { z } from 'zod';

export const SettingsSchema = z.object({
 system_name: z.string().min(1, 'System name is required'),
 default_language: z.enum(['en', 'ar']),
 base_currency: z.string().min(1, 'Base currency is required'),
 sender_name: z.string().min(1, 'Sender name is required'),
 reply_to_email: z.string().email('Invalid email address'),
});

export type SystemSettings = z.infer<typeof SettingsSchema>;

const MOCK_SETTINGS: SystemSettings = {
 system_name: 'LogiRest Enterprise',
 default_language: 'en',
 base_currency: 'SAR',
 sender_name: 'LogiRest System',
 reply_to_email: 'no-reply@logirest.com',
};

export function useAdminSettings() {
 return useQuery({
 queryKey: ['admin/settings'],
 queryFn: async () => {
 // Simulate network delay
 await new Promise(resolve => setTimeout(resolve, 500));
 return MOCK_SETTINGS;
 },
 staleTime: 60_000,
 });
}

export function useUpdateSettings() {
 const queryClient = useQueryClient();
 const t = useTranslations('admin.settings');

 return useMutation({
 mutationFn: async (newSettings: SystemSettings) => {
 // Simulate network delay
 await new Promise(resolve => setTimeout(resolve, 1000));
 
 // Validation (Zod usually handled in form, but extra safety here)
 SettingsSchema.parse(newSettings);
 
 return newSettings;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['admin/settings'] });
 toast.success(t('settings_saved'));
 },
 onError: (error: Error) => {
 toast.error(error.message || 'Failed to update settings');
 }
 });
}
