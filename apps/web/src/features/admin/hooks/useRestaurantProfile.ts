'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { useAdminSettings } from './useAdminSettings';

const STORAGE_KEY = 'logirest_restaurant_profile';

export const RestaurantProfileSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required'),
  address: z.string().min(1, 'Address is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email address'),
  logo: z.string().optional(), // Base64 string
  taxNumber: z.string().optional(),
  commercialRegistration: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type RestaurantProfile = z.infer<typeof RestaurantProfileSchema>;

export function useRestaurantProfile() {
  const { data: settings } = useAdminSettings();

  return useQuery({
    queryKey: ['admin/restaurant-profile'],
    queryFn: async ({ signal }) => {
      // Small delay to simulate persistence fetch
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 300);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });
      
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (stored) {
        try {
          return JSON.parse(stored) as RestaurantProfile;
        } catch (e) {
          console.error('Failed to parse restaurant profile', e);
        }
      }
      
      // Fallback
      return {
        name: settings?.systemName || 'LogiRest Enterprise',
        address: '',
        phone: '',
        email: '',
        logo: '',
        taxNumber: '',
        commercialRegistration: '',
        updatedAt: new Date().toISOString(),
      } as RestaurantProfile;
    },
    staleTime: Infinity,
    enabled: !!settings || typeof window !== 'undefined',
  });
}

export function useUpdateRestaurantProfile() {
  const queryClient = useQueryClient();
  const t = useTranslations('admin.restaurant_profile');

  return useMutation({
    mutationFn: async ({ values, signal }: { values: RestaurantProfile; signal?: AbortSignal }) => {
      return Promise.race([
        (async () => {
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const profileWithDate = {
            ...values,
            updatedAt: new Date().toISOString(),
          };

          localStorage.setItem(STORAGE_KEY, JSON.stringify(profileWithDate));
          return profileWithDate;
        })(),
        new Promise<never>((_, reject) => 
          signal?.addEventListener('abort', () => reject(new Error('Aborted')))
        )
      ]);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin/restaurant-profile'], data);
      toast.success(t('save_success'));
    },
    onError: (error: Error) => {
      if (error.message === 'Aborted') return;
      toast.error(error.message || 'Failed to update restaurant profile');
    }
  });
}
