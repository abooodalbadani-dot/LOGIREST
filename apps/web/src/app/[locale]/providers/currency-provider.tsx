'use client';

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { apiClient } from '@/lib/api/client';
import { z } from 'zod';
import { useAuth } from '@/providers/AuthProvider';

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
 const { user } = useAuth();
 const userId = user?.id;
 const [value, setValue] = useState<CurrencyContextValue>({
  currency: 'SAR',
  symbol: '\u{FDFC}',
  isLoading: true,
 });
 const lastFetchedUserId = useRef<string | null | undefined>(undefined);

 useEffect(() => {
  if (userId === lastFetchedUserId.current) return;
  lastFetchedUserId.current = userId;

  if (!userId) {
   setValue({ currency: 'SAR', symbol: '\u{FDFC}', isLoading: false });
   return;
  }

  let cancelled = false;
  setValue((prev) => ({ ...prev, isLoading: true }));

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
 }, [userId]);

 return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
 return useContext(CurrencyContext);
}
