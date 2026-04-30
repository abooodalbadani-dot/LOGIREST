'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type Barcode, type BarcodeFormValues } from '@/types/master-data';

const QUERY_KEY = ['barcodes'];

const INITIAL_BARCODES: Barcode[] = [
  {
    id: 'BAR-001',
    item_id: 'ITEM-001',
    uom_id: 'UOM-001',
    code: '6281000000012',
    default_qty: 1,
    is_active: true
  },
  {
    id: 'BAR-002',
    item_id: 'ITEM-002',
    uom_id: 'UOM-002',
    code: '6281000000029',
    default_qty: 1,
    is_active: true
  }
];

export function useBarcodes(filters?: { item_id?: string; search?: string }) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let data = queryClient.getQueryData<Barcode[]>(QUERY_KEY);
      if (!data) {
        data = INITIAL_BARCODES;
        queryClient.setQueryData(QUERY_KEY, data);
      }

      let filtered = [...data];
      if (filters?.item_id) {
        filtered = filtered.filter(b => b.item_id === filters.item_id);
      }
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        filtered = filtered.filter(b => 
          b.code.toLowerCase().includes(s)
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

export function useBarcode(id: string | null) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const data = queryClient.getQueryData<Barcode[]>(QUERY_KEY) || INITIAL_BARCODES;
      return data.find(b => b.id === id) || null;
    },
    enabled: !!id
  });
}

export function useCreateBarcode() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.barcodes');

  return useMutation({
    mutationFn: async (values: BarcodeFormValues) => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const data = queryClient.getQueryData<Barcode[]>(QUERY_KEY) || INITIAL_BARCODES;
      
      // GUARD: Uniqueness
      const exists = data.some(b => b.code.toLowerCase() === values.code.toLowerCase());
      if (exists) {
        throw new Error('code_exists');
      }

      const newBarcode: Barcode = {
        id: `BAR-${Math.floor(Math.random() * 1000)}`,
        ...values
      };

      queryClient.setQueryData<Barcode[]>(QUERY_KEY, (old = INITIAL_BARCODES) => [...old, newBarcode]);
      return newBarcode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('created_success'));
    },
    onError: (error: any) => {
      toast.error(t(`errors.${error.message}`) || t('errors.update_failed'));
    }
  });
}

export function useUpdateBarcode() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.barcodes');

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: BarcodeFormValues }) => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const data = queryClient.getQueryData<Barcode[]>(QUERY_KEY) || INITIAL_BARCODES;
      const barcode = data.find(b => b.id === id);
      if (!barcode) throw new Error('Barcode not found');

      // GUARD: Uniqueness if code changed
      if (values.code.toLowerCase() !== barcode.code.toLowerCase()) {
        const exists = data.some(b => b.id !== id && b.code.toLowerCase() === values.code.toLowerCase());
        if (exists) {
          throw new Error('code_exists');
        }
      }

      // GUARD: Deactivation
      if (values.is_active === false && barcode.is_active === true) {
        // Mock transaction check: BAR-001 is used in transactions
        if (id === 'BAR-001') {
          throw new Error('cannot_deactivate_in_use');
        }
      }

      const updatedBarcode = { 
        ...barcode, 
        ...values
      };

      queryClient.setQueryData<Barcode[]>(QUERY_KEY, (old = INITIAL_BARCODES) => 
        old.map(b => b.id === id ? updatedBarcode : b)
      );

      return updatedBarcode;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.setQueryData([...QUERY_KEY, data.id], data);
      toast.success(t('updated_success'));
    },
    onError: (error: any) => {
      toast.error(t(`errors.${error.message}`) || t('errors.update_failed'));
    }
  });
}
