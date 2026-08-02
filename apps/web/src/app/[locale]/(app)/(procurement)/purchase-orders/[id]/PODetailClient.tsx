'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { usePO } from '@/features/purchasing/hooks/usePO';
import { Button } from '@/components/ui/button';
import { PurchaseOrderForm } from '@/features/purchasing/components/purchase-order-form';
import { POViewer } from './POViewer';
import { WorkflowActionBar } from '@/components/shared/WorkflowActionBar';
import { DocumentExportMenu } from '@/components/shared/DocumentExportMenu';

import { Mail, Loader2 } from 'lucide-react';
import { useDeletePO } from '@/features/purchasing/hooks/useDeletePO';
import { useSubmitPO } from '@/features/purchasing/hooks/useSubmitPO';
import { useApprovePO } from '@/features/purchasing/hooks/useApprovePO';
import { useRejectPO } from '@/features/purchasing/hooks/useRejectPO';
import { useCancelPO } from '@/features/purchasing/hooks/useCancelPO';
import { type DocumentStatus, PO_STATUS } from '@logirest/shared-types';
import { apiClient } from '@/infrastructure/api/client';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/providers/AuthProvider';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface PODetailClientProps {
  id: string | null;
}

/**
 * PODetailClient - Dispatcher Pattern for Purchase Orders with WorkflowActionBar.
 */
