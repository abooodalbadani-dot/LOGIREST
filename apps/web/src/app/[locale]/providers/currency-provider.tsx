'use client';

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { apiClient } from '@/lib/api/client';
import { getTokenCookie } from '@/lib/api/cookies';
import { z } from 'zod';

const CurrencyResponseSchema = z.object({
  baseCurrency: z.string(),
  symbol: z.string(),
});

interface CurrencyContextValue {
  currency: string;
  symbol: string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'SAR',
  symbol: '\u{FDFC}',
  isLoading: true,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<CurrencyContextValue>({
    currency: 'SAR',
    symbol: '\u{FDFC}',
    isLoading: true,
  });
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    if (!getTokenCookie()) {
      setValue({ currency: 'SAR', symbol: '\u{FDFC}', isLoading: false });
      return;
    }

    let cancelled = false;

    apiClient
      .get('/settings/currency', CurrencyResponseSchema)
      .then((data) => {
        if (!cancelled) {
          setValue({ currency: data.baseCurrency, symbol: data.symbol, isLoading: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setValue((prev) => ({ ...prev, isLoading: false }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}
