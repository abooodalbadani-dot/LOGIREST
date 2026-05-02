'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type Branch, type BranchFormValues } from '@/types/master-data';

/**
 * LOGIREST ENTERPRISE STANDARDS: MASTER DATA
 * Query Key Discipline: ["branches"]
 */

const MOCK_BRANCHES: Branch[] = [
 {
 id: 'BR-001',
 code: 'MAIN-HQ',
 name_en: 'Main Headquarters',
 name_ar: 'المركز الرئيسي',
 is_active: true,
 created_at: new Date('2024-01-01').toISOString(),
 },
 {
 id: 'BR-002',
 code: 'NORTH-HUB',
 name_en: 'North Logistics Hub',
 name_ar: 'مركز الشمال اللوجستي',
 is_active: true,
 created_at: new Date('2024-02-15').toISOString(),
 },
 {
 id: 'BR-003',
 code: 'WEST-DIST',
 name_en: 'West Distribution Center',
 name_ar: 'مركز توزيع الغرب',
 is_active: false,
 created_at: new Date('2024-03-10').toISOString(),
 }
];

export function useBranches(filters?: { search?: string }) {
 return useQuery({
 queryKey: ['branches', filters],
 queryFn: async () => {
 await new Promise(resolve => setTimeout(resolve, 500));
 let data = [...MOCK_BRANCHES];
 
 if (filters?.search) {
 const s = filters.search.toLowerCase();
 data = data.filter(b => 
 b.name_en.toLowerCase().includes(s) || 
 b.name_ar.includes(s) || 
 b.code.toLowerCase().includes(s)
 );
 }

 return {
 data,
 meta: {
 total: data.length,
 page: 1,
 page_size: 10,
 total_pages: 1
 }
 };
 },
 staleTime: 60_000,
 });
}

export function useBranch(id: string | null) {
 return useQuery({
 queryKey: ['branches', id],
 queryFn: async () => {
 await new Promise(resolve => setTimeout(resolve, 300));
 const branch = MOCK_BRANCHES.find(b => b.id === id);
 if (!branch) throw new Error('Branch not found');
 return branch;
 },
 enabled: !!id,
 });
}

export function useCreateBranch() {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.branches');

 return useMutation({
 mutationFn: async (values: BranchFormValues) => {
 await new Promise(resolve => setTimeout(resolve, 800));
 // Force uppercase code per enterprise rules
 const finalValues = {
 ...values,
 code: values.code.toUpperCase()
 };
 return { ...finalValues, id: `BR- ${Math.floor(Math.random() * 1000)}`, created_at: new Date().toISOString() };
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['branches'] });
 toast.success(t('created_success'));
 }
 });
}

export function useUpdateBranch() {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.branches');

 return useMutation({
 mutationFn: async ({ id, values }: { id: string; values: BranchFormValues }) => {
 await new Promise(resolve => setTimeout(resolve, 800));

 // OPERATIONAL GUARD: Prevent deactivation if linked to active warehouses
 // MOCK: BR-001 is linked to active warehouses in our simulation
 if (id === 'BR-001' && values.is_active === false) {
 throw new Error('GUARD_ACTIVE_WAREHOUSES');
 }

 const finalValues = {
 ...values,
 code: values.code.toUpperCase()
 };

 return { ...finalValues, id };
 },
 onSuccess: (data) => {
 queryClient.invalidateQueries({ queryKey: ['branches'] });
 queryClient.setQueryData(['branches', data.id], data);
 toast.success(t('updated_success'));
 },
 onError: (error: Error) => {
 if (error.message === 'GUARD_ACTIVE_WAREHOUSES') {
 toast.error(t('errors.deactivate_linked_warehouses'));
 } else {
 toast.error(t('errors.update_failed'));
 }
 }
 });
}
