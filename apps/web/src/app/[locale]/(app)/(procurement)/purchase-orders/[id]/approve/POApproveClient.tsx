'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { usePO } from '@/features/purchasing/hooks/usePO';
import { useApprovePO } from '@/features/purchasing/hooks/useApprovePO';
import { useRejectPO } from '@/features/purchasing/hooks/useRejectPO';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { canPerformActionV2, type DocumentStatus } from '@/core/workflow/document-engine';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  ClipboardCheck, 
  MessageSquare,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';

interface Props {
  id: string;
  locale: 'ar' | 'en';
}

export function POApproveClient({ id }: Props) {
  const t = useTranslations('procurement.po');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  
  const { data: po, isLoading } = usePO(id);
  const queryClient = useQueryClient();
  const approveMutation = useApprovePO();
  const rejectMutation = useRejectPO();
  
  const [comment, setComment] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);

  const canApprove = po ? canPerformActionV2('PO', po.status as DocumentStatus, 'APPROVE', user?.role) : false;
  const canReject = po ? canPerformActionV2('PO', po.status as DocumentStatus, 'REJECT', user?.role) : false;

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!po) {
    return <ErrorState message={tc('not_found')} onRetry={() => queryClient.invalidateQueries({ queryKey: ['purchase-order', id] })} />;
  }

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({ id, version: po.version || 1 });
      toast.success(t('approval.approve_success'));
      router.push('/purchase-orders');
    } catch (e) {
      console.error(e);
      toast.error(tc('error'));
    }
  };

  const handleReject = async () => {
    if (!comment || comment.length < 15) {
      toast.error(t('approval.rejection_reason_min_chars'));
      return;
    }
    
    try {
      await rejectMutation.mutateAsync({ id, reason: comment, version: po.version || 1 });
      toast.success(t('approval.reject_success'));
      router.push('/purchase-orders');
    } catch (e) {
      console.error(e);
      toast.error(tc('error'));
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-20 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 mb-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
          className="rounded-full hover:bg-surface-container-high text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 me-2" />
          {tc('back')}
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-label-xs font-semibold uppercase text-operational-cyan/60">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t('approval.workflow')}</span>
        </div>
        <PageHeader
          title={t('approval.title')}
          description={`${t('approval.description')} #${po.document_number}`}
        />
      </div>

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
                  <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tc('supplier')}</p>
                  <p className="font-bold text-title-sm">{po.supplier_name || po.supplier_id}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('approval.order_total')}</p>
                  <p className="font-mono font-semibold text-title-lg text-operational-cyan">
                    {po.total?.toLocaleString()} <span className="text-label-xs opacity-60 ms-1">{po.currency_id}</span>
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('approval.target_warehouse')}</p>
                  <p className="font-bold text-title-sm">{po.warehouse_name || po.target_warehouse_id}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('approval.expected_delivery_date')}</p>
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
                  {t('approval.rejection_reason_label')}
                </Label>
              </div>
              
              <Textarea 
                placeholder={t('approval.rejection_reason_placeholder')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[120px] bg-surface-container-high/40 border-none rounded-2xl p-4 text-body-md font-medium focus:ring-1 focus:ring-operational-cyan/30 resize-none transition-all"
              />
              
              {isRejecting && (!comment || comment.length < 15) && (
                <div className="flex items-center gap-2 text-rose-400 p-4 bg-rose-400/5 rounded-2xl border border-rose-400/10">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-label-xs font-semibold uppercase">{t('approval.rejection_reason_min_chars')}</p>
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
                  onClick={() => setApproveConfirmOpen(true)}
                  disabled={approveMutation.isPending || rejectMutation.isPending || isRejecting || !canApprove}
                  className="w-full bg-operational-cyan text-primary-foreground hover:brightness-110 h-14 rounded-2xl transition-all font-semibold uppercase text-label-xs shadow-[0_8px_20px_rgba(var(--operational-cyan-rgb),0.2)]"
                >
                  <CheckCircle2 className="w-5 h-5 me-3" />
                  {t('approval.approve_po')}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/5" />
                  </div>
                  <div className="relative flex justify-center text-label-xs uppercase font-semibold text-muted-foreground/30">
                    <span className="bg-surface-container-low px-4">{tc('or')}</span>
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
                    {t('approval.reject_po')}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <Button
                      onClick={() => setRejectConfirmOpen(true)}
                      disabled={!comment || comment.length < 15 || rejectMutation.isPending}
                      className="w-full bg-rose-500 text-white hover:bg-rose-600 h-14 rounded-2xl transition-all font-semibold uppercase text-label-xs"
                    >
                      {t('approval.confirm_rejection')}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setIsRejecting(false)}
                      className="w-full text-label-xs font-semibold uppercase text-muted-foreground hover:text-foreground"
                    >
                      {tc('cancel')}
                    </Button>
                  </div>
                )}
              </div>

              <div className="p-6 bg-surface-container-high/40 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 opacity-40">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-label-xs font-semibold uppercase">{t('approval.legal_notice.title')}</p>
                </div>
                <p className="text-label-xs text-muted-foreground leading-relaxed font-medium">
                  {t('approval.legal_notice.text')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <PostConfirmDialog
        open={approveConfirmOpen}
        onOpenChange={setApproveConfirmOpen}
        onConfirm={handleApprove}
        title={t('approval.approve_confirm_title')}
        description={t('approval.approve_confirm_desc')}
        confirmText={t('approval.approve_po')}
        variant="default"
      />

      <PostConfirmDialog
        open={rejectConfirmOpen}
        onOpenChange={setRejectConfirmOpen}
        onConfirm={handleReject}
        title={t('approval.reject_confirm_title')}
        description={t('approval.reject_confirm_desc')}
        confirmText={t('approval.reject_po')}
        variant="destructive"
      />
    </div>
  );
}
