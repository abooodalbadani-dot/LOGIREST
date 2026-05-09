'use client';

import { useTranslations } from 'next-intl';
import { useAdjustment } from '@/features/operations/hooks/useAdjustment';
import { useAuth } from '@/providers/AuthProvider';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ADJUSTMENT_STATUS } from '@/contracts/statuses';
import { isLocked } from '@/domain/status-guards';
import { AdjustmentForm } from './AdjustmentForm';

import { PageSkeleton } from '@/components/shared/PageSkeleton';

export function AdjustmentDetailClient({ id }: { id: string }) {
  const tCommon = useTranslations('common');
  const { user } = useAuth();
  const conflict = useConflictHandler('adjustment', id);
  
  const isNew = id === 'new';
  const { data: adjustment, isLoading } = useAdjustment(isNew ? null : id);

  if (isLoading) return <PageSkeleton variant="detail" />;

  const status = adjustment?.status ?? ADJUSTMENT_STATUS.DRAFT;
  const locked = isLocked('ADJUSTMENT', status);



  return (
    <>
      <AdjustmentForm 
        document={adjustment}
        id={id}
        isLocked={locked}
        onConflict={conflict.triggerConflict}
      />
      <ConflictDialog 
        open={conflict.open} 
        onClose={conflict.handleClose} 
        onReload={conflict.handleReload} 
      />
    </>
  );
}
