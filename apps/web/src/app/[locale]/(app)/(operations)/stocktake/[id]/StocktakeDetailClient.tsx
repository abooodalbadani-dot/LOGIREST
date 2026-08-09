"use client"

import * as React from "react";
import { useStocktake, useCancelStocktake, useStartStocktake, useCloseStocktake } from "@/features/operations/api/useStocktakes";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { History, Play, RefreshCw, CheckCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { type DocumentStatus } from "@logirest/shared-types";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { ScopeGuard } from "@/components/shared/ScopeGuard";
import { isLocked as isDomainLocked } from "@/domain/status-guards";
import { mapToSessionVM } from "@/features/operations/mappers/stocktakeMapper";
import { StocktakeForm } from "./StocktakeForm";
import { useConflictHandler } from '@/core/concurrency/useConflictHandler';
import { ConflictDialog } from '@/core/concurrency/ConflictDialog';
import { StatusTimeline, type Status } from "@/components/shared/StatusTimeline";
import { WorkflowActionBar } from "@/components/shared/WorkflowActionBar";
import { ActionGuard } from "@/core/workflow/ActionGuard";
import { VoidButton } from "@/components/shared/VoidButton";
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useItems } from "@/features/items/hooks/useItems";
import type { Item } from "@/types/master-data";

