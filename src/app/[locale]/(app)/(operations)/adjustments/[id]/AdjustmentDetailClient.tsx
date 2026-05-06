'use client';

import { useTranslations } from 'next-intl';
import { useAdjustment } from '@/features/operations/hooks/useAdjustment';
import { useAuth } from '@/providers/AuthProvider';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ADJUSTMENT_STATUS } from '@/contracts/statuses';
import { isLocked } from '@/domain/status-guards';
import { AdjustmentForm } from './AdjustmentForm';
import { AdjustmentViewer } from './AdjustmentViewer';

export function AdjustmentDetailClient({ id }: { id: string }) {
  const tCommon = useTranslations('common');
  const { user } = useAuth();
  const conflict = useConflictHandler('adjustment', id);
  
  const isNew = id === 'new';
  const { data: adjustment, isLoading } = useAdjustment(isNew ? null : id);
  const status = adjustment?.status ?? ADJUSTMENT_STATUS.DRAFT;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tCommon('loading')}</p>
      </div>
    );
  }

  const locked = isLocked('ADJUSTMENT', status);

  if (locked) {
    return <AdjustmentViewer document={adjustment as any} />;
  }

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
