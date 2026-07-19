'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { usePO } from '@/features/purchasing/hooks/usePO';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PurchaseOrderForm } from '@/features/purchasing/components/purchase-order-form';

import { CheckCircle, Mail, Trash2, FileText, Send, ShieldCheck } from 'lucide-react';
import { useDeletePO } from '@/features/purchasing/hooks/useDeletePO';
import { useSubmitPO } from '@/features/purchasing/hooks/useSubmitPO';
import { useApprovePO } from '@/features/purchasing/hooks/useApprovePO';
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
 const submitPO = useSubmitPO({ onConflict: triggerConflict });
 const approvePO = useApprovePO({ onConflict: triggerConflict });

 if (isLoading) {
  return (
   <div className="min-w-0 items-center bg-card flex-1 gap-6 animate-pulse rounded-lg justify-center shadow-sm flex-col flex border border-border h-[60vh] w-full dark:bg-card-dark">
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
  <div className="w-full md:w-auto flex flex-col md:flex-row items-stretch md:items-center gap-3">
   {/* APPROVED: Receive Items + Email */}
   {status === PO_STATUS.APPROVED && !isNew && (
    <>
     <ActionGuard documentType="PO" status={status} action="FULFILL" role={user?.role}>
      <PermissionGate action="fulfill" resource="po">
       <Button
        onClick={() => router.push(`/goods-received/new?po_id=${id}`)}
        className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white h-10 px-6 rounded-lg transition-all font-bold uppercase text-label-xs shadow-md border-none flex items-center"
       >
        <FileText className="w-4 h-4 me-2" />
        {t('actions.receive_items') || 'Receive Items (GRN)'}
       </Button>
      </PermissionGate>
     </ActionGuard>

     <Button
      onClick={async () => {
       try {
        await apiClient.post(`/procurement/purchase-orders/${id}/email`, z.unknown());
        toast.success(t('email_sent') || 'PO emailed to supplier successfully');
       } catch (err) {
        toast.error(tCommon('error_generic') || 'Error sending email');
       }
      }}
      className="w-full md:w-auto bg-operational-cyan/10 text-operational-cyan hover:bg-operational-cyan/20 h-10 px-6 rounded-lg transition-all font-bold uppercase text-label-xs border border-operational-cyan/20 flex items-center"
     >
      <Mail className="w-4 h-4 me-2" />
      {t('actions.email_po') || 'Email PO'}
     </Button>
    </>
   )}

   {/* DRAFT: Delete + Submit for Approval */}
   {status === PO_STATUS.DRAFT && !isNew && (
    <>
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
       className="w-full md:w-auto bg-red-500/10 text-red-500 hover:bg-red-500/20 h-10 px-6 rounded-lg transition-all font-bold uppercase text-label-xs border border-red-500/20 flex items-center justify-center"
      >
       <Trash2 className="w-4 h-4 me-2" />
       {tCommon('actions.delete') || 'Delete'}
      </Button>
     </PermissionGate>

     <ActionGuard documentType="PO" status={status} action="SUBMIT" role={user?.role}>
      <PermissionGate action="submit" resource="po">
       <Button
        onClick={async () => {
         if (!po?.version && po?.version !== 0) return;
         try {
          await submitPO.mutateAsync({ id: id || '', version: po.version });
          toast.success(t('actions.submit_success') || 'Purchase Order submitted for approval');
         } catch (err) {
          console.error('[PODetailClient] Submit failed:', err);
         }
        }}
        disabled={submitPO.isPending}
        className="w-full md:w-auto h-10 px-6 rounded-lg transition-all font-bold uppercase text-label-xs bg-operational-cyan hover:brightness-110 text-white shadow-md shadow-operational-cyan/20 flex items-center justify-center disabled:opacity-50"
       >
        <Send className="w-4 h-4 me-2" />
        {submitPO.isPending ? tCommon('saving') : (t('actions.submit_for_approval') || 'تقديم للاعتماد')}
       </Button>
      </PermissionGate>
     </ActionGuard>
    </>
   )}

   {/* SUBMITTED: Inline Approve for privileged roles */}
   <ActionGuard documentType="PO" status={status} action="APPROVE" role={user?.role}>
    <PermissionGate action="approve" resource="po">
     <Button
      onClick={async () => {
       if (!po?.version && po?.version !== 0) return;
       try {
        await approvePO.mutateAsync({ id: id || '', version: po.version });
        toast.success(t('actions.approve_success') || 'Purchase Order approved successfully');
       } catch (err) {
        console.error('[PODetailClient] Approve failed:', err);
       }
      }}
      disabled={approvePO.isPending}
      className="w-full md:w-auto h-10 px-6 rounded-lg transition-all font-bold uppercase text-label-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center justify-center disabled:opacity-50"
     >
      <ShieldCheck className="w-4 h-4 me-2" />
      {approvePO.isPending ? tCommon('saving') : (t('actions.approve') || 'اعتماد')}
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

