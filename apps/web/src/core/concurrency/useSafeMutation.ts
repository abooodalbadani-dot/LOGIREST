'use client';

import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ConflictError } from '@/lib/api/ConflictError';
import { useTranslations } from 'next-intl';

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
  _isToastShown?: boolean;
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
  const t = useTranslations();

  const mutation = useMutation<TData, TError, TVariables, TContext>({
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

      const isToastShown = !!error._isToastShown;

      if (!isConflict && !isAbortError && !skipAutoToast && !isToastShown) {
        const rawMessage = error.message || error.response?.data?.message || 'errors.generic';
        let message = rawMessage;
        try {
          if (t.has(rawMessage)) {
            message = t(rawMessage);
          }
        } catch {
          // Fallback to rawMessage
        }
        toast.error(message);
      }

      // 2. Forward to original error handler for all other cases
      if (onError) {
        if (isToastShown) {
          const originalToastError = toast.error;
          try {
            // Temporarily disable toast.error to prevent duplicate toasts inside custom onError
            const writableToast = toast as typeof toast & { error: typeof toast.error };
            writableToast.error = () => "";
            (onError as (err: TError, vars: TVariables, ctx: TContext | undefined) => unknown)(error, variables, context);
          } catch (e) {
            console.error('[SafeMutation] Error in wrapped onError handler:', e);
          } finally {
            const writableToast = toast as typeof toast & { error: typeof toast.error };
            writableToast.error = originalToastError;
          }
        } else {
          (onError as (err: TError, vars: TVariables, ctx: TContext | undefined) => unknown)(error, variables, context);
        }
      }
    },
  });

  const originalMutate = mutation.mutate;
  const originalMutateAsync = mutation.mutateAsync;

  const wrappedMutate = (
    variables: TVariables,
    mutateOptions?: Parameters<typeof originalMutate>[1]
  ) => {
    let finalOptions = mutateOptions;
    if (mutateOptions?.onError) {
      const originalOnError = mutateOptions.onError;
      finalOptions = {
        ...mutateOptions,
        onError: (...args) => {
          const error = args[0] as AxiosLikeError;
          const isToastShown = !!(error && error._isToastShown);
          if (isToastShown) {
            const originalToastError = toast.error;
            try {
              const writableToast = toast as typeof toast & { error: typeof toast.error };
              writableToast.error = () => "";
              originalOnError(...args);
            } finally {
              const writableToast = toast as typeof toast & { error: typeof toast.error };
              writableToast.error = originalToastError;
            }
          } else {
            originalOnError(...args);
          }
        }
      };
    }
    originalMutate(variables, finalOptions);
  };

  const wrappedMutateAsync = (
    variables: TVariables,
    mutateOptions?: Parameters<typeof originalMutateAsync>[1]
  ) => {
    let finalOptions = mutateOptions;
    if (mutateOptions?.onError) {
      const originalOnError = mutateOptions.onError;
      finalOptions = {
        ...mutateOptions,
        onError: (...args) => {
          const error = args[0] as AxiosLikeError;
          const isToastShown = !!(error && error._isToastShown);
          if (isToastShown) {
            const originalToastError = toast.error;
            try {
              const writableToast = toast as typeof toast & { error: typeof toast.error };
              writableToast.error = () => "";
              originalOnError(...args);
            } finally {
              const writableToast = toast as typeof toast & { error: typeof toast.error };
              writableToast.error = originalToastError;
            }
          } else {
            originalOnError(...args);
          }
        }
      };
    }
    return originalMutateAsync(variables, finalOptions);
  };

  return {
    ...mutation,
    mutate: wrappedMutate,
    mutateAsync: wrappedMutateAsync
  };
}
