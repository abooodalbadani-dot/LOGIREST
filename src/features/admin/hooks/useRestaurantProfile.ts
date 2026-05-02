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
 tax_number: z.string().optional(),
 commercial_registration: z.string().optional(),
 updated_at: z.string().optional(),
});

export type RestaurantProfile = z.infer<typeof RestaurantProfileSchema>;

export function useRestaurantProfile() {
 const { data: settings } = useAdminSettings();

 return useQuery({
 queryKey: ['admin/restaurant-profile'],
 queryFn: async () => {
 // Small delay to simulate persistence fetch
 await new Promise(resolve => setTimeout(resolve, 300));
 
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
 name: settings?.system_name || 'LogiRest Enterprise',
 address: '',
 phone: '',
 email: '',
 logo: '',
 tax_number: '',
 commercial_registration: '',
 updated_at: new Date().toISOString(),
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
 mutationFn: async (newProfile: RestaurantProfile) => {
 // Simulate network delay
 await new Promise(resolve => setTimeout(resolve, 800));
 
 const profileWithDate = {
 ...newProfile,
 updated_at: new Date().toISOString(),
 };

 localStorage.setItem(STORAGE_KEY, JSON.stringify(profileWithDate));
 return profileWithDate;
 },
 onSuccess: (data) => {
 queryClient.setQueryData(['admin/restaurant-profile'], data);
 toast.success(t('save_success'));
 },
 onError: (error: Error) => {
 toast.error(error.message || 'Failed to update restaurant profile');
 }
 });
}
