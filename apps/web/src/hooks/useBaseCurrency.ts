'use client';

import { useSettings } from './useSettings';

export function useBaseCurrency() {
  const { settings, isLoading } = useSettings();
  const currency = settings?.base_currency || process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || 'SAR';
  return { currency, isLoading };
}
