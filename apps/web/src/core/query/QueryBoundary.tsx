'use client';

import { ReactNode } from 'react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

interface QueryBoundaryProps {
  isLoading: boolean;
  error: unknown;
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
}

export function QueryBoundary({
  isLoading,
  error,
  children,
  loadingFallback,
  errorFallback,
}: QueryBoundaryProps) {
  if (isLoading) {
    return loadingFallback || <LoadingSkeleton />;
  }

  if (error) {
    return errorFallback || <ErrorState onRetry={() => window.location.reload()} />;
  }

  return <>{children}</>;
}
