'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
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
    currency: 'CNY',
    symbol: '¥',
    isLoading: true,
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const userId = user?.id;

    const { data, isLoading } = useQuery({
        queryKey: ['settings-currency', userId],
        queryFn: ({ signal }) =>
            apiClient.get('/settings/currency', CurrencyResponseSchema, { signal }),
        enabled: !!userId,
        staleTime: Infinity,
    });

    const value: CurrencyContextValue = {
        currency: data?.baseCurrency ?? 'CNY',
        symbol: data?.symbol ?? '¥',
        isLoading: !!userId ? isLoading : false,
    };

    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
    return useContext(CurrencyContext);
}
