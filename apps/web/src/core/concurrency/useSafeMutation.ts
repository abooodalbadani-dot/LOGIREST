'use client';

import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ConflictError } from '@/lib/api/ConflictError';

/**
 * AxiosLikeError defines the minimal structure we expect for API errors
 * to detect HTTP 409 Conflict status.
 */
export interface AxiosLikeError {
  response?: {
    status: number;
    data?: {
      message?: string;
    };
  };
  name?: string;
  code?: string;
  message?: string;
}

/**
 * SafeMutationOptions extends standard UseMutationOptions with a specific
 * handler for optimistic locking conflicts.
 */
export interface SafeMutationOptions<TData, TError, TVariables, TContext>
  extends UseMutationOptions<TData, TError, TVariables, TContext> {
  onConflict?: () => void;
  skipAutoToast?: boolean;
}

/**
 * useSafeMutation - Enterprise-grade wrapper for React Query's useMutation.
 * Automatically intercepts HTTP 409 Conflict errors to handle optimistic 
 * locking scenarios without duplicating logic across feature hooks.
 * 
 * @template TData - The type of data returned by the mutation
 * @template TError - The type of error returned by the mutation (defaults to AxiosLikeError)
 * @template TVariables - The type of variables passed to the mutationFn
 * @template TContext - The type of context for the mutation
 */
export function useSafeMutation<
  TData = unknown,
  TError extends AxiosLikeError = AxiosLikeError,
  TVariables = void,
  TContext = unknown
>(
  options: SafeMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const { onConflict, onError, skipAutoToast, ...rest } = options;

  return useMutation<TData, TError, TVariables, TContext>({
    ...rest,
    onError: (error, variables, context) => {
      // 1. Check if this is an Optimistic Locking Conflict (HTTP 409 or ConflictError)
      const isConflict = 
        error.response?.status === 409 || 
        error instanceof ConflictError || 
        error.name === 'ConflictError' ||
        error.code === 'VERSION_CONFLICT';

      if (isConflict) {
        if (onConflict) {
          onConflict();
          return;
        }
      }

      // Automatically surface error message via toast if it's not a conflict or aborted
      const isAbortError = 
        error.name === 'AbortError' || 
        error.message === 'Aborted' || 
        error.message === 'AbortError';

      if (!isConflict && !isAbortError && !skipAutoToast) {
        const message = error.message || error.response?.data?.message || 'Operation failed / فشلت العملية';
        toast.error(message);
      }

      // 2. Forward to original error handler for all other cases
      if (onError) {
        (onError as (err: TError, vars: TVariables, ctx: TContext | undefined) => unknown)(error, variables, context);
      }
    },
  });
}
