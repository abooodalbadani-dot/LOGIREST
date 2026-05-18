'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { type FXRate, type FXRateFormValues } from '@/types/master-data';
import { useSafeMutation } from '@/core/concurrency/useSafeMutation';

const QUERY_KEY = ['fx_rates'];

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
    queryFn: async ({ signal }) => {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 500);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('AbortError'));
        });
      });

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
    queryFn: async ({ signal }) => {
      if (!id) return null;
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 300);
        signal?.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('AbortError'));
        });
      });

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
    mutationFn: async ({ values, signal }: { values: FXRateFormValues; signal?: AbortSignal }) => {
      const abortPromise = new Promise((_, reject) => {
        if (signal?.aborted) return reject(new Error('AbortError'));
        signal?.addEventListener('abort', () => reject(new Error('AbortError')), { once: true });
      });

      const workPromise = (async () => {
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
      })();

      return Promise.race([workPromise, abortPromise]) as Promise<FXRate>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success(t('save_success'));
    },
    onError: (error: Error) => {
      if (error.message === 'AbortError') return;
      const msg = error.message;
      toast.error(t(msg) || t('errors.update_failed'));
    }
  });
}


export function useUpdateFXRate(options?: { onConflict?: () => void }) {
  const queryClient = useQueryClient();
  const t = useTranslations('master_data.fx_rates');

  return useSafeMutation({
    onConflict: options?.onConflict,
    mutationFn: async ({ id, values, signal }: { id: string; values: FXRateFormValues; signal?: AbortSignal }) => {
      const abortPromise = new Promise((_, reject) => {
        if (signal?.aborted) return reject(new Error('AbortError'));
        signal?.addEventListener('abort', () => reject(new Error('AbortError')), { once: true });
      });

      const workPromise = (async () => {
        await new Promise(resolve => setTimeout(resolve, 800));

        const data = queryClient.getQueryData<FXRate[]>(QUERY_KEY) || INITIAL_FX_RATES;
        const rate = data.find(f => f.id === id);
        if (!rate) throw new Error('Rate not found');

        if (values.version !== undefined && values.version < (rate.version ?? 0)) {
          const error = new Error('CONFLICT');
          Object.assign(error, { response: { status: 409 } });
          throw error;
        }

        // DEACTIVATION / EDIT GUARD: Check GRN cache (Simulated usage)
        const isUsedInPostedDoc = id === 'FX-001';

        if (isUsedInPostedDoc) {
          if (values.is_active === false && rate.is_active === true) {
            throw new Error('cannot_deactivate_rate_in_use');
          }

          if (
            values.from_currency_id !== rate.from_currency_id ||
            values.to_currency_id !== rate.to_currency_id ||
            normalizeDate(values.effective_date) !== normalizeDate(rate.effective_date) ||
            values.rate !== rate.rate
          ) {
            throw new Error('cannot_edit_rate_in_use');
          }
        }

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

        const updatedRate: FXRate = { ...rate, ...values, version: (rate.version ?? 0) + 1 };

        queryClient.setQueryData<FXRate[]>(QUERY_KEY, (old = INITIAL_FX_RATES) =>
          old.map(f => f.id === id ? updatedRate : f)
        );

        return updatedRate;
      })();

      return Promise.race([workPromise, abortPromise]) as Promise<FXRate>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.setQueryData([...QUERY_KEY, data.id], data);
      toast.success(t('update_success'));
    },
    onError: (error: Error) => {
      if (error.message === 'AbortError') return;
      const msg = error.message;
      toast.error(t(msg) || t('errors.update_failed'));
    }
  });
}
