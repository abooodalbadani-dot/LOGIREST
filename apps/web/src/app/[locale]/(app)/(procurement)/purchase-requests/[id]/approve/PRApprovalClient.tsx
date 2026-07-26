'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { usePR } from '@/features/purchasing/hooks/usePR';
import { useApprovePR } from '@/features/purchasing/hooks/useApprovePR';
import { useRejectPR } from '@/features/purchasing/hooks/useRejectPR';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/usePermission';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthProvider';
import { canPerformActionV2, type DocumentStatus, isDocumentLocked } from '@logirest/shared-types';
import {
  CheckCircle2,
  XCircle as XCircleIcon,
  AlertCircle,
  FileText,
  ClipboardCheck,
  MessageSquare,
  ArrowLeft,
  ShieldCheck,
  Building2,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { useAudioFeedback } from '@/hooks/useAudioFeedback';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';
import { DocumentLock } from '@/components/shared/DocumentLock';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { RelationalName } from '@/components/shared/RelationalName';

interface Props {
  id: string;
}

export function PRApprovalClient({ id }: Props) {
  const t = useTranslations('procurement.pr');
  const tc = useTranslations('common');
  const locale = useLocale() as 'ar' | 'en';
  const router = useRouter();
  const { user } = useAuth();

  const { data: pr, isLoading } = usePR(id);
  const queryClient = useQueryClient();
  const approveMutation = useApprovePR();
  const rejectMutation = useRejectPR();
  const { playSound } = useAudioFeedback();

  const [comment, setComment] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);

  const hasApprovePermission = usePermission('approve', 'procurement_pr');
  const hasRejectPermission = usePermission('reject', 'procurement_pr');

  const canApprove = pr ? (canPerformActionV2('PR', pr.status as DocumentStatus, 'APPROVE', user?.role) && hasApprovePermission) : false;
  const canReject = pr ? (canPerformActionV2('PR', pr.status as DocumentStatus, 'REJECT', user?.role) && hasRejectPermission) : false;

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!pr) {
    return <ErrorState message={tc('not_found')} onRetry={() => queryClient.invalidateQueries({ queryKey: ['purchase-requests', id] })} />;
  }

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({ id, version: pr.version || 1 });
      playSound('success');
      toast.success(t('approval.approve_success'));
      router.push('/purchase-requests');
    } catch (e) {
      console.error(e);
      playSound('error');
      const isToastShown = e && typeof e === 'object' && (e as Record<string, unknown>)._isToastShown === true;
      if (!isToastShown) {
        toast.error(tc('error'));
      }
    }
  };

  const handleReject = async () => {
    if (!comment || comment.trim().length < 15) {
      playSound('error');
      toast.error(t('approval.rejection_reason_min_chars'));
      return;
    }

    try {
      await rejectMutation.mutateAsync({ id, reason: comment, version: pr.version || 1 });
      playSound('success');
      toast.success(t('approval.reject_success'));
      router.push('/purchase-requests');
    } catch (e) {
      console.error(e);
      playSound('error');
      const isToastShown = e && typeof e === 'object' && (e as Record<string, unknown>)._isToastShown === true;
      if (!isToastShown) {
        toast.error(tc('error'));
      }
    }
  };

  return (
    <div className="min-w-0 gap-6 flex-1 fade-in slide-in-from-bottom-4 mx-auto gap-8 animate-in flex-col flex pb-20 duration-700 w-full max-w-5xl">
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

      <div className="flex flex-col gap-4 min-w-0">
        <div className="flex items-center gap-2 text-label-xs font-semibold uppercase text-operational-cyan/60">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{t('approval.workflow')}</span>
        </div>
        <PageHeader
          title={t('approval.title')}
          subtitle={`${t('approval.description')} #${pr.documentNumber}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Summary Card */}
          <Card className="bg-card border border-border/60 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-4 pb-6 border-b border-border/40">
                <div className="w-12 h-12 rounded-2xl bg-operational-cyan/10 text-operational-cyan flex items-center justify-center shrink-0">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-body-md font-bold uppercase tracking-wide text-foreground">
                    {t('approval.summary_title')}
                  </h3>
                  <p className="text-label-xs font-medium text-muted-foreground mt-0.5">
                    {t('approval.summary_subtitle')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 text-start">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground/60" />
                    <p className="text-label-xs font-semibold uppercase text-muted-foreground/70">{t('approval.department')}</p>
                  </div>
                  <div className="font-bold text-title-sm pt-0.5">
                    <RelationalName
                      name={pr.warehouseName}
                      rawId={pr.departmentId}
                      fallback="Unknown Department"
                      className="font-mono text-xs bg-surface-container-high px-2.5 py-1 rounded-lg border border-border/50 inline-block"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-start">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground/60" />
                    <p className="text-label-xs font-semibold uppercase text-muted-foreground/70">{t('approval.expected_date')}</p>
                  </div>
                  <p className="font-semibold text-title-sm text-foreground text-start pt-0.5">
                    <bdi dir="ltr">
                      {pr.expectedDate ? new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(pr.expectedDate)) : '—'}
                    </bdi>
                  </p>
                </div>

                <div className="md:col-span-2 space-y-1.5 pt-2 border-t border-border/30">
                  <p className="text-label-xs font-semibold uppercase text-muted-foreground/70">{tc('notes')}</p>
                  <p className="text-body-md font-medium text-muted-foreground bg-surface-container-low/50 p-3.5 rounded-xl border border-border/30">
                    {pr.notes || tc('no_notes')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="relative">
            <DocumentLock isLocked={isDocumentLocked('PR', pr.status)}>
              <div className="bg-card border border-border/60 shadow-sm p-6 md:p-8 rounded-3xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-operational-cyan/10 text-operational-cyan">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="text-body-md font-bold uppercase tracking-wide text-foreground">{tc('items')}</h3>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-surface-container-high text-muted-foreground me-auto">
                    {pr.lines.length}
                  </span>
                </div>

                <div className="w-full overflow-x-auto pb-2">
                  <DocumentLineItemTable
                    mobileLayoutPattern="purchase-request-form"
                    lines={pr.lines.map(l => ({
                      id: l.id,
                      item: {
                        id: l.item.id,
                        code: l.item.code,
                        nameEn: l.item.nameEn,
                        nameAr: l.item.nameAr,
                        image: l.item.image || null,
                        primaryUom: {
                          code: l.item.primaryUom.code
                        }
                      },
                      qty: l.reqQty,
                      uomId: l.uomId
                    }))}
                    locale={locale}
                    isReadOnly={true}
                    hideLotColumns={true}
                  />
                </div>
              </div>
            </DocumentLock>
          </div>
        </div>

        {/* Action Panel */}
        <div className="space-y-8">
          <Card className="bg-card border border-border/60 shadow-sm rounded-3xl overflow-hidden sticky top-24">
            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="space-y-4">
                {!isRejecting && canApprove && (
                  <Button
                    onClick={() => setApproveConfirmOpen(true)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="w-full bg-operational-cyan text-primary-foreground hover:brightness-110 h-14 rounded-2xl transition-all font-black uppercase text-label-xs tracking-widest shadow-[0_8px_20px_rgba(var(--operational-cyan-rgb),0.2)]"
                  >
                    <CheckCircle2 className="w-5 h-5 me-2" />
                    {t('approval.approve_pr')}
                  </Button>
                )}

                {!isRejecting && canApprove && canReject && (
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/40" />
                    </div>
                    <div className="relative flex justify-center text-label-xs uppercase font-semibold text-muted-foreground/50">
                      <span className="bg-card px-3">{tc('or')}</span>
                    </div>
                  </div>
                )}

                {canReject && (
                  !isRejecting ? (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setIsRejecting(true)}
                      className="w-full h-12 rounded-2xl gap-2 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all font-bold text-label-xs uppercase"
                    >
                      <XCircleIcon className="w-4 h-4" />
                      <span>{t('approval.reject_pr') || 'REJECT REQUEST'}</span>
                    </Button>
                  ) : (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-destructive" />
                          <Label className="text-label-xs font-bold uppercase text-foreground">
                            {t('approval.rejection_reason_label')}
                          </Label>
                        </div>

                        <Textarea
                          placeholder={t('approval.rejection_reason_placeholder')}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="min-h-[110px] bg-surface-container-high/50 border border-border/50 rounded-xl p-3 text-body-sm font-medium focus:ring-1 focus:ring-destructive/30 resize-none transition-all"
                        />

                        {(!comment || comment.trim().length < 15) && (
                          <div className="flex items-center gap-1.5 text-rose-400 p-2.5 bg-rose-400/5 rounded-xl border border-rose-400/10 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <p className="text-label-xs font-medium">{t('approval.rejection_reason_min_chars')}</p>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => setRejectConfirmOpen(true)}
                        disabled={!comment || comment.trim().length < 15 || rejectMutation.isPending}
                        className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 h-13 rounded-2xl font-black uppercase text-label-xs tracking-widest transition-all shadow-md"
                      >
                        <XCircleIcon className="w-4 h-4 me-2" />
                        {t('approval.confirm_rejection')}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setIsRejecting(false);
                          setComment("");
                        }}
                        className="w-full text-muted-foreground hover:text-foreground h-10 rounded-xl font-bold uppercase text-label-xs tracking-wider transition-all"
                      >
                        {tc('cancel')}
                      </Button>
                    </div>
                  )
                )}

                {pr.status === 'APPROVED' && (
                  <Button
                    onClick={() => router.push(`/purchase-orders/new?pr_id=${pr.id}`)}
                    className="w-full h-13 bg-[#0B1220] text-white font-bold rounded-2xl shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    <ClipboardCheck className="w-5 h-5 me-2" />
                    {t('approval.generate_po') || 'Generate PO'}
                  </Button>
                )}
              </div>

              <div className="p-4 bg-surface-container-high/30 rounded-2xl space-y-2 border border-border/20">
                <div className="flex items-center gap-2 text-muted-foreground/70">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <p className="text-label-xs font-semibold uppercase">{t('approval.legal_notice.title')}</p>
                </div>
                <p className="text-label-xs text-muted-foreground/80 leading-relaxed font-medium">
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
        confirmText={t('approval.approve_pr')}
        variant="default"
        icon="info"
      />

      <PostConfirmDialog
        open={rejectConfirmOpen}
        onOpenChange={setRejectConfirmOpen}
        onConfirm={handleReject}
        title={t('approval.reject_confirm_title')}
        description={t('approval.reject_confirm_desc')}
        confirmText={t('approval.reject_pr')}
        variant="destructive"
        icon="reject"
        disabled={comment.length < 15}
      />
    </div>
  );
}
