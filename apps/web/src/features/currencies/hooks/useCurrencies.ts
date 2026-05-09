'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type Currency, type CurrencyFormValues } from '@/types/master-data';

const QUERY_KEY = ['currencies'];

const INITIAL_CURRENCIES: Currency[] = [
 {
 id: 'CUR-SAR',
 code: 'SAR',
 name_ar: 'ريال سعودي',
 name_en: 'Saudi Riyal',
 symbol: 'SR',
 is_base_currency: true,
 is_active: true,
 created_at: new Date('2024-01-01').toISOString()
 },
 {
 id: 'CUR-USD',
 code: 'USD',
 name_ar: 'دولار أمريكي',
 name_en: 'US Dollar',
 symbol: '$',
 is_base_currency: false,
 is_active: true,
 created_at: new Date('2024-01-02').toISOString()
 }
];

export function useCurrencies() {
 const queryClient = useQueryClient();

 return useQuery({
 queryKey: QUERY_KEY,
 queryFn: async () => {
 await new Promise(resolve => setTimeout(resolve, 500));
 
 let data = queryClient.getQueryData<Currency[]>(QUERY_KEY);
 if (!data) {
 data = INITIAL_CURRENCIES;
 queryClient.setQueryData(QUERY_KEY, data);
 }
 return data;
 }
 });
}

export function useCurrency(id: string | null) {
 const queryClient = useQueryClient();

 return useQuery({
 queryKey: [...QUERY_KEY, id],
 queryFn: async () => {
 if (!id) return null;
 await new Promise(resolve => setTimeout(resolve, 300));
 
 const data = queryClient.getQueryData<Currency[]>(QUERY_KEY) || INITIAL_CURRENCIES;
 return data.find(c => c.id === id) || null;
 },
 enabled: !!id
 });
}

export function useCreateCurrency() {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.currencies');

 return useMutation({
 mutationFn: async (values: CurrencyFormValues) => {
 await new Promise(resolve => setTimeout(resolve, 800));
 
 const data = queryClient.getQueryData<Currency[]>(QUERY_KEY) || INITIAL_CURRENCIES;
 
 // GUARD: Uniqueness (Case-insensitive)
 const exists = data.some(c => c.code.toUpperCase() === values.code.toUpperCase());
 if (exists) {
 throw new Error('code_exists');
 }

 const newCurrency: Currency = {
 id: `CUR- ${values.code.toUpperCase()}`,
 ...values,
 code: values.code.toUpperCase(),
 created_at: new Date().toISOString()
 };

 queryClient.setQueryData<Currency[]>(QUERY_KEY, (old = INITIAL_CURRENCIES) => {
 let updated = [...old];
 // If new is base, unset others
 if (newCurrency.is_base_currency) {
 updated = updated.map(c => ({ ...c, is_base_currency: false }));
 }
 return [...updated, newCurrency];
 });

 return newCurrency;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: QUERY_KEY });
 toast.success(t('created_success'));
 },
 onError: (error: Error) => {
 toast.error(t(`errors.${error.message}`) || t('errors.update_failed'));
 }
 });
}

export function useUpdateCurrency() {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.currencies');

 return useMutation({
 mutationFn: async ({ id, values }: { id: string; values: CurrencyFormValues }) => {
 await new Promise(resolve => setTimeout(resolve, 800));
 
 const data = queryClient.getQueryData<Currency[]>(QUERY_KEY) || INITIAL_CURRENCIES;
 const currency = data.find(c => c.id === id);
 if (!currency) throw new Error('Currency not found');

 // GUARD: Uniqueness if code changed
 if (values.code.toUpperCase() !== currency.code.toUpperCase()) {
 const exists = data.some(c => c.id !== id && c.code.toUpperCase() === values.code.toUpperCase());
 if (exists) {
 throw new Error('code_exists');
 }
 }

 // GUARD: Cannot deactivate base currency
 if (values.is_active === false && currency.is_base_currency) {
 throw new Error('cannot_deactivate_base');
 }

 // GUARD: Deactivation if in use (Mock)
 if (values.is_active === false && currency.is_active === true) {
 if (id === 'CUR-SAR' || id === 'CUR-USD') {
 throw new Error('cannot_deactivate_in_use');
 }
 }

 // GUARD: Base currency logic
 // If unsetting base, check if another one exists
 if (currency.is_base_currency && !values.is_base_currency) {
 const otherBase = data.some(c => c.id !== id && c.is_base_currency);
 if (!otherBase) {
 throw new Error('base_required');
 }
 }

 const updatedCurrency: Currency = { 
 ...currency, 
 ...values,
 code: values.code.toUpperCase()
 };

 queryClient.setQueryData<Currency[]>(QUERY_KEY, (old = INITIAL_CURRENCIES) => {
 let updated = old.map(c => c.id === id ? updatedCurrency : c);
 
 // If this one is now base, unset others
 if (updatedCurrency.is_base_currency) {
 updated = updated.map(c => c.id === id ? c : { ...c, is_base_currency: false });
 }
 
 return updated;
 });

 return updatedCurrency;
 },
 onSuccess: (data) => {
 queryClient.invalidateQueries({ queryKey: QUERY_KEY });
 queryClient.setQueryData([...QUERY_KEY, data.id], data);
 toast.success(t('updated_success'));
 },
 onError: (error: Error) => {
 toast.error(t(`errors.${error.message}`) || t('errors.update_failed'));
 }
 });
}