export function StocktakeDetailClient({ id, locale }: { id: string, locale: 'ar' | 'en' }) {
  const t = useTranslations('operations.stocktake');
  const tc = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();
  const conflict = useConflictHandler('stocktake', id);
  const cancelStocktake = useCancelStocktake();
  const startStocktake = useStartStocktake({ onConflict: conflict.triggerConflict });
  const closeStocktake = useCloseStocktake({ onConflict: conflict.triggerConflict });

  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const [isAuditDialogOpen, setIsAuditDialogOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");

  const { data: itemsData } = useItems({ limit: 1000 });
  const { data: rawSession, isLoading, error } = useStocktake(id);

  const session = React.useMemo(() => {
    if (!rawSession) return null;
    const vm = mapToSessionVM(rawSession);
    if (itemsData?.data) {
      vm.items = vm.items.map((item) => {
        const masterItem = itemsData.data.find((i: Item) => i.id === item.itemId);
        const img = item.image || item.imageUrl || masterItem?.image || masterItem?.imageUrl || null;
        return {
          ...item,
          image: img,
          imageUrl: img,
        };
      });
    }
    return vm;
  }, [rawSession, itemsData]);

  // Clean up pointer-events on unmount to prevent Radix UI Dialog freeze bug
  React.useEffect(() => {
    return () => {
      document.body.style.pointerEvents = 'auto';
    };
  }, []);

  if (isLoading) return <PageSkeleton variant="detail" />;
  if (error || !session) return <ErrorState onRetry={() => window.location.reload()} />;

  const status = session.status as DocumentStatus;
  const isLocked = isDomainLocked('STOCKTAKE', status);

  const handleStart = async () => {
    try {
      await startStocktake.mutateAsync({ id });
      toast.success(locale === 'ar' ? 'تم بدء الجرد بنجاح' : 'Stocktake started successfully');
    } catch { /* handled by hook */ }
  };

  const handleClose = async () => {
    try {
      await closeStocktake.mutateAsync({ id });
      toast.success(locale === 'ar' ? 'تم إغلاق الجلسة بنجاح' : 'Stocktake closed successfully');
    } catch { /* handled by hook */ }
  };

  const handleCancel = () => {
    cancelStocktake.mutate(
      { id, version: session.version ?? 0, reason: cancelReason },
      {
        onSuccess: () => {
          try {
            toast.success(t('cancelled_success'));
          } catch {
            toast.success('Stocktake cancelled');
          }
          setIsCancelDialogOpen(false);
          router.push(`/stocktake/${id}`);
        },
        onError: (error) => {
          const isToastShown = error && typeof error === 'object' && (error as Record<string, unknown>)._isToastShown === true;
          if (!isToastShown) {
            try {
              toast.error(tc('error'));
            } catch {
              toast.error('Error cancelling stocktake');
            }
          }
          setIsCancelDialogOpen(false);
        },
      }
    );
  };

  const workflowActions = (
    <WorkflowActionBar
      documentType="STOCKTAKE"
      status={status}
      documentCreatorId={session.createdById ?? session.startedBy}
      currentUserId={user?.id}
      userRole={user?.role}
      onApprove={status === 'REVIEW' ? () => router.push(`/stocktake/${id}/approve`) : undefined}
      onReject={status === 'REVIEW' ? () => router.push(`/stocktake/${id}/variance`) : undefined}
      onPost={status === 'APPROVED' ? () => router.push(`/stocktake/${id}/post`) : undefined}
      onCancel={['DRAFT', 'STARTED', 'COUNTING', 'REVIEW'].includes(status) ? () => setIsCancelDialogOpen(true) : undefined}
      extraActions={
        <div className="flex items-center gap-2">
          <ActionGuard documentType="STOCKTAKE" status={status} action="START" role={user?.role}>
            <Button
              type="button"
              onClick={handleStart}
              disabled={startStocktake.isPending}
              className="h-10 px-5 rounded-xl bg-primary text-primary-foreground font-bold uppercase text-label-xs flex items-center"
            >
              {startStocktake.isPending ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Play className="w-4 h-4 me-2" />}
              {locale === 'ar' ? 'بدء الجرد' : 'Start Count'}
            </Button>
          </ActionGuard>

          {['STARTED', 'COUNTING'].includes(status) && (
            <Button
              type="button"
              onClick={() => router.push(`/stocktake/${id}/count`)}
              className="h-10 px-5 rounded-xl bg-operational-cyan hover:bg-operational-cyan/90 text-slate-950 font-extrabold uppercase text-label-xs flex items-center shadow-lg shadow-operational-cyan/20 animate-pulse"
            >
              <Play className="w-4 h-4 me-2 fill-current" />
              {locale === 'ar' ? 'إدخال الكميات / متابعة الجرد' : 'Enter Count / Continue'}
            </Button>
          )}

          {status === 'REVIEW' && (
            <ActionGuard documentType="STOCKTAKE" status={status} action="RECOUNT" role={user?.role}>
              <Button
                type="button"
                onClick={() => router.push(`/stocktake/${id}/count`)}
                variant="outline"
                className="h-10 px-4 rounded-xl font-bold uppercase text-label-xs flex items-center"
              >
                <RefreshCw className="w-4 h-4 me-2" />
                {locale === 'ar' ? 'إعادة العد' : 'Recount'}
              </Button>
            </ActionGuard>
          )}

          {status === 'POSTED' && (
            <ActionGuard documentType="STOCKTAKE" status={status} action="CLOSE" role={user?.role}>
              <Button
                type="button"
                onClick={handleClose}
                disabled={closeStocktake.isPending}
                className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-label-xs flex items-center"
              >
                {closeStocktake.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                ) : (
                  <CheckCheck className="w-4 h-4 me-2" />
                )}
                {locale === 'ar' ? 'إغلاق الجلسة' : 'Close Session'}
              </Button>
            </ActionGuard>
          )}

          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsAuditDialogOpen(true)}
            className="h-10 w-10 md:h-12 md:w-12 rounded-full text-foreground/70 hover:text-foreground hover:bg-muted/60 transition-all border border-border/40"
            title={locale === 'ar' ? 'سجل العمليات والتدقيق (Audit Trail)' : 'Audit Trail'}
          >
            <History className="w-4 h-4 md:w-5 md:h-5" />
          </Button>
          <VoidButton
            documentId={id}
            documentType="STOCKTAKE"
            status={status}
            version={session.version || 1}
          />
        </div>
      }
    />
  );

  return (
    <ScopeGuard warehouseId={session?.warehouseId}>
      <StocktakeForm 
        session={session} 
        locale={locale} 
        actions={workflowActions} 
        isLocked={isLocked}
        onConflict={conflict.triggerConflict}
      />

      <ConflictDialog 
        open={conflict.open}
        onClose={conflict.handleClose}
        onReload={conflict.handleReload}
      />

      {/* Dedicated Interactive Audit Trail Dialog */}
      <Dialog open={isAuditDialogOpen} onOpenChange={setIsAuditDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-[550px] sm:max-w-[550px] bg-card border border-border p-6 overflow-hidden rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-title-md font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              {locale === 'ar' ? 'سجل العمليات والتدقيق (Audit Trail)' : 'Audit Trail'}
            </DialogTitle>
            <DialogDescription className="text-label-xs text-muted-foreground">
              {locale === 'ar' ? 'التسلسل الزمني الكامل لجميع الحركات والتغييرات في هذه الجلسة' : 'Complete chronological history of events and status transitions for this session'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 max-h-[60vh] overflow-y-auto space-y-4 px-1">
            {(() => {
              const timeline = (session.auditLog ?? []).map(log => ({
                status: log.status.toLowerCase() as Status,
                at: log.createdAt,
                by: log.userName || tc('system_user'),
              }));
              if (timeline.length === 0) {
                timeline.push({ 
                  status: 'draft' as Status, 
                  at: session.createdAt || new Date().toISOString(), 
                  by: session.startedBy || tc('system_user') 
                });
              }
              return <StatusTimeline entries={timeline} />;
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAuditDialogOpen(false)} className="rounded-xl w-full">
              {locale === 'ar' ? 'إغلاق' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Session Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-[500px] sm:max-w-[500px] bg-surface-container-high border-none p-0 overflow-hidden rounded-[2rem]">
          <div className="p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-headline-lg font-semibold">{locale === 'ar' ? 'إلغاء جلسة الجرد' : 'Cancel Stocktake'}</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {t('cancel_confirm_desc') || 'Are you sure you want to cancel this stocktake? This action cannot be undone.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <label className="text-label-xs font-semibold uppercase text-muted-foreground/50">
                {tc('reason') || 'Reason'} (optional)
              </label>
              <Textarea 
                value={cancelReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCancelReason(e.target.value)}
                placeholder={tc('enter_reason') || 'Enter reason...'}
                className="min-h-[80px] bg-card border border-border shadow-sm border-none resize-none rounded-2xl focus-visible:ring-1 focus-visible:ring-status-error/30"
              />
            </div>
            <DialogFooter className="gap-3">
              <Button variant="ghost" onClick={() => setIsCancelDialogOpen(false)} className="rounded-xl">
                {locale === 'ar' ? 'تراجع / إغلاق' : 'Close'}
              </Button>
              <Button 
                onClick={handleCancel} 
                disabled={cancelStocktake.isPending}
                className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-8"
              >
                {locale === 'ar' ? 'تأكيد إلغاء الجلسة' : 'Confirm Cancel'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </ScopeGuard>
  );
}
