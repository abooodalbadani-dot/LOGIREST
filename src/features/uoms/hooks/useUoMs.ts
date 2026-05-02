'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type UoM, type UoMFormValues } from '@/types/master-data';

const QUERY_KEY = ['uoms'];

const INITIAL_UOMS: UoM[] = [
 { id: 'UOM-001', code: 'KG', name_ar: 'كيلو جرام', name_en: 'Kilogram', is_active: true, created_at: new Date().toISOString() },
 { id: 'UOM-002', code: 'L', name_ar: 'لتر', name_en: 'Liter', is_active: true, created_at: new Date().toISOString() },
 { id: 'UOM-003', code: 'PCS', name_ar: 'حبة', name_en: 'Piece', is_active: true, created_at: new Date().toISOString() },
 { id: 'UOM-004', code: 'BOX', name_ar: 'صندوق', name_en: 'Box', is_active: true, created_at: new Date().toISOString() },
 { id: 'UOM-005', code: 'PKT', name_ar: 'باكيت', name_en: 'Packet', is_active: false, created_at: new Date().toISOString() },
];

export function useUoMs(filters?: { search?: string }) {
 const queryClient = useQueryClient();

 return useQuery({
 queryKey: [...QUERY_KEY, filters],
 queryFn: async () => {
 await new Promise(resolve => setTimeout(resolve, 400));
 
 let data = queryClient.getQueryData<UoM[]>(QUERY_KEY);
 if (!data) {
 data = INITIAL_UOMS;
 queryClient.setQueryData(QUERY_KEY, data);
 }

 let filtered = [...data];
 if (filters?.search) {
 const s = filters.search.toLowerCase();
 filtered = filtered.filter(u => 
 u.code.toLowerCase().includes(s) || 
 u.name_en.toLowerCase().includes(s) || 
 u.name_ar.includes(s)
 );
 }

 return {
 data: filtered,
 meta: {
 total: filtered.length,
 page: 1,
 page_size: 50,
 total_pages: 1
 }
 };
 }
 });
}

export function useUoM(id: string | null) {
 const queryClient = useQueryClient();

 return useQuery({
 queryKey: [...QUERY_KEY, id],
 queryFn: async () => {
 if (!id) return null;
 await new Promise(resolve => setTimeout(resolve, 200));
 
 const data = queryClient.getQueryData<UoM[]>(QUERY_KEY) || INITIAL_UOMS;
 return data.find(u => u.id === id) || null;
 },
 enabled: !!id,
 });
}

export function useCreateUoM() {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.uoms');

 return useMutation({
 mutationFn: async (values: UoMFormValues) => {
 await new Promise(resolve => setTimeout(resolve, 600));
 
 const newUoM: UoM = {
 id: `UOM- ${Math.floor(Math.random() * 1000)}`,
 ...values,
 code: values.code.toUpperCase(),
 created_at: new Date().toISOString()
 };

 queryClient.setQueryData<UoM[]>(QUERY_KEY, (old = INITIAL_UOMS) => [...old, newUoM]);
 return newUoM;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: QUERY_KEY });
 toast.success(t('created_success'));
 }
 });
}

export function useUpdateUoM() {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.uoms');

 return useMutation({
 mutationFn: async ({ id, values }: { id: string; values: UoMFormValues }) => {
 await new Promise(resolve => setTimeout(resolve, 600));

 const data = queryClient.getQueryData<UoM[]>(QUERY_KEY) || INITIAL_UOMS;
 const uom = data.find(u => u.id === id);
 if (!uom) throw new Error('UoM not found');

 // OPERATIONAL GUARD: Prevent deactivation if linked to items
 // MOCK: UOM-001 is linked to items
 if (id === 'UOM-001' && values.is_active === false && uom.is_active === true) {
 throw new Error('GUARD_LINKED_ITEMS');
 }

 const updatedUoM = { 
 ...uom, 
 ...values,
 code: values.code.toUpperCase()
 };

 queryClient.setQueryData<UoM[]>(QUERY_KEY, (old = INITIAL_UOMS) => 
 old.map(u => u.id === id ? updatedUoM : u)
 );

 return updatedUoM;
 },
 onSuccess: (data) => {
 queryClient.invalidateQueries({ queryKey: QUERY_KEY });
 queryClient.setQueryData([...QUERY_KEY, data.id], data);
 toast.success(t('updated_success'));
 },
 onError: (error: Error) => {
 if (error.message === 'GUARD_LINKED_ITEMS') {
 toast.error(t('errors.cannot_deactivate_uom_in_use'));
 } else {
 toast.error(t('errors.update_failed'));
 }
 }
 });
}
