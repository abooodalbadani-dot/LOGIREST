'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type Department, type DepartmentFormValues } from '@/types/master-data';

const QUERY_KEY = ['departments'];

const INITIAL_DEPARTMENTS: Department[] = [
 { 
 id: 'D-001', 
 branch_id: 'BR-001', 
 warehouse_id: 'W-001', 
 code: 'KITCH-01', 
 name_en: 'Main Kitchen', 
 name_ar: 'المطبخ الرئيسي', 
 is_active: true 
 },
 { 
 id: 'D-002', 
 branch_id: 'BR-001', 
 warehouse_id: 'W-001', 
 code: 'REST-01', 
 name_en: 'Dining Hall', 
 name_ar: 'صالة الطعام', 
 is_active: true 
 }
];

export function useDepartments(filters?: { branch_id?: string; warehouse_id?: string; search?: string }) {
 const queryClient = useQueryClient();

 return useQuery({
 queryKey: [...QUERY_KEY, filters],
 queryFn: async () => {
 await new Promise(resolve => setTimeout(resolve, 500));
 
 let data = queryClient.getQueryData<Department[]>(QUERY_KEY);
 if (!data) {
 data = INITIAL_DEPARTMENTS;
 queryClient.setQueryData(QUERY_KEY, data);
 }

 let filtered = [...data];
 if (filters?.branch_id) {
 filtered = filtered.filter(d => d.branch_id === filters.branch_id);
 }
 if (filters?.warehouse_id) {
 filtered = filtered.filter(d => d.warehouse_id === filters.warehouse_id);
 }
 if (filters?.search) {
 const s = filters.search.toLowerCase();
 filtered = filtered.filter(d => 
 d.name_en.toLowerCase().includes(s) || 
 d.name_ar.includes(s) || 
 d.code.toLowerCase().includes(s)
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

export function useDepartment(id: string | null) {
 const queryClient = useQueryClient();

 return useQuery({
 queryKey: [...QUERY_KEY, id],
 queryFn: async () => {
 if (!id) return null;
 await new Promise(resolve => setTimeout(resolve, 300));
 
 const data = queryClient.getQueryData<Department[]>(QUERY_KEY) || INITIAL_DEPARTMENTS;
 return data.find(d => d.id === id) || null;
 },
 enabled: !!id
 });
}

export function useCreateDepartment() {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.departments');

 return useMutation({
 mutationFn: async (values: DepartmentFormValues) => {
 await new Promise(resolve => setTimeout(resolve, 800));
 
 const newDepartment: Department = {
 id: `D- ${Math.floor(Math.random() * 1000)}`,
 ...values,
 code: values.code.toUpperCase()
 };

 queryClient.setQueryData<Department[]>(QUERY_KEY, (old = INITIAL_DEPARTMENTS) => [...old, newDepartment]);
 return newDepartment;
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: QUERY_KEY });
 toast.success(t('created_success'));
 },
 onError: () => {
 toast.error(t('errors.create_failed'));
 }
 });
}

export function useUpdateDepartment(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.departments');

  return useSafeMutation({
    onConflict: options?.onConflict,
    meta: { suppressGlobalConflict: true },
    mutationFn: async ({ id, values }: { id: string; values: DepartmentFormValues }) => {
      await new Promise(resolve => setTimeout(resolve, 800));
    
      const data = queryClient.getQueryData<Department[]>(QUERY_KEY) || INITIAL_DEPARTMENTS;
      const department = data.find(d => d.id === id);
      if (!department) throw new Error('Department not found');

      if (values.version !== undefined && values.version < (department.version ?? 0)) {
        const error = new Error('CONFLICT') as any;
        error.response = { status: 409 };
        throw error;
      }

      // GUARD: Before deactivation - check for linked operations
      if (values.is_active === false && department.is_active === true) {
        // Mock check for linked kitchen requests or stocktake sessions
        // Mocking D-001 as linked
        if (id === 'D-001') {
          throw new Error('cannot_deactivate_department_in_use');
        }
      }

      const updatedDepartment = { 
        ...department, 
        ...values, 
        code: values.code.toUpperCase(),
        version: (department.version ?? 0) + 1
      };

      queryClient.setQueryData<Department[]>(QUERY_KEY, (old = INITIAL_DEPARTMENTS) => 
        old.map(d => d.id === id ? updatedDepartment : d)
      );

      return updatedDepartment;
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

export function useDeleteDepartment() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.departments');

  return useMutation({
    mutationFn: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // OPERATIONAL GUARD: Prevent deletion if department is in use
      // Mock: D-001 is in use
      if (id === 'D-001') {
        throw new Error('cannot_delete_department_in_use');
      }

      queryClient.setQueryData<Department[]>(QUERY_KEY, (old = INITIAL_DEPARTMENTS) => 
        old.filter(d => d.id !== id)
      );
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('deleted_success'));
    },
    onError: (error: Error) => {
      toast.error(t(`errors.${error.message}`) || t('errors.delete_failed'));
    }
  });
}
