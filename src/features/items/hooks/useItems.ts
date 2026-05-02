'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type Item, type ItemFormValues } from '@/types/master-data';

const QUERY_KEY = ['items'];

const INITIAL_ITEMS: Item[] = [
 {
 id: 'ITEM-001',
 code: 'SKU-TOM-001',
 barcode: '6281000000012',
 name_en: 'Tomato Paste 400g',
 name_ar: 'معجون طماطم 400 جرام',
 category_id: 'CAT-001',
 primary_uom: { id: 'UOM-001', code: 'PCS', name_en: 'Piece', name_ar: 'حبة', is_active: true, created_at: new Date().toISOString() },
 uom_conversions: [],
 track_lots: true,
 min_stock_level: 50,
 reorder_point: 100,
 is_active: true,
 },
 {
 id: 'ITEM-002',
 code: 'SKU-OIL-001',
 barcode: '6281000000029',
 name_en: 'Olive Oil 1L',
 name_ar: 'زيت زيتون 1 لتر',
 category_id: 'CAT-001',
 primary_uom: { id: 'UOM-002', code: 'L', name_en: 'Liter', name_ar: 'لتر', is_active: true, created_at: new Date().toISOString() },
 uom_conversions: [],
 track_lots: false,
 min_stock_level: 20,
 reorder_point: 40,
 is_active: true,
 },
 {
 id: 'ITEM-003',
 code: 'SKU-KNIFE-001',
 barcode: '6281000000036',
 name_en: 'Chef Knife 8"',
 name_ar: 'سكين شيف 8 بوصة',
 category_id: 'CAT-002',
 primary_uom: { id: 'UOM-003', code: 'PCS', name_en: 'Piece', name_ar: 'حبة', is_active: true, created_at: new Date().toISOString() },
 uom_conversions: [],
 track_lots: false,
 min_stock_level: 5,
 reorder_point: 10,
 is_active: true,
 },
];

export function useItems(filters?: { search?: string; category_id?: string; is_active?: boolean }) {
 const queryClient = useQueryClient();

 return useQuery({
 queryKey: [...QUERY_KEY, filters],
 queryFn: async () => {
 await new Promise(resolve => setTimeout(resolve, 600));
 
 let data = queryClient.getQueryData<Item[]>(QUERY_KEY);
 if (!data) {
 data = INITIAL_ITEMS;
 queryClient.setQueryData(QUERY_KEY, data);
 }

 let filtered = [...data];
 
 if (filters?.search) {
 const s = filters.search.toLowerCase();
 filtered = filtered.filter(i => 
 i.code.toLowerCase().includes(s) || 
 i.name_en.toLowerCase().includes(s) || 
 i.name_ar.includes(s) ||
 i.barcode?.includes(s)
 );
 }

 if (filters?.category_id) {
 filtered = filtered.filter(i => i.category_id === filters.category_id);
 }

 if (filters?.is_active !== undefined) {
 filtered = filtered.filter(i => i.is_active === filters.is_active);
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

export function useItem(id: string | null) {
 const queryClient = useQueryClient();

 return useQuery({
 queryKey: [...QUERY_KEY, id],
 queryFn: async () => {
 if (!id) return null;
 await new Promise(resolve => setTimeout(resolve, 300));
 
 const data = queryClient.getQueryData<Item[]>(QUERY_KEY) || INITIAL_ITEMS;
 return data.find(i => i.id === id) || null;
 },
 enabled: !!id,
 });
}

export function useCreateItem() {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.items');

 return useMutation({
 mutationFn: async (values: ItemFormValues) => {
 await new Promise(resolve => setTimeout(resolve, 1000));
 
 const newItem: Item = {
 ...values,
 id: `ITEM- ${Math.floor(Math.random() * 1000)}`,
 code: values.code.toUpperCase(),
 uom_conversions: values.uom_conversions || [],
 primary_uom: {
 id: values.primary_uom_id,
 code: 'PCS', // Mock code
 name_en: 'Mock UoM',
 name_ar: 'وحدة قياس',
 is_active: true,
 created_at: new Date().toISOString()
 }
 };

 queryClient.setQueryData<Item[]>(QUERY_KEY, (old = INITIAL_ITEMS) => [...old, newItem]);
 return newItem;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: QUERY_KEY });
 toast.success(t('created_success'));
 }
 });
}

export function useUpdateItem() {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.items');

 return useMutation({
 mutationFn: async ({ id, values }: { id: string; values: ItemFormValues }) => {
 await new Promise(resolve => setTimeout(resolve, 1000));

 const data = queryClient.getQueryData<Item[]>(QUERY_KEY) || INITIAL_ITEMS;
 const item = data.find(i => i.id === id);
 if (!item) throw new Error('Item not found');

 // OPERATIONAL GUARD: Prevent deactivation if stock exists
 // MOCK: ITEM-001 has stock
 if (id === 'ITEM-001' && values.is_active === false && item.is_active === true) {
 throw new Error('GUARD_STOCK_EXISTS');
 }

 const updatedItem: Item = { 
 ...item, 
 ...values,
 code: values.code.toUpperCase(),
 primary_uom: values.primary_uom_id === item.primary_uom.id ? item.primary_uom : {
 id: values.primary_uom_id,
 code: 'PCS', // Mock code
 name_en: 'Mock UoM',
 name_ar: 'وحدة قياس',
 is_active: true,
 created_at: item.primary_uom.created_at
 }
 };

 queryClient.setQueryData<Item[]>(QUERY_KEY, (old = INITIAL_ITEMS) => 
 old.map(i => i.id === id ? updatedItem : i)
 );

 return updatedItem;
 },
 onSuccess: (data) => {
 queryClient.invalidateQueries({ queryKey: QUERY_KEY });
 queryClient.setQueryData([...QUERY_KEY, data.id], data);
 toast.success(t('updated_success'));
 },
 onError: (error: Error) => {
 if (error.message === 'GUARD_STOCK_EXISTS') {
 toast.error(t('errors.cannot_deactivate_with_stock'));
 } else {
 toast.error(t('errors.update_failed'));
 }
 }
 });
}