export function PODetailClient({ id }: PODetailClientProps) {
  const t = useTranslations('procurement.po');
  const tc = useTranslations('common');
  const locale = useLocale() as 'ar' | 'en';
  const router = useRouter();
  const { user } = useAuth();
  const { data: po, isLoading } = usePO(id || '');

  const [isEditing, setIsEditing] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const { open, handleReload, handleClose, triggerConflict } = useConflictHandler('purchase-order', id || '');
  const deletePO = useDeletePO();
  const submitPO = useSubmitPO({ onConflict: triggerConflict });
  const approvePO = useApprovePO({ onConflict: triggerConflict });
  const rejectPO = useRejectPO({ onConflict: triggerConflict });
  const cancelPO = useCancelPO({ onConflict: triggerConflict });

  if (isLoading) {
    return (
      <div className="min-w-0 items-center bg-card flex-1 gap-6 animate-pulse rounded-lg justify-center shadow-sm flex-col flex border border-border h-[60vh] w-full dark:bg-card-dark">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
        <p className="mt-6 text-label-xs font-semibold uppercase text-primary/60">{tc('loading')}</p>
      </div>
    );
  }

  const isNew = !id || id === 'new';
  const status = (po?.status || PO_STATUS.DRAFT) as DocumentStatus;

  const handleApprove = async () => {
    if (!po?.version && po?.version !== 0) return;
    try {
      await approvePO.mutateAsync({ id: po.id, version: po.version });
      toast.success(t('actions.approve_success') || 'Purchase Order approved successfully');
    } catch (err) {
      toast.error(tc('errors.generic'));
    }
  };

  const handleReject = async () => {
    if (!po?.version && po?.version !== 0) return;
    if (!rejectReason.trim()) {
      toast.error(tc('validation.required'));
      return;
    }
    try {
      await rejectPO.mutateAsync({ id: po.id, reason: rejectReason, version: po.version });
      toast.success(t('actions.reject_success') || 'Purchase Order rejected');
      setRejectModalOpen(false);
      setRejectReason('');
    } catch (err) {
      toast.error(tc('errors.generic'));
    }
  };

  const handleSubmit = async () => {
    if (!po?.version && po?.version !== 0) return;
    try {
      await submitPO.mutateAsync({ id: po.id, version: po.version });
      toast.success(t('actions.submit_success') || 'Purchase Order submitted for approval');
    } catch (err) {
      toast.error(tc('errors.generic'));
    }
  };

  const handleCancel = async () => {
    if (!po?.version && po?.version !== 0) return;
    try {
      await cancelPO.mutateAsync({ id: po.id, version: po.version });
      toast.success(t('actions.cancel_success') || 'Purchase Order cancelled');
    } catch (err) {
      toast.error(tc('errors.generic'));
    }
  };

  const handleDelete = async () => {
    if (!po) return;
    const confirmed = window.confirm('Are you sure you want to delete this draft purchase order? This action is permanent.');
    if (!confirmed) return;
    try {
      await deletePO.mutateAsync({ id: po.id, version: po.version });
      toast.success('Draft purchase order deleted successfully');
      router.push('/purchase-orders');
    } catch (err) {
      toast.error(tc('errors.generic'));
    }
  };

  const renderViewerActions = () => {
    if (!po) return null;
    return (
      <WorkflowActionBar
        documentType="PO"
        status={status}
        documentCreatorId={po.createdById || po.createdBy}
        currentUserId={user?.id}
        userRole={user?.role}
        onSubmit={handleSubmit}
        isSubmitPending={submitPO.isPending}
        onApprove={handleApprove}
        isApprovePending={approvePO.isPending}
        onReject={() => setRejectModalOpen(true)}
        isRejectPending={rejectPO.isPending}
        onCancel={handleCancel}
        isCancelPending={cancelPO.isPending}
        onDelete={handleDelete}
        isDeletePending={deletePO.isPending}
        onFulfill={() => router.push(`/goods-received/new?po_id=${po.id}`)}
        extraActions={
          status === PO_STATUS.APPROVED ? (
            <Button
              type="button"
              onClick={async () => {
                try {
                  await apiClient.post(`/procurement/purchase-orders/${po.id}/email`, z.unknown());
                  toast.success(t('email_sent') || 'PO emailed to supplier successfully');
                } catch (err) {
                  toast.error(tc('error_generic') || 'Error sending email');
                }
              }}
              className="bg-operational-cyan/10 text-operational-cyan hover:bg-operational-cyan/20 h-10 px-4 rounded-xl font-bold uppercase text-label-xs border border-operational-cyan/20 flex items-center"
            >
              <Mail className="w-4 h-4 me-2" />
              {t('actions.email_po') || 'Email PO'}
            </Button>
          ) : null
        }
        className="border-none shadow-none p-0 bg-transparent"
      />
    );
  };

  const isFormMode = isNew || status === PO_STATUS.DRAFT || isEditing;

  if (!isFormMode && po) {
    return (
      <>
        <POViewer
          document={po}
          locale={locale}
          actions={renderViewerActions()}
          onDelete={handleDelete}
          isDeletePending={deletePO.isPending}
          onApprove={status === PO_STATUS.PENDING_APPROVAL ? handleApprove : undefined}
          isApprovePending={approvePO.isPending}
          onReject={status === PO_STATUS.PENDING_APPROVAL ? () => setRejectModalOpen(true) : undefined}
          isRejectPending={rejectPO.isPending}
        />

        {/* Rejection Reason Modal */}
        <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                {(t.has('reject_confirm_title') ? t('reject_confirm_title') : null) || (locale === 'ar' ? 'تأكيد رفض امر الشراء' : 'Reject Purchase Order')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-label-xs font-semibold uppercase">
                  {tc('reason') || (locale === 'ar' ? 'سبب الرفض' : 'Rejection Reason')}
                </Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={(t.has('reject_reason_placeholder') ? t('reject_reason_placeholder') : null) || (locale === 'ar' ? 'أدخل سبب الرفض...' : 'Enter rejection reason...')}
                  rows={3}
                  className="rounded-xl"
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
                {tc('actions.cancel')}
              </Button>
              <Button
                onClick={handleReject}
                disabled={rejectPO.isPending || !rejectReason.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white border-none"
              >
                {rejectPO.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
                {t('actions.reject') || (locale === 'ar' ? 'رفض' : 'Reject')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConflictDialog
          open={open}
          onReload={handleReload}
          onClose={handleClose}
        />
      </>
    );
  }

  return (
    <>
      <PurchaseOrderForm
        initialData={po}
        mode={isNew ? 'create' : 'edit'}
        onConflict={triggerConflict}
        onDelete={handleDelete}
        isDeletePending={deletePO.isPending}
        onSubmitForApproval={handleSubmit}
        isSubmitPending={submitPO.isPending}
        onCancel={() => {
          if (isEditing) {
            setIsEditing(false);
          } else {
            router.push('/purchase-orders');
          }
        }}
      />
      <ConflictDialog
        open={open}
        onReload={handleReload}
        onClose={handleClose}
      />
    </>
  );
}
