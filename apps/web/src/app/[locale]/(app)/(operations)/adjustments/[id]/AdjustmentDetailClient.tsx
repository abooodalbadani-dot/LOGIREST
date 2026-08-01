'use client';

import React, { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAdjustment } from '@/features/operations/hooks/useAdjustment';
import { usePostAdjustment } from '@/features/operations/hooks/usePostAdjustment';
import { useCancelAdjustment } from '@/features/operations/hooks/useCancelAdjustment';
import { useApproveAdjustment } from '@/features/operations/hooks/useApproveAdjustment';
import { useRejectAdjustment } from '@/features/operations/hooks/useRejectAdjustment';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ADJUSTMENT_STATUS, type DocumentStatus } from '@logirest/shared-types';
import { AdjustmentForm } from './AdjustmentForm';
import { AdjustmentViewer } from './AdjustmentViewer';
import { WorkflowActionBar } from '@/components/shared/WorkflowActionBar';
import { VoidButton } from '@/components/shared/VoidButton';
import { useAuth } from '@/providers/AuthProvider';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { ScopeGuard } from '@/components/shared/ScopeGuard';
import { useItems } from '@/features/items/hooks/useItems';
import type { Item } from '@/types/master-data';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function AdjustmentDetailClient({ id }: { id: string }) {
  const t = useTranslations('operations.adjustment');
  const tc = useTranslations('common');
  const locale = useLocale() as 'ar' | 'en';
  const { user } = useAuth();
  const conflict = useConflictHandler('adjustment', id);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isNew = id === 'new';
  const { data: rawAdjustment, isLoading } = useAdjustment(isNew ? null : id);
  const { data: itemsData } = useItems({ limit: 1000 });

  const postAdjustment = usePostAdjustment({ onConflict: conflict.triggerConflict });
  const cancelAdjustment = useCancelAdjustment({ onConflict: conflict.triggerConflict });
  const approveAdjustment = useApproveAdjustment({ onConflict: conflict.triggerConflict });
  const rejectAdjustment = useRejectAdjustment({ onConflict: conflict.triggerConflict });

  const adjustment = React.useMemo(() => {
    if (!rawAdjustment) return undefined;
    if (!itemsData?.data || !rawAdjustment.lines) return rawAdjustment;
    return {
      ...rawAdjustment,
      lines: rawAdjustment.lines.map((line) => {
        const masterItem = itemsData.data.find((i: Item) => i.id === line.item.id);
        const img = line.item.image || masterItem?.image || masterItem?.imageUrl || null;
        const rawConversions = line.item.uomConversions || masterItem?.uomConversions || [];
        const conversions = rawConversions.map((c) => ({
          fromUomId: c.fromUomId,
          toUomId: c.toUomId,
          factor: Number(c.factor),
          fromUomCode: 'fromUomCode' in c ? String(c.fromUomCode || '') : undefined,
          fromUomName: 'fromUomName' in c ? String(c.fromUomName || '') : undefined,
          toUomCode: 'toUomCode' in c ? String(c.toUomCode || '') : undefined,
          toUomName: 'toUomName' in c ? String(c.toUomName || '') : undefined,
        }));
        return {
          ...line,
          item: {
            ...line.item,
            image: img,
            imageUrl: img,
            uomConversions: conversions,
          },
        };
      }),
    };
  }, [rawAdjustment, itemsData]);

  if (isLoading) return <PageSkeleton variant="detail" />;

  const status = adjustment?.status ?? ADJUSTMENT_STATUS.DRAFT;
  const isTerminal = ['POSTED', 'CANCELLED', 'VOIDED'].includes(status);

  const handlePost = async () => {
    if (!adjustment) return;
    try {
      await postAdjustment.mutateAsync({ id: adjustment.id, version: adjustment.version ?? 1 });
      toast.success(tc('post_success') || 'Adjustment posted successfully');
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async () => {
    if (!adjustment) return;
    try {
      await approveAdjustment.mutateAsync({ id: adjustment.id, version: adjustment.version ?? 1 });
      toast.success(tc('approved_success') || 'Adjustment approved');
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async () => {
    if (!adjustment || !rejectReason.trim()) return;
    try {
      await rejectAdjustment.mutateAsync({ id: adjustment.id, reject: rejectReason, version: adjustment.version ?? 1 });
      toast.success(tc('rejected_success') || 'Adjustment rejected');
      setRejectModalOpen(false);
      setRejectReason('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async () => {
    if (!adjustment) return;
    try {
      await cancelAdjustment.mutateAsync({ id: adjustment.id, version: adjustment.version ?? 1 });
      toast.success(tc('actions.cancel_success') || 'Adjustment cancelled');
    } catch (err) {
      console.error(err);
    }
  };

  const renderActions = () => {
    if (!adjustment) return null;
    const creatorId = adjustment.createdById || adjustment.createdBy;
    return (
      <WorkflowActionBar
        documentType="ADJUSTMENT"
        status={status as DocumentStatus}
        documentCreatorId={creatorId}
        currentUserId={user?.id}
        userRole={user?.role}
        onPost={handlePost}
        isPostPending={postAdjustment.isPending}
        onApprove={handleApprove}
        isApprovePending={approveAdjustment.isPending}
        onReject={() => setRejectModalOpen(true)}
        isRejectPending={rejectAdjustment.isPending}
        onCancel={handleCancel}
        isCancelPending={cancelAdjustment.isPending}
        extraActions={
          <VoidButton
            documentId={adjustment.id}
            documentType="ADJUSTMENT"
            status={status as DocumentStatus}
            version={adjustment.version || 1}
          />
        }
        className="border-none shadow-none p-0 bg-transparent"
      />
    );
  };

  const rejectionDialog = (
    <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
      <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">
            {locale === 'ar' ? 'تأكيد الرفض' : 'Reject Adjustment'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-label-xs font-semibold uppercase">
              {tc('reason') || 'Rejection Reason'}
            </Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder={locale === 'ar' ? 'أدخل سبب الرفض...' : 'Enter rejection reason...'}
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
            disabled={rejectAdjustment.isPending || !rejectReason.trim()}
            className="bg-rose-600 hover:bg-rose-700 text-white border-none"
          >
            {rejectAdjustment.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
            {tc('actions.reject') || 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isTerminal && adjustment) {
    return (
      <ScopeGuard warehouseId={adjustment.warehouseId}>
        <AdjustmentViewer document={adjustment} actions={renderActions()} />
        {rejectionDialog}
      </ScopeGuard>
    );
  }

  const isRejected = status === ADJUSTMENT_STATUS.REJECTED;
  const isFormLocked = status !== ADJUSTMENT_STATUS.DRAFT;

  return (
    <ScopeGuard warehouseId={adjustment?.warehouseId}>
      {isRejected && adjustment?.reject && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3 mb-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-label-sm font-medium">
            {t('rejection_reason_banner', { reason: adjustment.reject })}
          </p>
        </div>
      )}
      <AdjustmentForm 
        document={adjustment}
        id={id}
        isLocked={isFormLocked}
        onConflict={conflict.triggerConflict}
      />
      <ConflictDialog 
        open={conflict.open} 
        onClose={conflict.handleClose} 
        onReload={conflict.handleReload} 
      />
      {rejectionDialog}
    </ScopeGuard>
  );
}
