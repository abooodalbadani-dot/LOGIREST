'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type Category, type CategoryFormValues } from '@/types/master-data';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';

const QUERY_KEY = ['categories'];

const INITIAL_CATEGORIES: Category[] = [
 { id: 'CAT-001', name_en: 'Food & Beverage', name_ar: 'الأغذية والمشروبات' },
 { id: 'CAT-002', name_en: 'Kitchen Equipment', name_ar: 'معدات المطبخ' },
 { id: 'CAT-003', name_en: 'Cleaning Supplies', name_ar: 'مواد التنظيف' },
 { id: 'CAT-004', name_en: 'Packaging Materials', name_ar: 'مواد التغليف' },
];

export function useCategories(filters?: { search?: string }) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    queryFn: async ({ signal }) => {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 400);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('AbortError'));
        });
      });
      
      let data = queryClient.getQueryData<Category[]>(QUERY_KEY);
      if (!data) {
        data = INITIAL_CATEGORIES;
        queryClient.setQueryData(QUERY_KEY, data);
      }

      let filtered = [...data];
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        filtered = filtered.filter(c => 
          c.name_en.toLowerCase().includes(s) || 
          c.name_ar.includes(s)
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

export function useCategory(id: string | null) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: async ({ signal }) => {
      if (!id) return null;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 200);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('AbortError'));
        });
      });
      
      const data = queryClient.getQueryData<Category[]>(QUERY_KEY) || INITIAL_CATEGORIES;
      return data.find(c => c.id === id) || null;
    },
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.categories');

  return useMutation({
    mutationFn: async ({ values, signal }: { values: CategoryFormValues; signal?: AbortSignal }) => {
      const abortPromise = new Promise((_, reject) => {
        if (signal?.aborted) return reject(new Error('AbortError'));
        signal?.addEventListener('abort', () => reject(new Error('AbortError')), { once: true });
      });

      const workPromise = (async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const newCategory: Category = {
          id: `CAT- ${Math.floor(Math.random() * 1000)}`,
          ...values
        };

        queryClient.setQueryData<Category[]>(QUERY_KEY, (old = INITIAL_CATEGORIES) => [...old, newCategory]);
        return newCategory;
      })();

      return Promise.race([workPromise, abortPromise]) as Promise<Category>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('created_success'));
    },
    onError: (error: Error) => {
      if (error.message === 'AbortError') return;
      toast.error(t('errors.create_failed'));
    }
  });
}

export function useUpdateCategory(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.categories');

  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: async ({ id, values, signal }: { id: string; values: CategoryFormValues; signal?: AbortSignal }) => {
      const abortPromise = new Promise((_, reject) => {
        if (signal?.aborted) return reject(new Error('AbortError'));
        signal?.addEventListener('abort', () => reject(new Error('AbortError')), { once: true });
      });

      const workPromise = (async () => {
        await new Promise(resolve => setTimeout(resolve, 600));

        const data = queryClient.getQueryData<Category[]>(QUERY_KEY) || INITIAL_CATEGORIES;
        const category = data.find(c => c.id === id);
        if (!category) throw new Error('Category not found');

        if (values.version !== undefined && values.version < (category.version ?? 0)) {
          const error = new Error('CONFLICT');
          Object.assign(error, { response: { status: 409 } });
          throw error;
        }

        const updatedCategory = { ...category, ...values, version: (category.version ?? 0) + 1 };

        queryClient.setQueryData<Category[]>(QUERY_KEY, (old = INITIAL_CATEGORIES) => 
          old.map(c => c.id === id ? updatedCategory : c)
        );

        return updatedCategory;
      })();

      return Promise.race([workPromise, abortPromise]) as Promise<Category>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.setQueryData([...QUERY_KEY, data.id], data);
      toast.success(t('updated_success'));
    },
    onError: (error: Error) => {
      if (error.message === 'AbortError') return;
      toast.error(t('errors.update_failed'));
    }
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.categories');

  return useMutation({
    mutationFn: async ({ id, signal }: { id: string; signal?: AbortSignal }) => {
      const abortPromise = new Promise((_, reject) => {
        if (signal?.aborted) return reject(new Error('AbortError'));
        signal?.addEventListener('abort', () => reject(new Error('AbortError')), { once: true });
      });

      const workPromise = (async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        // OPERATIONAL GUARD: Prevent deletion if linked to items
        // MOCK: CAT-001 has linked items
        if (id === 'CAT-001') {
          throw new Error('GUARD_LINKED_ITEMS');
        }

        queryClient.setQueryData<Category[]>(QUERY_KEY, (old = INITIAL_CATEGORIES) => 
          old.filter(c => c.id !== id)
        );
        
        return id;
      })();

      return Promise.race([workPromise, abortPromise]) as Promise<string>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('deleted_success'));
    },
    onError: (error: Error) => {
      if (error.message === 'AbortError') return;
      if (error.message === 'GUARD_LINKED_ITEMS') {
        toast.error(t('errors.delete_linked_items'));
      } else {
        toast.error(t('errors.delete_failed'));
      }
    }
  });
}
