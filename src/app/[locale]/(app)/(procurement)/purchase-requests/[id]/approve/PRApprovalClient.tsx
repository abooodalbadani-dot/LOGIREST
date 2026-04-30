'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  Calendar,
  Building2,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/shared/PageHeader';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { StatusBadge, type BadgeStatus } from '@/components/ui/status-badge';
import { usePR } from '@/features/purchasing/hooks/usePR';
import { useApprovePR } from '@/features/purchasing/hooks/useApprovePR';
import { useRejectPR } from '@/features/purchasing/hooks/useRejectPR';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

const rejectionSchema = z.object({
  reason: z.string().min(15, { message: 'Rejection reason must be at least 15 characters' }),
});

type RejectionFormValues = z.infer<typeof rejectionSchema>;

export function PRApprovalClient({ id, locale }: { id: string; locale: 'ar' | 'en' }) {
  const t = useTranslations('procurement.pr');
  const tc = useTranslations('common');
  const router = useRouter();

  const { data: pr, isLoading } = usePR(id);
  const approveMutation = useApprovePR();
  const rejectMutation = useRejectPR();

  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  const rejectionForm = useForm<RejectionFormValues>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: { reason: '' },
  });

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(id);
      toast.success(t('approve_success'));
      router.push(`/${locale}/purchase-requests`);
    } catch (e) {
      console.error(e);
      toast.error(tc('error'));
    }
  };

  const onRejectSubmit = async (values: RejectionFormValues) => {
    try {
      await rejectMutation.mutateAsync({ id, reason: values.reason });
      toast.success(t('reject_success'));
      setRejectModalOpen(false);
      router.push(`/${locale}/purchase-requests`);
    } catch (e) {
      console.error(e);
      toast.error(tc('error'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center bg-surface-container-low shadow-xl rounded-2xl animate-pulse">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.4em] text-primary/60">{t('sync_context')}</p>
      </div>
    );
  }

  if (!pr || pr.status !== 'SUBMITTED') {
    return (
      <div className="flex flex-col h-[60vh] items-center justify-center bg-surface-container-low shadow-xl rounded-2xl">
        <AlertCircle className="w-16 h-16 text-status-error mb-4 opacity-20" />
        <h2 className="text-xl font-black uppercase tracking-widest text-muted-foreground">{t('invalid_state')}</h2>
        <Button onClick={() => router.back()} variant="ghost" className="mt-6">
          <ArrowLeft className="w-4 h-4 me-2" />
          {tc('back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 relative pb-20 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-operational-cyan/60">
           <ShieldCheck className="w-3.5 h-3.5" />
           <span>{t('approval_workflow')}</span>
        </div>
        <PageHeader
          title={pr.document_number}
          description={t('approval_desc')}
          status={pr.status as BadgeStatus}
          actions={
            <div className="flex items-center gap-4">
               <Button
                 variant="ghost"
                 onClick={() => router.back()}
                 className="h-12 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-surface-container-high transition-all"
               >
                 <ArrowLeft className="w-4 h-4 me-2" />
                 {tc('cancel')}
               </Button>
               <Button
                 variant="destructive"
                 onClick={() => setRejectModalOpen(true)}
                 className="h-12 px-8 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all"
               >
                 <XCircle className="w-4 h-4 me-2" />
                 {t('reject_pr')}
               </Button>
               <Button
                 onClick={() => setApproveConfirmOpen(true)}
                 className="h-12 px-10 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl shadow-emerald-900/20 active:scale-95 transition-all"
               >
                 <CheckCircle className="w-4 h-4 me-2" />
                 {t('approve_pr')}
               </Button>
            </div>
          }
        />
      </div>

      {/* PR Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-low p-6 rounded-3xl border border-surface-variant/10 shadow-sm flex flex-col gap-2 group transition-all hover:bg-surface-container">
           <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-operational-cyan/40 group-hover:text-operational-cyan transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{t('department')}</span>
           </div>
           <span className="font-bold text-lg tracking-tight">{pr.department_id}</span>
        </div>

        <div className="bg-surface-container-low p-6 rounded-3xl border border-surface-variant/10 shadow-sm flex flex-col gap-2 group transition-all hover:bg-surface-container">
           <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-operational-cyan/40 group-hover:text-operational-cyan transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{t('expected_date')}</span>
           </div>
           <span className="font-mono font-bold text-lg tracking-tight" dir="ltr">{pr.expected_date}</span>
        </div>

        <div className="bg-surface-container-low p-6 rounded-3xl border border-surface-variant/10 shadow-sm flex flex-col gap-2 group transition-all hover:bg-surface-container">
           <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-operational-cyan/40 group-hover:text-operational-cyan transition-colors" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{tc('notes')}</span>
           </div>
           <span className="text-sm font-medium opacity-60 italic">{pr.notes || tc('no_notes')}</span>
        </div>
      </div>

      {/* Read Only Items with Overlay */}
      <div className="relative">
        <DocumentReadOnlyOverlay isPosted={true}>
          <div className="bg-surface-container-lowest p-8 rounded-[2rem] border border-surface-variant/5 shadow-inner shadow-black/10">
             <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 rounded-xl bg-operational-cyan/10 text-operational-cyan">
                   <FileText className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.3em] text-operational-cyan">{tc('items')}</h3>
             </div>
             
             <DocumentLineItemTable
               lines={pr.lines.map(l => ({
                 id: l.id,
                 item_id: l.item.id,
                 item_name: locale === 'ar' ? l.item.name_ar : l.item.name_en,
                 item_code: l.item.code,
                 qty: l.req_qty,
                 uom_id: l.uom_id
               })) as LineItem[]}
               locale={locale}
               isReadOnly={true}
             />
          </div>
        </DocumentReadOnlyOverlay>
      </div>

      {/* Rejection Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="bg-surface-container-highest border border-surface-variant/10 rounded-[2rem] p-0 overflow-hidden shadow-2xl max-w-lg">
          <DialogHeader className="p-8 pb-4 bg-surface-container-low/50">
            <DialogTitle className="text-xl font-black uppercase tracking-wider text-status-error flex items-center gap-3">
               <XCircle className="w-6 h-6" />
               {t('reject_pr')}
            </DialogTitle>
            <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mt-2">
               {t('reject_confirm_desc')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-8 pt-4">
             <Form {...rejectionForm}>
               <form onSubmit={rejectionForm.handleSubmit(onRejectSubmit)} className="space-y-6">
                 <FormField
                   control={rejectionForm.control}
                   name="reason"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-3 flex items-center gap-2">
                         <MessageSquare className="w-3 h-3" />
                         {t('rejection_reason')}
                       </FormLabel>
                       <FormControl>
                         <Textarea 
                           placeholder={t('rejection_reason_placeholder') || 'Enter reason for rejection...'} 
                           className="min-h-[120px] bg-surface-container-low border-surface-variant/10 focus:ring- operational-cyan rounded-2xl text-sm font-medium resize-none shadow-inner"
                           {...field} 
                         />
                       </FormControl>
                       <FormMessage className="text-[10px] font-black uppercase mt-2 text-status-error" />
                     </FormItem>
                   )}
                 />
                 <DialogFooter className="gap-4 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setRejectModalOpen(false)}
                      className="h-12 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl"
                    >
                      {tc('cancel')}
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      className="h-12 px-8 bg-status-error hover:bg-status-error/90 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg"
                    >
                      {t('confirm_rejection')}
                    </Button>
                 </DialogFooter>
               </form>
             </Form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation */}
      <PostConfirmDialog
        open={approveConfirmOpen}
        onOpenChange={setApproveConfirmOpen}
        onConfirm={handleApprove}
        title={t('approve_confirm_title')}
        description={t('approve_confirm_desc')}
        warningText={t('irreversible')}
      />
    </div>
  );
}
