'use client';

import { useTranslations } from 'next-intl';
import { isDocumentLocked, type DocumentStatus } from '@/core/workflow/document-engine';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { useGRN } from '@/features/purchasing/hooks/useGRN';
import { useAuth } from '@/providers/AuthProvider';
import { GRNViewer } from '@/features/purchasing/components/grn-viewer';
import { GRNForm } from '@/features/purchasing/components/grn-form';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { GRN_STATUS } from '@/contracts/statuses';

interface GRNDetailClientProps {
  id: string;
}

/**
 * GRNDetailClient - Dispatcher Pattern
 * Switches between GRNForm (Editable) and GRNViewer (Locked/Immutable)
 */
export function GRNDetailClient({ id }: GRNDetailClientProps) {
  const t = useTranslations('procurement.grn');
  const router = useRouter();
  const { user } = useAuth();
  
  const isNew = id === 'new';
  const { data: grn, isLoading } = useGRN(isNew ? null : id);
  const { open, handleReload, handleClose, triggerConflict } = useConflictHandler('goods-received', id);

  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center bg-surface-container-low rounded-lg animate-pulse">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-label-xs font-semibold text-primary uppercase">GRN</div>
        </div>
        <p className="mt-6 text-label-xs font-semibold uppercase text-primary/60 animate-pulse">{t('initializing_context')}</p>
      </div>
    );
  }

  const status = (grn?.status || GRN_STATUS.DRAFT) as DocumentStatus;
  const isLocked = isDocumentLocked('GRN', status);

  // Dispatcher Logic
  if (isLocked) {
    return (
      <GRNViewer 
        document={grn} 
        actions={
          <ActionGuard documentType="GRN" status={status} action="POST" role={user?.role || 'WH_KEEPER'}>
            <Button 
              onClick={() => router.push(`/goods-received/${id}/post`)}
              className="h-10 px-8 primary-gradient text-white text-label-xs font-semibold uppercase shadow-xl shadow-primary/20 transition-all rounded-lg"
            >
              <Send className="w-4 h-4 me-2" />
              {t('post_grn')}
            </Button>
          </ActionGuard>
        }
      />
    );
  }

  return (
    <>
      <GRNForm 
        document={grn} 
        id={id} 
        isLocked={isLocked}
        canPost={false} // Detail client usually doesn't show post button inside form if it has a separate post page
      />
      <ConflictDialog 
        open={open}
        onReload={handleReload}
        onClose={handleClose}
      />
    </>
  );
}
