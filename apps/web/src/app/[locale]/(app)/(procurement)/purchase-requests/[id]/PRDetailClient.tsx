'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { usePR } from '@/features/purchasing/hooks/usePR';
import { useApprovePR } from '@/features/purchasing/hooks/useApprovePR';
import { useRejectPR } from '@/features/purchasing/hooks/useRejectPR';
import { useCancelPR } from '@/features/purchasing/hooks/useCancelPR';
import { ConvertToPOModal } from '@/features/purchasing/components/ConvertToPOModal';
import { DocumentExportMenu } from '@/components/shared/DocumentExportMenu';
import { useAuth } from '@/providers/AuthProvider';
import { PurchaseRequestForm } from '@/features/purchasing/components/purchase-request-form';
import { PRViewer } from './PRViewer';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Ban, ShoppingCart, Loader2 } from 'lucide-react';
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
 const userRole = user?.role || '';

 const canApprove = ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR', 'PROC_MGR'].includes(userRole);
 const canReject = ['ADMIN', 'GM', 'APPROVER', 'BRANCH_MGR', 'PROC_MGR'].includes(userRole);
 const canCancel = ['ADMIN', 'PROC_OFFICER', 'INV_MGR', 'BRANCH_MGR', 'PROC_MGR'].includes(userRole);
 const canConvertToPO = ['ADMIN', 'PROC_OFFICER', 'PROC_MGR', 'BRANCH_MGR'].includes(userRole);

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
   <div className="flex flex-wrap items-center gap-2">
    {/* Standardized Document Export Dropdown (PDF & Excel) */}
    <DocumentExportMenu
     documentType="PR"
     documentId={pr.id}
     documentNumber={pr.documentNumber}
    />

    {/* SUBMITTED State Actions */}
    {pr.status === 'SUBMITTED' && (
     <>
      {canApprove && (
       <Button
        type="button"
        onClick={handleApprove}
        disabled={approveMutation.isPending}
        className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-label-xs font-bold uppercase shadow-md shadow-emerald-600/20 transition-all active:scale-95 border-none"
       >
        {approveMutation.isPending ? (
         <Loader2 className="w-4 h-4 animate-spin me-2" />
        ) : (
         <CheckCircle2 className="w-4 h-4 me-2" />
        )}
        {t('approve') || (locale === 'ar' ? 'اعتماد' : 'Approve')}
       </Button>
      )}

      {canReject && (
       <Button
        type="button"
        onClick={() => setRejectModalOpen(true)}
        disabled={rejectMutation.isPending}
        className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-label-xs font-bold uppercase shadow-md shadow-rose-600/20 transition-all active:scale-95 border-none"
       >
        <XCircle className="w-4 h-4 me-2" />
        {t('reject') || (locale === 'ar' ? 'رفض' : 'Reject')}
       </Button>
      )}

      {canCancel && (
       <Button
        variant="outline"
        type="button"
        onClick={() => setCancelModalOpen(true)}
        disabled={cancelMutation.isPending}
        className="h-9 px-3 rounded-xl border-border hover:bg-destructive/10 hover:text-destructive text-label-xs font-bold uppercase transition-all"
       >
        <Ban className="w-4 h-4 me-2" />
        {tc('actions.cancel') || (locale === 'ar' ? 'إلغاء' : 'Cancel')}
       </Button>
      )}
     </>
    )}

    {/* APPROVED State Actions */}
    {pr.status === 'APPROVED' && canConvertToPO && (
     <Button
      type="button"
      onClick={() => setConvertToPOOpen(true)}
      className="h-9 px-4 rounded-xl bg-brand-gold hover:bg-brand-gold/90 text-white text-label-xs font-bold uppercase shadow-md shadow-brand-gold/20 transition-all active:scale-95 border-none"
     >
      <ShoppingCart className="w-4 h-4 me-2" />
      {t('convert_to_po')}
     </Button>
    )}
   </div>
  );
 };

 if (!isDraft) {
  return (
   <>
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
        {t('reject_confirm_title')}
       </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
       <div className="space-y-2">
        <Label className="text-label-xs font-semibold uppercase">{tc('reason') || (locale === 'ar' ? 'سبب الرفض' : 'Rejection Reason')}</Label>
        <Textarea
         value={rejectReason}
         onChange={(e) => setRejectReason(e.target.value)}
         placeholder={t('reject_reason_placeholder')}
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
        disabled={rejectMutation.isPending || !rejectReason.trim()}
        className="bg-rose-600 hover:bg-rose-700 text-white border-none"
       >
        {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
        {t('reject')}
       </Button>
      </DialogFooter>
     </DialogContent>
    </Dialog>

    {/* Cancel Confirmation Modal */}
    <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
     <DialogContent className="sm:max-w-[450px] p-6 rounded-2xl">
      <DialogHeader>
       <DialogTitle className="text-lg font-bold text-foreground">
        {t('cancel_confirm_title')}
       </DialogTitle>
      </DialogHeader>
      <p className="text-sm text-muted-foreground py-2">
       {t('cancel_confirm_desc')}
      </p>
      <DialogFooter className="gap-2">
       <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
        {tc('actions.cancel')}
       </Button>
       <Button
        onClick={handleCancel}
        disabled={cancelMutation.isPending}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 border-none"
       >
        {cancelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
        {tc('actions.cancel')}
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
   <PurchaseRequestForm initialData={pr} onConflict={triggerConflict} />
   <ConflictDialog 
    open={open}
    onReload={handleReload}
    onClose={handleClose}
   />
  </>
 );
}
