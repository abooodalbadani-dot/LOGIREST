'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { usePO } from '@/features/purchasing/hooks/usePO';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PurchaseOrderForm } from '@/features/purchasing/components/purchase-order-form';

import { CheckCircle } from 'lucide-react';
import { isDocumentLocked, type DocumentStatus } from '@/core/workflow/document-engine';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { useAuth } from '@/providers/AuthProvider';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { PO_STATUS } from '@/contracts/statuses';

interface PODetailClientProps {
  id: string | null;
}

/**
 * PODetailClient - Dispatcher Pattern for Purchase Orders.
 */
export function PODetailClient({ id }: PODetailClientProps) {
  const t = useTranslations('procurement.po');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();
  const { data: po, isLoading } = usePO(id || '');
  const { open, handleReload, handleClose, triggerConflict } = useConflictHandler('purchase-order', id || '');

  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center bg-surface-container-low rounded-lg animate-pulse">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
        <p className="mt-6 text-label-xs font-semibold uppercase text-primary/60">{tCommon('loading')}</p>
      </div>
    );
  }

  const isNew = !id || id === 'new';
  const status = (po?.status || PO_STATUS.DRAFT) as DocumentStatus;


  // Generate actions for the viewer (strictly navigation or read-only triggers)
  const actions = (
    <div className="flex items-center gap-3">
      <ActionGuard documentType="PO" status={status} action="APPROVE" role={user?.role || 'WH_KEEPER'}>
        <PermissionGate action="approve" resource="po">
          <Button
            onClick={() => router.push(`/purchase-orders/${id}/approve`)}
            className="bg-surface-container-highest text-foreground hover:bg-surface-container-high h-10 px-6 rounded-lg transition-all font-bold uppercase text-label-xs border border-outline-variant/50"
          >
            <CheckCircle className="w-4 h-4 me-2" />
            {t('actions.go_to_approval')}
          </Button>
        </PermissionGate>
      </ActionGuard>
    </div>
  );

  return (
    <>
      <PurchaseOrderForm 
        initialData={po} 
        mode={isNew ? 'create' : 'edit'} 
        onConflict={triggerConflict}
        actions={actions}
      />
      <ConflictDialog 
        open={open}
        onReload={handleReload}
        onClose={handleClose}
      />
    </>
  );
}

