'use client';
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query';
import { useState } from 'react';
import { ConflictError } from '@/lib/api/ConflictError';
import { conflictBus } from '@/lib/api/conflict-bus';

const handleGlobalAuthError = (error: unknown) => {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const isAuthErr =
      err.code === 'UNAUTHORIZED' ||
      err.code === 'SESSION_EXPIRED' ||
      err.code === 'FORBIDDEN' ||
      err.status === 401 ||
      err.status === 403 ||
      err.statusCode === 401 ||
      err.statusCode === 403;

    if (isAuthErr) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
      return true;
    }
  }
  return false;
};

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        handleGlobalAuthError(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, variables, _context, mutation) => {
        if (handleGlobalAuthError(error)) {
          return;
        }

        if (error instanceof ConflictError) {
          // If the mutation is marked to suppress global conflict dialogs (e.g. handled locally)
          if (mutation.options.meta?.suppressGlobalConflict) {
            return;
          }

          // Attach original version from variables for UX comparison
          const vars = variables as Record<string, unknown>;
          if (vars && typeof vars === 'object' && 'version' in vars) {
            (error as ConflictError & { originalVersion?: unknown }).originalVersion = vars.version;
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
