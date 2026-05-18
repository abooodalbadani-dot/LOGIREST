'use client';

import { useTransfer } from '@/features/operations/hooks/useTransfer';
import { TransferDisputeClient } from './TransferDisputeClient';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { QueryBoundary } from '@/core/query/QueryBoundary';

export function TransferDisputePageClient({ id, locale }: { id: string, locale: 'ar' | 'en' }) {
  const { data: transfer, isLoading, error } = useTransfer(id);

  if (isLoading) return <PageSkeleton variant="detail" />;

  return (
    <QueryBoundary isLoading={isLoading} error={error}>
      {transfer && <TransferDisputeClient transfer={transfer} locale={locale} />}
    </QueryBoundary>
  );
}
