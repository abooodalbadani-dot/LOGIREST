'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { usePO } from '@/features/purchasing/hooks/usePO';
import { useApprovePO } from '@/features/purchasing/hooks/useApprovePO';
import { useRejectPO } from '@/features/purchasing/hooks/useRejectPO';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/providers/AuthProvider';
import { canPerformActionV2, type DocumentStatus } from '@/core/workflow/document-engine';
import { 
 CheckCircle2, 
 XCircle, 
 AlertCircle, 
 FileText, 
 ClipboardCheck, 
 MessageSquare,
 ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
 id: string;
 locale: string;
}

export function POApproveClient({ id, locale }: Props) {
 const t = useTranslations('procurement.po');
 const tCommon = useTranslations('common');
 const router = useRouter();
 const { user } = useAuth();
 
 const { data: po, isLoading } = usePO(id);
 const approveMutation = useApprovePO();
 const rejectMutation = useRejectPO();
 
 const [comment, setComment] = useState('');
 const [isRejecting, setIsRejecting] = useState(false);

 const canApprove = po ? canPerformActionV2('PO', po.status as DocumentStatus, 'APPROVE', user?.role) : false;
 const canReject = po ? canPerformActionV2('PO', po.status as DocumentStatus, 'REJECT', user?.role) : false;

 if (isLoading) {
 return (
 <div className="flex flex-col h-[60vh] items-center justify-center bg-surface-container-low shadow-xl rounded-2xl animate-pulse">
 <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
 </div>
 );
 }

 if (!po) return null;

 const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({ id, version: po.version || 1 });
      toast.success(tCommon('success'));
      router.push(`/${locale}/purchase-orders`);
    } catch (e) {
      console.error(e);
      toast.error(tCommon('error'));
    }
  };

  const handleReject = async () => {
    if (!comment) return;
    try {
      await rejectMutation.mutateAsync({ id, reason: comment, version: po.version || 1 });
      toast.success(tCommon('success'));
      router.push(`/${locale}/purchase-orders`);
    } catch (e) {
      console.error(e);
      toast.error(tCommon('error'));
    }
  };

 return (
 <div className="flex flex-col gap-8 pb-20 max-w-5xl mx-auto">
 <div className="flex items-center gap-4 mb-2">
 <Button 
 variant="ghost" 
 size="sm" 
 onClick={() => router.back()}
 className="rounded-full hover:bg-surface-container-high text-muted-foreground"
 >
 <ArrowLeft className="w-4 h-4 me-2" />
 {tCommon('back')}
 </Button>
 </div>

 <PageHeader
 title={t('approval.title')}
 description={`${t('approval.description')} #${po.document_number}`}
 />

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 <div className="lg:col-span-2 space-y-8">
 {/* Summary Card */}
 <Card className="bg-surface-container-low border-none rounded-3xl shadow-sm overflow-hidden">
 <CardContent className="p-8 space-y-8">
 <div className="flex items-center gap-4 pb-6 border-b border-white/5">
 <div className="w-12 h-12 rounded-2xl bg-operational-cyan/10 flex items-center justify-center">
 <ClipboardCheck className="w-6 h-6 text-operational-cyan" />
 </div>
 <div>
 <h3 className="text-body-md font-semibold uppercase text-foreground">
 {t('approval.summary_title')}
 </h3>
 <p className="text-label-xs font-bold text-muted-foreground/60 uppercase mt-1">
 {t('approval.summary_subtitle')}
 </p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
 <div className="space-y-1.5">
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tCommon('supplier')}</p>
 <p className="font-bold text-title-sm">{po.supplier_name || po.supplier_id}</p>
 </div>
 <div className="space-y-1.5">
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('order_total')}</p>
 <p className="font-mono font-semibold text-title-lg text-operational-cyan">
 {po.total?.toLocaleString()} <span className="text-label-xs opacity-60 ms-1">{po.currency_id}</span>
 </p>
 </div>
 <div className="space-y-1.5">
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('target_warehouse')}</p>
 <p className="font-bold text-title-sm">{po.warehouse_name || po.target_warehouse_id}</p>
 </div>
 <div className="space-y-1.5">
 <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('expected_delivery_date')}</p>
 <p dir="ltr" className="font-mono font-bold text-title-sm">{po.expected_delivery_date || '—'}</p>
 </div>
 </div>
 </CardContent>
 </Card>

 {/* Comment Area */}
 <Card className="bg-surface-container-low border-none rounded-3xl shadow-sm overflow-hidden">
 <CardContent className="p-8 space-y-6">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-xl bg-tertiary-container/10 flex items-center justify-center">
 <MessageSquare className="w-5 h-5 text-tertiary" />
 </div>
 <Label className="text-label-xs font-semibold uppercase text-foreground">
 {t('approval.comment_label')}
 </Label>
 </div>
 
 <Textarea 
 placeholder={t('approval.comment_placeholder')}
 value={comment}
 onChange={(e) => setComment(e.target.value)}
 className="min-h-[120px] bg-surface-container-high/40 border-none rounded-2xl p-4 text-body-md font-medium focus:ring-1 focus:ring-operational-cyan/30 resize-none transition-all"
 />
 
 {isRejecting && !comment && (
 <div className="flex items-center gap-2 text-rose-400 p-4 bg-rose-400/5 rounded-2xl border border-rose-400/10">
 <AlertCircle className="w-4 h-4" />
 <p className="text-label-xs font-semibold uppercase">{t('approval.rejection_reason_required')}</p>
 </div>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Action Panel */}
 <div className="space-y-8">
 <Card className="bg-surface-container-low border-none rounded-3xl shadow-sm overflow-hidden sticky top-24">
 <CardContent className="p-8 space-y-8">
 <div className="space-y-6">
 <Button
 onClick={handleApprove}
 disabled={approveMutation.isPending || rejectMutation.isPending || isRejecting || !canApprove}
 className="w-full bg-operational-cyan text-primary-foreground hover:brightness-110 h-14 rounded-2xl transition-all font-semibold uppercase text-label-xs shadow-[0_8px_20px_rgba(var(--operational-cyan-rgb),0.2)]"
 >
 <CheckCircle2 className="w-5 h-5 me-3" />
 {t('actions.approve')}
 </Button>

 <div className="relative">
 <div className="absolute inset-0 flex items-center">
 <span className="w-full border-t border-white/5" />
 </div>
 <div className="relative flex justify-center text-label-xs uppercase font-semibold text-muted-foreground/30">
 <span className="bg-surface-container-low px-4">{tCommon('or')}</span>
 </div>
 </div>

 {!isRejecting ? (
 <Button
 variant="outline"
 onClick={() => setIsRejecting(true)}
 disabled={!canReject}
 className="w-full border-white/5 hover:bg-rose-400/10 hover:text-rose-400 h-14 rounded-2xl transition-all font-semibold uppercase text-label-xs disabled:opacity-50"
 >
 <XCircle className="w-5 h-5 me-3" />
 {t('actions.reject')}
 </Button>
 ) : (
 <div className="space-y-4">
 <Button
 onClick={handleReject}
 disabled={!comment || rejectMutation.isPending}
 className="w-full bg-rose-500 text-white hover:bg-rose-600 h-14 rounded-2xl transition-all font-semibold uppercase text-label-xs"
 >
 {t('actions.confirm_rejection')}
 </Button>
 <Button
 variant="ghost"
 onClick={() => setIsRejecting(false)}
 className="w-full text-label-xs font-semibold uppercase text-muted-foreground hover:text-foreground"
 >
 {tCommon('cancel')}
 </Button>
 </div>
 )}
 </div>

 <div className="p-6 bg-surface-container-high/40 rounded-2xl space-y-4">
 <div className="flex items-center gap-2 opacity-40">
 <AlertCircle className="w-4 h-4" />
 <p className="text-label-xs font-semibold uppercase">Legal Notice</p>
 </div>
 <p className="text-label-xs text-muted-foreground leading-relaxed font-medium">
 By approving this document, you certify that all quantities and prices have been reviewed and comply with the branch procurement policy.
 </p>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 );
}
