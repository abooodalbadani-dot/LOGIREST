'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type Warehouse, type WarehouseFormValues, type Department } from '@/types/master-data';

const QUERY_KEY = ['warehouses'];

const INITIAL_WAREHOUSES: Warehouse[] = [
 { 
 id: 'W-001', 
 branch_id: 'BR-001', 
 code: 'MAIN-WH', 
 name_en: 'Main Warehouse', 
 name_ar: 'المستودع الرئيسي', 
 type: 'MAIN', 
 is_active: true 
 },
 { 
 id: 'W-002', 
 branch_id: 'BR-002', 
 code: 'COLD-WH', 
 name_en: 'Cold Storage', 
 name_ar: 'مستودع التبريد', 
 type: 'COLD', 
 is_active: true 
 }
];

export function useWarehouses(filters?: { branch_id?: string; search?: string }) {
 const queryClient = useQueryClient();

 return useQuery({
 queryKey: [...QUERY_KEY, filters],
 queryFn: async () => {
 // Simulate network delay
 await new Promise(resolve => setTimeout(resolve, 500));
 
 let data = queryClient.getQueryData<Warehouse[]>(QUERY_KEY);
 if (!data) {
 data = INITIAL_WAREHOUSES;
 queryClient.setQueryData(QUERY_KEY, data);
 }

 let filtered = [...data];
 if (filters?.branch_id) {
 filtered = filtered.filter(w => w.branch_id === filters.branch_id);
 }
 if (filters?.search) {
 const s = filters.search.toLowerCase();
 filtered = filtered.filter(w => 
 w.name_en.toLowerCase().includes(s) || 
 w.name_ar.includes(s) || 
 w.code.toLowerCase().includes(s)
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

export function useWarehouse(id: string | null) {
 const queryClient = useQueryClient();

 return useQuery({
 queryKey: [...QUERY_KEY, id],
 queryFn: async () => {
 if (!id) return null;
 await new Promise(resolve => setTimeout(resolve, 300));
 
 const data = queryClient.getQueryData<Warehouse[]>(QUERY_KEY) || INITIAL_WAREHOUSES;
 return data.find(w => w.id === id) || null;
 },
 enabled: !!id
 });
}

export function useCreateWarehouse() {
 const queryClient = useQueryClient();
 const t = useTranslations('master_data.warehouses');

 return useMutation({
 mutationFn: async (values: WarehouseFormValues) => {
 await new Promise(resolve => setTimeout(resolve, 800));
 
 const newWarehouse: Warehouse = {
 id: `W- ${Math.floor(Math.random() * 1000)}`,
 ...values,
 code: values.code.toUpperCase()
 };

 queryClient.setQueryData<Warehouse[]>(QUERY_KEY, (old = INITIAL_WAREHOUSES) => [...old, newWarehouse]);
 return newWarehouse;
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

export function useUpdateWarehouse(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.warehouses');

  return useSafeMutation({
    onConflict: options?.onConflict,
    meta: { suppressGlobalConflict: true },
    mutationFn: async ({ id, values }: { id: string; values: WarehouseFormValues }) => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const data = queryClient.getQueryData<Warehouse[]>(QUERY_KEY) || INITIAL_WAREHOUSES;
      const warehouse = data.find(w => w.id === id);
      if (!warehouse) throw new Error('Warehouse not found');

      if (values.version !== undefined && values.version < (warehouse.version ?? 0)) {
        const error = new Error('CONFLICT') as any;
        error.response = { status: 409 };
        throw error;
      }

      // GUARD 1: Before deactivation - check children
      if (values.is_active === false && warehouse.is_active === true) {
        const departments = queryClient.getQueryData<Department[]>(['departments']) || [];
        const hasDepartments = departments.some(d => d.warehouse_id === id && d.is_active);
        if (hasDepartments) {
          throw new Error('cannot_deactivate_warehouse_in_use');
        }
      
        // Mock inventory check: W-001 has stock
        if (id === 'W-001') {
          throw new Error('cannot_deactivate_warehouse_in_use');
        }
      }

      // GUARD 2: Before changing branch - check children
      if (values.branch_id !== warehouse.branch_id) {
        const departments = queryClient.getQueryData<Department[]>(['departments']) || [];
        const hasDepartments = departments.some(d => d.warehouse_id === id);
        if (hasDepartments) {
          throw new Error('cannot_change_branch_with_departments');
        }
      }

      const updatedWarehouse = { 
        ...warehouse, 
        ...values, 
        code: values.code.toUpperCase(),
        version: (warehouse.version ?? 0) + 1
      };

      queryClient.setQueryData<Warehouse[]>(QUERY_KEY, (old = INITIAL_WAREHOUSES) => 
        old.map(w => w.id === id ? updatedWarehouse : w)
      );

      return updatedWarehouse;
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

export function useDeleteWarehouse() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.warehouses');

  return useMutation({
    mutationFn: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const data = queryClient.getQueryData<Warehouse[]>(QUERY_KEY) || INITIAL_WAREHOUSES;
      
      // OPERATIONAL GUARD: Prevent deletion if warehouse has stock (Mock: W-001 has stock)
      if (id === 'W-001') {
        throw new Error('cannot_delete_warehouse_in_use');
      }

      // Check for active departments
      const departments = queryClient.getQueryData<Department[]>(['departments']) || [];
      if (departments.some(d => d.warehouse_id === id)) {
        throw new Error('cannot_delete_warehouse_in_use');
      }

      queryClient.setQueryData<Warehouse[]>(QUERY_KEY, (old = INITIAL_WAREHOUSES) => 
        old.filter(w => w.id !== id)
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
