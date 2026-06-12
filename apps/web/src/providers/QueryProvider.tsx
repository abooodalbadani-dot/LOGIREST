'use client';
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query';
import { useState } from 'react';
import { ConflictError } from '@/lib/api/ConflictError';
import { conflictBus } from '@/lib/api/conflict-bus';

/**
 * Handles global authentication errors from React Query's cache.
 *
 * CRITICAL RULE — 401 vs 403:
 *   - 401 Unauthorized → the session is invalid/expired → trigger logout flow.
 *   - 403 Forbidden    → the user IS authenticated but lacks the required
 *     permission for that specific resource. This is a normal authorization
 *     denial and must NEVER log the user out. The individual query/mutation
 *     error handler (or a toast) is responsible for surfacing it.
 */
const handleGlobalAuthError = (error: unknown): boolean => {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;

    // Only treat true authentication failures as session-expired events.
    const isSessionExpired =
      err.code === 'UNAUTHORIZED' ||
      err.code === 'SESSION_EXPIRED' ||
      err.status === 401 ||
      err.statusCode === 401;

    if (isSessionExpired) {
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
