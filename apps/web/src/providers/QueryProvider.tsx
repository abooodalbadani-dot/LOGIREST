'use client';
import { QueryClient, QueryClientProvider, MutationCache } from '@tanstack/react-query';
import { useState } from 'react';
import { ConflictError } from '@/lib/api/ConflictError';
import { conflictBus } from '@/lib/api/conflict-bus';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, variables, _context, mutation) => {
        if (error instanceof ConflictError) {
          // If the mutation is marked to suppress global conflict dialogs (e.g. handled locally)
          if (mutation.options.meta?.suppressGlobalConflict) {
            return;
          }

          // Attach original version from variables for UX comparison
          if (variables && typeof variables === 'object' && 'version' in variables) {
            (error as any).originalVersion = (variables as any).version;
          }
          conflictBus.emit({ error, mutation, variables });
        }
      },
    }),
    defaultOptions: { 
      queries: { 
        staleTime: 60_000, 
        gcTime: 5 * 60_000, 
        retry: 1 
      } 
    },
  }));

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
