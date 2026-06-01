'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { usePO } from '@/features/purchasing/hooks/usePO';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PurchaseOrderForm } from '@/features/purchasing/components/purchase-order-form';

import { CheckCircle, Mail, Trash2 } from 'lucide-react';
import { useDeletePO } from '@/features/purchasing/hooks/useDeletePO';
import { type DocumentStatus } from '@logirest/shared-types';
import { apiClient } from '@/infrastructure/api/client';
import { z } from 'zod';
import { toast } from 'sonner';
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { useAuth } from '@/providers/AuthProvider';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { PO_STATUS } from '@logirest/shared-types';

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
  const deletePO = useDeletePO();
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
      {status === PO_STATUS.APPROVED && !isNew && (
        <Button
          onClick={async () => {
            try {
              await apiClient.post(`/procurement/purchase-orders/${id}/email`, z.any());
              toast.success(t('email_sent') || 'PO emailed to supplier successfully');
            } catch (err) {
              toast.error(tCommon('error_generic') || 'Error sending email');
            }
          }}
          className="bg-operational-cyan/10 text-operational-cyan hover:bg-operational-cyan/20 h-10 px-6 rounded-lg transition-all font-bold uppercase text-label-xs border border-operational-cyan/20"
        >
          <Mail className="w-4 h-4 me-2" />
          {t('actions.email_po') || 'Email PO'}
        </Button>
      )}

      {status === PO_STATUS.DRAFT && !isNew && (
        <PermissionGate action="delete" resource="po">
          <Button
            onClick={async () => {
              const confirmed = window.confirm('Are you sure you want to delete this draft purchase order? This action is permanent.');
              if (!confirmed) return;
              try {
                await deletePO.mutateAsync({ id: id || '', version: po?.version });
                toast.success('Draft purchase order deleted successfully');
                router.push('/purchase-orders');
              } catch (err) {
                console.error(err);
              }
            }}
            disabled={deletePO.isPending}
            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 h-10 px-6 rounded-lg transition-all font-bold uppercase text-label-xs border border-red-500/20"
          >
            <Trash2 className="w-4 h-4 me-2" />
            {tCommon('actions.delete') || 'Delete'}
          </Button>
        </PermissionGate>
      )}

      <ActionGuard documentType="PO" status={status} action="APPROVE" role={user?.role}>
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

