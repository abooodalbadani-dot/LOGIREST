'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { usePR } from '@/features/purchasing/hooks/usePR';
import { useApprovePR } from '@/features/purchasing/hooks/useApprovePR';
import { useRejectPR } from '@/features/purchasing/hooks/useRejectPR';
import { useCancelPR } from '@/features/purchasing/hooks/useCancelPR';
import { ConvertToPOModal } from '@/features/purchasing/components/ConvertToPOModal';
import { DocumentExportMenu } from '@/components/shared/DocumentExportMenu';
import { WorkflowActionBar } from '@/components/shared/WorkflowActionBar';
import { type DocumentStatus } from '@logirest/shared-types';
import { useAuth } from '@/providers/AuthProvider';
import { ScopeGuard } from '@/components/shared/ScopeGuard';
import { PurchaseRequestForm } from '@/features/purchasing/components/purchase-request-form';
import { PRViewer } from './PRViewer';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function PRDetailClient({ id }: { id: string | null }) {
  const t = useTranslations('procurement.pr');
  const tc = useTranslations('common');
  const locale = useLocale() as 'ar' | 'en';
  const { user } = useAuth();
  const { data: pr, isLoading } = usePR(id);
  const { open, handleReload, handleClose, triggerConflict } = useConflictHandler('purchase-request', id || '');

  const [isEditing, setIsEditing] = useState(false);
  const [convertToPOOpen, setConvertToPOOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const approveMutation = useApprovePR({ onConflict: triggerConflict });
  const rejectMutation = useRejectPR({ onConflict: triggerConflict });
  const cancelMutation = useCancelPR({ onConflict: triggerConflict });

  if (isLoading) return <PageSkeleton variant="detail" />;

  if (!pr) return null;

  const isDraft = pr.status === 'DRAFT' || id === 'new';
  const isFormMode = isDraft || isEditing;

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({ id: pr.id, version: pr.version ?? 1 });
      toast.success(t('approved_success'));
    } catch (err) {
      toast.error(tc('errors.generic'));
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error(tc('validation.required'));
      return;
    }
    try {
      await rejectMutation.mutateAsync({ id: pr.id, reason: rejectReason, version: pr.version ?? 1 });
      toast.success(t('rejected_success'));
      setRejectModalOpen(false);
      setRejectReason('');
    } catch (err) {
      toast.error(tc('errors.generic'));
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({ id: pr.id, version: pr.version ?? 1 });
      toast.success(t('cancelled_success'));
      setCancelModalOpen(false);
    } catch (err) {
      toast.error(tc('errors.generic'));
    }
  };

  const renderViewerActions = () => {
    return (
      <WorkflowActionBar
        documentType="PR"
        status={pr.status as DocumentStatus}
        documentCreatorId={pr.createdById || pr.createdBy}
        currentUserId={user?.id}
        userRole={user?.role}
        onEdit={() => setIsEditing(true)}
        onApprove={handleApprove}
        isApprovePending={approveMutation.isPending}
        onReject={() => setRejectModalOpen(true)}
        isRejectPending={rejectMutation.isPending}
        onCancel={() => setCancelModalOpen(true)}
        isCancelPending={cancelMutation.isPending}
        onConvertToPO={() => setConvertToPOOpen(true)}
        extraActions={
          <DocumentExportMenu
            documentType="PR"
            documentId={pr.id}
            documentNumber={pr.documentNumber}
          />
        }
        className="border-none shadow-none p-0 bg-transparent"
      />
    );
  };

  if (!isFormMode) {
    return (
      <ScopeGuard warehouseId={pr.warehouseId}>
        <PRViewer document={pr} locale={locale} actions={renderViewerActions()} />
        
        <ConvertToPOModal
          pr={pr}
          open={convertToPOOpen}
          onOpenChange={setConvertToPOOpen}
        />

        {/* Rejection Modal */}
        <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
          <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                {locale === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection'}
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
                  placeholder={locale === 'ar' ? 'اشرح سبب رفض هذا الطلب...' : 'Enter rejection reason...'}
                  rows={4}
                  className="bg-surface-container-highest/30 border border-border/70 rounded-xl"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setRejectModalOpen(false)}
                className="rounded-xl border-border/70"
              >
                {tc('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                className="rounded-xl font-bold uppercase"
              >
                {rejectMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {locale === 'ar' ? 'تأكيد الرفض' : 'Confirm Rejection'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Modal */}
        <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
          <DialogContent className="sm:max-w-[450px] p-6 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">
                {locale === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancellation'}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              {locale === 'ar' ? 'هل أنت متأكد من إلغاء هذا الطلب؟ هذا الإجراء لا يمكن التراجع عنه.' : 'Are you sure you want to cancel this request? This action cannot be undone.'}
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setCancelModalOpen(false)}
                className="rounded-xl border-border/70"
              >
                {tc('cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="rounded-xl font-bold uppercase"
              >
                {cancelMutation.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                {locale === 'ar' ? 'تأكيد الإلغاء' : 'Confirm Cancellation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConflictDialog 
          open={open}
          onReload={handleReload}
          onClose={handleClose}
        />
      </ScopeGuard>
    );
  }

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
