'use client';

import { useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { usePR } from '@/features/purchasing/hooks/usePR';
import { isDocumentLocked, type DocumentStatus } from '@/core/workflow/document-engine';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { useAuth } from '@/providers/AuthProvider';
import { 
  Edit3, 
  ArrowRight, 
  Package,
  ShieldCheck,
} from 'lucide-react';
import { PurchaseRequestViewer } from '@/features/purchasing/components/purchase-request-viewer';
import { PurchaseRequestForm } from '@/features/purchasing/components/purchase-request-form';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';

export function PRDetailClient({ id }: { id: string | null }) {
  const t = useTranslations('procurement.pr');
  const tc = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();

  const { data: pr, isLoading } = usePR(id);
  const { open, handleReload, handleClose, triggerConflict } = useConflictHandler('purchase-request', id || '');

  if (isLoading) return (
    <div className="min-h-screen bg-surface-container-low p-10 flex items-center justify-center">
      <div className="flex flex-col items-center justify-center space-y-8 animate-pulse">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-primary/5 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin" />
          <Package className="w-10 h-10 text-primary/40 animate-pulse" />
        </div>
        <p className="text-label-xs font-semibold uppercase text-primary/60">{t('sync_context')}</p>
      </div>
    </div>
  );

  if (!pr) return null;

  const status = pr.status as DocumentStatus;
  const isLocked = isDocumentLocked('PR', status);

  // If locked, render the strict immutable viewer with actions
  if (isLocked) {
    const headerActions = (
      <div className="flex items-center gap-3">
        <ActionGuard documentType="PR" status={status} action="EDIT" role={user?.role || 'WH_KEEPER'}>
          <PermissionGate action="update" resource="pr">
            <Button
              onClick={() => router.push(`/purchase-requests/${id}/edit`)}
              variant="outline"
              className="h-11 px-6 text-label-xs font-semibold uppercase rounded-xl border-operational-cyan/20 text-operational-cyan hover:bg-operational-cyan/5 hover:border-operational-cyan/40 transition-all"
            >
              <Edit3 className="w-4 h-4 me-2 opacity-60" />
              {tc('edit')}
            </Button>
          </PermissionGate>
        </ActionGuard>

        <ActionGuard documentType="PR" status={status} action="APPROVE" role={user?.role || 'WH_KEEPER'}>
          <PermissionGate action="approve" resource="pr">
            <Button
              onClick={() => router.push(`/purchase-requests/${id}/approve`)}
              className="h-11 px-8 bg-operational-cyan hover:bg-operational-cyan/90 text-primary-foreground text-label-xs font-semibold uppercase shadow-sm rounded-xl transition-all active:scale-95"
            >
              <ShieldCheck className="w-4 h-4 me-2" />
              {t('go_to_approval')}
            </Button>
          </PermissionGate>
        </ActionGuard>

        <ActionGuard documentType="PR" status={status} action="CONVERT_TO_PO" role={user?.role || 'WH_KEEPER'}>
          <PermissionGate action="create" resource="po">
            <Button
              onClick={() => router.push(`/purchase-orders/new?pr_id=${id}`)}
              className="primary-gradient h-11 px-8 text-white text-label-xs font-semibold uppercase rounded-xl transition-all active:scale-95 border-none shadow-lg shadow-primary/20"
            >
              <ArrowRight className="w-4 h-4 me-2 rtl:rotate-180" />
              {t('convert_to_po')}
            </Button>
          </PermissionGate>
        </ActionGuard>
      </div>
    );

    return <PurchaseRequestViewer document={pr} actions={headerActions} />;
  }

  // If not locked (DRAFT/REJECTED), render the form
  return (
    <>
      <PurchaseRequestForm initialData={pr} onConflict={triggerConflict} />
      <ConflictDialog 
        open={open}
        onReload={handleReload}
        onClose={handleClose}
      />
    </>
  );
}


