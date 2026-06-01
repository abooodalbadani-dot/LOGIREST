'use client';

import { useCurrency } from '@/app/[locale]/providers/currency-provider';

export function useBaseCurrency() {
  const { currency, isLoading } = useCurrency();
  return { currency, isLoading };
}
