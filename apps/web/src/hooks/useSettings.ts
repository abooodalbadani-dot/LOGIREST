'use client';
import { useAdminSettings } from '@/features/admin/hooks/useAdminSettings';

export function useSettings() {
  const { data: settings, ...rest } = useAdminSettings();
  return {
    settings,
    baseCurrency: settings?.baseCurrency,
    ...rest
  };
}
