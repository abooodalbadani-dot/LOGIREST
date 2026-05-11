'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type Supplier, type SupplierFormValues } from '@/types/master-data';

const QUERY_KEY = ['suppliers'];

const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'SUP-001',
    code: 'ALMARAI',
    name_en: 'Almarai Company',
    name_ar: 'شركة المراعي',
    currency_id: 'SAR',
    payment_terms: 'NET_30',
    is_active: true,
  },
  {
    id: 'SUP-002',
    code: 'NESTLE',
    name_en: 'Nestle Saudi Arabia',
    name_ar: 'نستله السعودية',
    currency_id: 'SAR',
    payment_terms: 'NET_15',
    is_active: true,
  },
  {
    id: 'SUP-003',
    code: 'UNILEVER',
    name_en: 'Unilever Gulf',
    name_ar: 'يونيليفر الخليج',
    currency_id: 'AED',
    payment_terms: 'CASH',
    is_active: false,
  }
];

export function useSuppliers(filters?: { search?: string }) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    queryFn: async ({ signal }) => {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 500);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });
      
      let data = queryClient.getQueryData<Supplier[]>(QUERY_KEY);
      if (!data) {
        data = INITIAL_SUPPLIERS;
        queryClient.setQueryData(QUERY_KEY, data);
      }

      let filtered = [...data];
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        filtered = filtered.filter(sup => 
          sup.name_en.toLowerCase().includes(s) || 
          sup.name_ar.includes(s) || 
          sup.code.toLowerCase().includes(s)
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
    },
    staleTime: 60_000,
  });
}

export function useSupplier(id: string | null) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: async ({ signal }) => {
      if (!id) return null;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 300);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });
      
      const data = queryClient.getQueryData<Supplier[]>(QUERY_KEY) || INITIAL_SUPPLIERS;
      return data.find(s => s.id === id) || null;
    },
    enabled: !!id,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.suppliers');

  return useMutation({
    mutationFn: async (variables: SupplierFormValues & { signal?: AbortSignal }) => {
      const { signal, ...values } = variables;
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 800);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });
      
      const newSupplier: Supplier = {
        id: `SUP-${Math.floor(Math.random() * 1000)}`,
        ...values,
        code: values.code.toUpperCase()
      };

      queryClient.setQueryData<Supplier[]>(QUERY_KEY, (old = INITIAL_SUPPLIERS) => [...old, newSupplier]);
      return newSupplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('created_success'));
    },
    onError: (error: unknown) => {
      if (error instanceof Error && error.message === 'Aborted') return;
      toast.error(t('errors.create_failed'));
    }
  });
}

export function useUpdateSupplier(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.suppliers');

  return useSafeMutation({
    onConflict: options?.onConflict,
    meta: { suppressGlobalConflict: true },
    mutationFn: async ({ id, values, signal }: { id: string; values: SupplierFormValues; signal?: AbortSignal }) => {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 800);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });

      const data = queryClient.getQueryData<Supplier[]>(QUERY_KEY) || INITIAL_SUPPLIERS;
      const supplier = data.find(s => s.id === id);
      if (!supplier) throw new Error('Supplier not found');

      if (values.version !== undefined && values.version < (supplier.version ?? 0)) {
        const error = new Error('CONFLICT') as Error & { response?: { status: number } };
        error.response = { status: 409 };
        throw error;
      }

      // OPERATIONAL GUARD: Prevent deactivation if linked to active POs
      // MOCK: SUP-001 has active POs
      if (id === 'SUP-001' && values.is_active === false && supplier.is_active === true) {
        throw new Error('GUARD_ACTIVE_POS');
      }

      const updatedSupplier = { 
        ...supplier, 
        ...values, 
        code: values.code.toUpperCase(),
        version: (supplier.version ?? 0) + 1
      };

      queryClient.setQueryData<Supplier[]>(QUERY_KEY, (old = INITIAL_SUPPLIERS) => 
        old.map(s => s.id === id ? updatedSupplier : s)
      );

      return updatedSupplier;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.setQueryData([...QUERY_KEY, data.id], data);
      toast.success(t('updated_success'));
    },
    onError: (error: Error) => {
      if (error.message === 'Aborted') return;
      if (error.message === 'GUARD_ACTIVE_POS') {
        toast.error(t('errors.deactivate_linked_pos'));
      } else {
        toast.error(t('errors.update_failed'));
      }
    }
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.suppliers');

  return useMutation({
    mutationFn: async ({ id, signal }: { id: string; signal?: AbortSignal }) => {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 800);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Aborted'));
        });
      });
      
      const data = queryClient.getQueryData<Supplier[]>(QUERY_KEY) || INITIAL_SUPPLIERS;
      
      // OPERATIONAL GUARD: Prevent deletion if active POs exist
      if (id === 'SUP-001') {
        throw new Error('GUARD_ACTIVE_POS');
      }

      queryClient.setQueryData<Supplier[]>(QUERY_KEY, (old = INITIAL_SUPPLIERS) => 
        old.filter(s => s.id !== id)
      );
      
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('deleted_success'));
    },
    onError: (error: Error) => {
      if (error.message === 'Aborted') return;
      if (error.message === 'GUARD_ACTIVE_POS') {
        toast.error(t('errors.deactivate_linked_pos'));
      } else {
        toast.error(t('errors.delete_failed'));
      }
    }
  });
}

