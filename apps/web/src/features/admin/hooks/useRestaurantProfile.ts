'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { useAdminSettings } from './useAdminSettings';
import { apiClient } from '@/lib/api/client';

export const RestaurantProfileSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required'),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  logo: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  taxNumber: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  commercialRegistration: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  socialLinks: z.string().optional().nullable(),
  updatedAt: z.string().optional().nullable(),
});

export type RestaurantProfile = z.infer<typeof RestaurantProfileSchema>;

export function useRestaurantProfile(options?: { enabled?: boolean }) {
  const isEnabled = options?.enabled ?? true;
  const { data: settings } = useAdminSettings({ enabled: isEnabled });

  return useQuery({
    queryKey: ['admin/restaurant-profile'],
    queryFn: async ({ signal }) => {
      try {
        const profile = await apiClient.get('/admin/restaurant-profile', RestaurantProfileSchema.partial(), { signal });
        
        const merged = {
          name: profile.name || settings?.systemName || 'Otantik مطاعم',
          address: profile.address || '',
          phone: profile.phone || '',
          email: profile.email || '',
          logo: profile.logo || '',
          taxNumber: profile.taxNumber || '',
          commercialRegistration: profile.commercialRegistration || '',
          updatedAt: profile.updatedAt || new Date().toISOString(),
        } as RestaurantProfile;

        if (typeof window !== 'undefined') {
          localStorage.setItem('logirest_restaurant_profile', JSON.stringify(merged));
        }
        
        return merged;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw err;
        }
        console.error('Failed to fetch restaurant profile:', err);

        const fallback = {
          name: settings?.systemName || 'Otantik مطاعم',
          address: '',
          phone: '',
          email: '',
          logo: '',
          taxNumber: '',
          commercialRegistration: '',
          updatedAt: new Date().toISOString(),
        } as RestaurantProfile;

        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('logirest_restaurant_profile');
          if (cached) {
            try {
              return JSON.parse(cached) as RestaurantProfile;
            } catch {
              // ignore parse errors
            }
          }
          localStorage.setItem('logirest_restaurant_profile', JSON.stringify(fallback));
        }
        
        return fallback;
      }
    },
    staleTime: Infinity,
    enabled: isEnabled && !!settings,
  });
}

export function useUpdateRestaurantProfile() {
  const queryClient = useQueryClient();
  const t = useTranslations('admin.restaurant_profile');

  return useMutation({
    mutationFn: async ({ values, signal }: { values: RestaurantProfile; signal?: AbortSignal }) => {
      const profileWithDate = {
        ...values,
        updatedAt: new Date().toISOString(),
      };
      
      await apiClient.put('/admin/restaurant-profile', z.any(), profileWithDate, { signal });
      return profileWithDate;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin/restaurant-profile'], data);
      if (typeof window !== 'undefined') {
        localStorage.setItem('logirest_restaurant_profile', JSON.stringify(data));
      }
      toast.success(t('save_success'));
    },
    onError: (error: Error) => {
      if (error.name === 'AbortError' || error.message === 'Aborted') return;
      toast.error(error.message || 'Failed to update restaurant profile');
    }
  });
}

