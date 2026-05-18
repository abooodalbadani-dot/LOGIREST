'use client';

import { useTranslations } from 'next-intl';
import { isDocumentLocked, type DocumentStatus } from '@/core/workflow/document-engine';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { useGRN } from '@/features/purchasing/hooks/useGRN';
import { useAuth } from '@/providers/AuthProvider';

import { GRNForm } from '@/features/purchasing/components/grn-form';
import { Button } from '@/components/ui/button';
import { Send, Scan } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { GRN_STATUS } from '@/contracts/statuses';

interface GRNDetailClientProps {
  id: string;
}

import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';

/**
 * GRNDetailClient - Dispatcher Pattern
 * Switches between GRNForm (Editable) and GRNViewer (Locked/Immutable)
 */
export function GRNDetailClient({ id }: GRNDetailClientProps) {
  const t = useTranslations('procurement.grn');
  const router = useRouter();
  const { user } = useAuth();
  
  const isNew = id === 'new';
  const { data: grn, isLoading, error } = useGRN(isNew ? null : id);
  const { open, handleReload, handleClose, triggerConflict } = useConflictHandler('goods-received', id);

  if (isLoading) return <PageSkeleton variant="detail" />;
  if (error || (!isNew && !grn)) return <ErrorState onRetry={() => window.location.reload()} />;

  const status = (grn?.status || GRN_STATUS.DRAFT) as DocumentStatus;
  const isLocked = isDocumentLocked('GRN', status);

    const actions = (
      <div className="flex gap-2 items-center">
        {isLocked ? (
          <Button
            onClick={() => router.push(`/goods-received/${id}/scan-mode`)}
            variant="outline"
            className="h-10 px-6 text-label-xs font-semibold uppercase rounded-lg border-status-warning/20 text-status-warning hover:bg-status-warning/5 transition-all"
          >
            <Scan className="w-4 h-4 me-2" />
            {t('inspect_scan_registers')}
          </Button>
        ) : (
          <Button
            onClick={() => router.push(`/goods-received/${id}/scan-mode`)}
            variant="outline"
            className="h-10 px-6 text-label-xs font-semibold uppercase rounded-lg border-primary/20 text-primary hover:bg-primary/5 transition-all"
          >
            <Scan className="w-4 h-4 me-2" />
            {t('scan_mode')}
          </Button>
        )}
        <ActionGuard documentType="GRN" status={status} action="POST" role={user?.role || 'WH_KEEPER'}>
          <Button 
            onClick={() => router.push(`/goods-received/${id}/post`)}
            className="h-10 px-8 primary-gradient text-white text-label-xs font-semibold uppercase shadow-xl shadow-primary/20 transition-all rounded-lg"
          >
            <Send className="w-4 h-4 me-2" />
            {t('post_grn')}
          </Button>
        </ActionGuard>
      </div>
  );

  return (
    <>
      <GRNForm 
        initialData={grn} 
        id={id} 
        actions={actions}
        onConflict={triggerConflict}
              />
      <ConflictDialog 
        open={open}
        onReload={handleReload}
        onClose={handleClose}
      />
    </>
  );
}
