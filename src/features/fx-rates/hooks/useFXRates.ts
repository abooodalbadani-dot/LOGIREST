'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type FXRate, type FXRateFormValues, type Currency } from '@/types/master-data';

const QUERY_KEY = ['fx_rates'];
const CURRENCIES_QUERY_KEY = ['currencies'];

const INITIAL_FX_RATES: FXRate[] = [
  {
    id: 'FX-001',
    from_currency_id: 'CUR-USD',
    to_currency_id: 'CUR-SAR',
    rate: 3.750000,
    effective_date: '2024-01-01',
    is_active: true,
    created_at: '2024-01-01T08:00:00Z'
  },
  {
    id: 'FX-002',
    from_currency_id: 'CUR-USD',
    to_currency_id: 'CUR-SAR',
    rate: 3.751000,
    effective_date: '2024-02-01',
    is_active: true,
    created_at: '2024-02-01T09:00:00Z'
  },
  {
    id: 'FX-003',
    from_currency_id: 'CUR-EUR',
    to_currency_id: 'CUR-SAR',
    rate: 4.120000,
    effective_date: '2024-03-01',
    is_active: true,
    created_at: '2024-03-01T10:00:00Z'
  }
];

// Helper to normalize dates for comparison (YMD only)
const normalizeDate = (dateStr: string) => dateStr.split('T')[0];


export function useFXRates() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let data = queryClient.getQueryData<FXRate[]>(QUERY_KEY);
      if (!data) {
        data = INITIAL_FX_RATES;
        queryClient.setQueryData(QUERY_KEY, data);
      }

      // SORTING RULE: 1) effective_date DESC, 2) from_currency_id, 3) to_currency_id
      return [...data].sort((a, b) => {
        if (b.effective_date !== a.effective_date) {
          return b.effective_date.localeCompare(a.effective_date);
        }
        if (a.from_currency_id !== b.from_currency_id) {
          return a.from_currency_id.localeCompare(b.from_currency_id);
        }
        return a.to_currency_id.localeCompare(b.to_currency_id);
      });
    }
  });
}

export function useFXRate(id: string | null) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const data = queryClient.getQueryData<FXRate[]>(QUERY_KEY) || INITIAL_FX_RATES;
      return data.find(f => f.id === id) || null;
    },
    enabled: !!id
  });
}

export function useCreateFXRate() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.fx_rates');

  return useMutation({
    mutationFn: async (values: FXRateFormValues) => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const data = queryClient.getQueryData<FXRate[]>(QUERY_KEY) || INITIAL_FX_RATES;
      
      // UNIQUE CONSTRAINT: (from + to + date)
      const exists = data.some(f => 
        f.from_currency_id === values.from_currency_id && 
        f.to_currency_id === values.to_currency_id && 
        normalizeDate(f.effective_date) === normalizeDate(values.effective_date)
      );

      if (exists) {
        throw new Error('cannot_duplicate_rate');
      }

      const newRate: FXRate = {
        id: `FX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        ...values,
        created_at: new Date().toISOString()
      };

      queryClient.setQueryData<FXRate[]>(QUERY_KEY, (old = INITIAL_FX_RATES) => [...old, newRate]);

      return newRate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('save_success'));
    },
    onError: (error: any) => {
      const msg = error.message;
      toast.error(t(msg) || t('errors.update_failed'));
    }
  });
}


export function useUpdateFXRate() {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.fx_rates');

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: FXRateFormValues }) => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const data = queryClient.getQueryData<FXRate[]>(QUERY_KEY) || INITIAL_FX_RATES;
      const rate = data.find(f => f.id === id);
      if (!rate) throw new Error('Rate not found');

      // DEACTIVATION / EDIT GUARD: Check GRN cache (Simulated usage)
      // Rule: If rate used in POSTED document, block deactivation or key field changes
      const isUsedInPostedDoc = id === 'FX-001'; // Mocking FX-001 as used in a posted GRN

      if (isUsedInPostedDoc) {
         if (values.is_active === false && rate.is_active === true) {
            throw new Error('cannot_deactivate_rate_in_use');
         }
         
         // If key fields changed while used in posted doc
         if (
            values.from_currency_id !== rate.from_currency_id || 
            values.to_currency_id !== rate.to_currency_id || 
            normalizeDate(values.effective_date) !== normalizeDate(rate.effective_date) ||
            values.rate !== rate.rate
         ) {
            throw new Error('cannot_edit_rate_in_use');
         }
      }

      // UNIQUE CONSTRAINT if key fields changed and not used in posted doc
      if (
        values.from_currency_id !== rate.from_currency_id || 
        values.to_currency_id !== rate.to_currency_id || 
        normalizeDate(values.effective_date) !== normalizeDate(rate.effective_date)
      ) {
        const exists = data.some(f => 
          f.id !== id &&
          f.from_currency_id === values.from_currency_id && 
          f.to_currency_id === values.to_currency_id && 
          normalizeDate(f.effective_date) === normalizeDate(values.effective_date)
        );
        if (exists) throw new Error('cannot_duplicate_rate');
      }

      const updatedRate: FXRate = { ...rate, ...values };

      queryClient.setQueryData<FXRate[]>(QUERY_KEY, (old = INITIAL_FX_RATES) => 
        old.map(f => f.id === id ? updatedRate : f)
      );

      return updatedRate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.setQueryData([...QUERY_KEY, data.id], data);
      toast.success(t('update_success'));
    },
    onError: (error: any) => {
      const msg = error.message;
      toast.error(t(msg) || t('errors.update_failed'));
    }
  });
}
