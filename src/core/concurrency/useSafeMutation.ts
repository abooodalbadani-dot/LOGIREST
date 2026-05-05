'use client';

import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';

/**
 * AxiosLikeError defines the minimal structure we expect for API errors
 * to detect HTTP 409 Conflict status.
 */
export interface AxiosLikeError {
  response?: {
    status: number;
  };
  message?: string;
}

/**
 * SafeMutationOptions extends standard UseMutationOptions with a specific
 * handler for optimistic locking conflicts.
 */
export interface SafeMutationOptions<TData, TError, TVariables, TContext>
  extends UseMutationOptions<TData, TError, TVariables, TContext> {
  onConflict?: () => void;
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
  const { onConflict, onError, ...rest } = options;

  return useMutation({
    ...rest,
    onError: (...args) => {
      const error = args[0] as AxiosLikeError;
      // 1. Check if this is an Optimistic Locking Conflict (HTTP 409)
      if (error.response?.status === 409) {
        if (onConflict) {
          onConflict();
          // If onConflict is handled, we stop propagation here to avoid
          // showing generic error toasts for a known concurrency issue.
          return;
        }
      }

      // 2. Forward to original error handler for all other cases
      // (or if 409 was received but no onConflict handler was provided)
      (onError as any)?.(...args);
    },
  });
}
