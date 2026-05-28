"use client"

import * as React from "react";
import { useStocktake, useApproveStocktake, useRejectStocktake } from "@/features/operations/api/useStocktakes";
import { useWarehouses } from "@/features/warehouses/hooks/useWarehouses";
import { useBaseCurrency } from "@/hooks/useBaseCurrency";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { 
 BarChart3, 
 CheckCircle2, 
 XCircle, 
 AlertTriangle,
 ArrowUpRight,
 ArrowDownRight,
 Calculator
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/AuthProvider";
import { ActionGuard } from '@/core/workflow/ActionGuard';
import { canPerformActionV2, type DocumentStatus } from '@logirest/shared-types';

import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/utils/currency";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { STOCKTAKE_STATUS_UI } from "@/domain/status-ui-map";
import { MetricCard } from "@/components/ui/metric-card";
import { DocumentLineItemTable, type LineItem } from "@/components/shared/DocumentLineItemTable/DocumentLineItemTable";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { PostConfirmDialog } from "@/components/shared/PostConfirmDialog";
import { LoadingSkeleton } from "@/components/shared/LoadingSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogFooter,
 DialogHeader,
 DialogTitle,
} from "@/components/ui/dialog";
import { useAudioFeedback } from '@/hooks/useAudioFeedback';

const APPROVAL_THRESHOLD = 10000;

interface StocktakeLineItem extends LineItem {
  snapshotQty: number | null;
  countedQty: number | null;
  variance: number | null;
  uom: string;
  unitCost: number;
  varianceReason: string;
}

export function StocktakeApproveClient({ id, locale }: { id: string, locale: 'ar' | 'en' }) {
 const t = useTranslations('operations.stocktake')
 const common = useTranslations('common')
 const router = useRouter()
 const { user } = useAuth();
 
 const { data: session, isLoading, error } = useStocktake(id);
const { data: warehousesData } = useWarehouses(); const warehouses = warehousesData?.data || [];
  const { currency: currencyCode } = useBaseCurrency();
  const approveStocktake = useApproveStocktake();
 const rejectStocktake = useRejectStocktake();
 const { playSound } = useAudioFeedback();

 const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
 const [rejectionReason, setRejectionReason] = React.useState("");

  // Calculations (must be before memos that consume them)
  const itemsWithVariance = React.useMemo(() => !session ? [] : session.items.filter(item => (item.variance || 0) !== 0), [session?.items]);
  const totalPositiveVariance = React.useMemo(() => !session ? 0 : session.items.reduce((acc, item) => {
    const variance = item.variance || 0;
    return variance > 0 ? acc + (variance * item.unit_cost) : acc;
  }, 0), [session?.items]);
  const totalNegativeVariance = React.useMemo(() => !session ? 0 : session.items.reduce((acc, item) => {
    const variance = item.variance || 0;
    return variance < 0 ? acc + (Math.abs(variance) * item.unit_cost) : acc;
  }, 0), [session?.items]);
  const netImpact = totalPositiveVariance - totalNegativeVariance;
  const absoluteNetImpact = Math.abs(netImpact);
  const elevatedApprovalRequired = absoluteNetImpact > APPROVAL_THRESHOLD;

  // Access Control: Enforce role and workflow status via engine
  // When net variance exceeds threshold, only ADMIN may approve.
  const canApprove = React.useMemo(() => {
   if (!session || !user) return false;
   if (elevatedApprovalRequired && user.role !== 'ADMIN') return false;
   return canPerformActionV2('STOCKTAKE', session.status as DocumentStatus, 'APPROVE', user.role);
  }, [session, user, elevatedApprovalRequired]);

  const tableLines = React.useMemo((): StocktakeLineItem[] => {
  if (!session) return [];
  return session.items.map((item) => ({
    id: item.id,
    item: {
      id: item.item_id,
      code: item.barcode || '',
      name_en: item.item_name,
      name_ar: item.item_name,
      primary_uom: { code: item.uom }
    },
    qty: item.counted_qty ?? 0,
    uom_id: '',
    lot: null,
    snapshotQty: item.snapshot_qty,
    countedQty: item.counted_qty,
    variance: item.variance,
    uom: item.uom,
    unitCost: item.unit_cost,
    varianceReason: item.variance_reason || '',
  }));
 }, [session?.items]);

 if (isLoading) return <LoadingSkeleton />
 if (error || !session) return <ErrorState onRetry={() => window.location.reload()} />

 if (!canApprove) {
  router.replace(`/stocktake/${id}`);
  return null;
 }

  const warehouse = warehouses?.find(w => w.id === session.warehouse_id);
  const warehouseName = warehouse ? (locale === 'ar' ? warehouse.name_ar : warehouse.name_en) : (session.warehouse_name || session.warehouse_id);

 const handleApprove = () => {
  approveStocktake.mutate(
   { id },
   {
     onSuccess: () => {
      playSound('success');
      toast.success(t('approved_success'));
      router.push(`/stocktake/${id}`);
     },
     onError: () => {
      playSound('error');
      toast.error(common('error'));
     }
   }
  );
 };

 const handleReject = () => {
  if (rejectionReason.trim().length < 15) {
   toast.error(t('validation.rejection_reason_min'));
   return;
  }
  rejectStocktake.mutate(
   { id, comment: rejectionReason },
   {
     onSuccess: () => {
      playSound('success');
      toast.success(t('rejected_success'));
      setIsRejectDialogOpen(false);
      router.push(`/stocktake/${id}`);
     },
     onError: () => {
      playSound('error');
      toast.error(common('error'));
     }
   }
  );
 };

 return (
 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
 <PermissionGate action="approve" resource="operations_stocktake">
 <PageHeader
 title={
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
 <BarChart3 className="w-6 h-6 text-primary" />
 </div>
 <div className="flex flex-col">
 <span className="font-semibold text-headline-lg">
 {session.session_name}
 </span>
 <div className="flex items-center gap-2 mt-1 text-muted-foreground">
  <StatusBadge status={session.status} configMap={STOCKTAKE_STATUS_UI} />
 <span className="text-label-xs font-semibold opacity-20 uppercase leading-none">|</span>
 <span className="text-label-xs uppercase font-semibold opacity-40">{warehouseName}</span>
 </div>
 </div>
 </div>
 }
 actions={
 <div className="flex items-center gap-3">
  <ActionGuard documentType="STOCKTAKE" action="REJECT" status={session.status} role={user?.role || ''}>
  <Button 
  variant="outline" 
  className="border-status-error/20 text-status-error hover:bg-status-error/10 rounded-xl"
  onClick={() => setIsRejectDialogOpen(true)}
  >
  <XCircle className="w-4 h-4 me-2" />
  {t('reject_session')}
  </Button>
  </ActionGuard>
  <PostConfirmDialog
 title={t('confirm_approve_title')}
 description={t('confirm_approve_desc')}
 onConfirm={handleApprove}
 trigger={
 <Button className="primary-gradient shadow-lg shadow-primary/20 px-8 rounded-xl">
 <CheckCircle2 className="w-4 h-4 me-2" />
 {t('approve_session_action')}
 </Button>
 }
 />
 </div>
 }
 backHref={`/stocktake/${id}`}
 />

 {/* Metrics Grid */}
 <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
  <MetricCard 
 label={t('metrics.total_items')} 
 value={formatNumber(session.items.length, locale)} 
 icon={Calculator}
 color="indigo"
 />
 <MetricCard 
 label={t('metrics.items_with_variance')} 
 value={formatNumber(itemsWithVariance.length, locale)} 
 icon={AlertTriangle}
 color="amber"
 />
 <MetricCard 
 label={t('metrics.positive_variance')} 
 value={formatCurrency(totalPositiveVariance, currencyCode, locale)} 
 icon={ArrowUpRight}
 color="emerald"
 />
 <MetricCard 
 label={t('metrics.negative_variance')} 
 value={formatCurrency(totalNegativeVariance, currencyCode, locale)} 
 icon={ArrowDownRight}
 color="rose"
 />
 <MetricCard 
 label={t('metrics.net_impact')} 
 value={formatCurrency(netImpact, currencyCode, locale)} 
 icon={BarChart3}
 color={netImpact >= 0 ? "emerald" : "rose"} />
 </div>

 {/* Variance Table */}
  {elevatedApprovalRequired && (
    <div className="bg-status-warning/10 border border-status-warning/30 rounded-2xl p-5 flex items-start gap-4">
      <AlertTriangle className="w-5 h-5 text-status-warning shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="text-label-sm font-bold text-status-warning">
          {t('elevated_approval_title') || 'Elevated Approval Required'}
        </p>
        <p className="text-label-xs text-muted-foreground">
          {t('elevated_approval_desc', { threshold: formatCurrency(APPROVAL_THRESHOLD, currencyCode, locale) }) || `The net variance impact of ${formatCurrency(absoluteNetImpact, currencyCode, locale)} exceeds the ${formatCurrency(APPROVAL_THRESHOLD, currencyCode, locale)} threshold. Only ADMIN users can approve this session.`}
        </p>
      </div>
    </div>
  )}

  <Card className="bg-surface-container-low border-none shadow-none rounded-[2rem] overflow-hidden">
     <div className="p-8 bg-white/[0.01]">
       <h3 className="text-body-md font-semibold uppercase text-muted-foreground/40">
         {t('variance_details_table')}
       </h3>
     </div>
    <DocumentLineItemTable
      lines={tableLines}
      locale={locale}
      isReadOnly={true}
      hideLotColumns={true}
      headers={{ qty: t('counted_qty') }}
      renderQty={(line) => (
        <span className="font-mono text-label-sm font-semibold text-foreground">
          {formatNumber(line.countedQty, locale, 3)}
        </span>
      )}
      renderUom={(line) => (
        <span className="text-label-xs font-semibold text-muted-foreground/40 uppercase">
          {line.uom}
        </span>
      )}
      extraColumns={[
        {
          header: t('snapshot_qty'),
          cell: (line) => (
            <span className="font-mono text-label-sm font-bold text-muted-foreground/60" dir="ltr">
              {formatNumber(line.snapshotQty, locale, 3)} {line.uom}
            </span>
          )
        },
        {
          header: t('variance'),
          cell: (line) => {
            const variance = line.variance ?? 0;
            return (
              <div className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-md font-mono font-semibold text-label-xs",
                variance === 0 ? "bg-status-success/10 text-status-success" : 
                variance > 0 ? "bg-status-info/10 text-status-info" : "bg-status-error/10 text-status-error"
              )} dir="ltr">
                {variance > 0 ? '+' : ''}{formatNumber(variance, locale, 3)}
              </div>
            );
          }
        },
        {
          header: t('total_value'),
          cell: (line) => {
            const variance = line.variance ?? 0;
            const varianceValue = variance * line.unitCost;
            return (
              <span className={cn("font-mono text-label-sm font-semibold", varianceValue > 0 ? "text-status-info" : varianceValue < 0 ? "text-status-error" : "text-muted-foreground/40")}>
                {formatCurrency(varianceValue, currencyCode, locale)}
              </span>
            );
          }
        },
        {
          header: t('variance_reason'),
          cell: (line) => (
            <span className="text-label-sm text-muted-foreground/60 leading-relaxed block text-start min-w-[200px]">
              {line.varianceReason || "—"}
            </span>
          )
        }
      ]}
    />
 </Card>

 {/* Rejection Dialog */}
 <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
 <DialogContent className="bg-surface-container-high border-none p-0 overflow-hidden rounded-[2rem] max-w-lg">
 <div className="p-8 space-y-6">
 <DialogHeader>
 <DialogTitle className="text-headline-lg font-semibold">{t('reject_session_title')}</DialogTitle>
 <DialogDescription className="text-muted-foreground">
 {t('reject_session_desc')}
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-3">
 <label className="text-label-xs font-semibold uppercase text-muted-foreground/50">
 {t('rejection_reason_label')}
 </label>
 <Textarea 
 value={rejectionReason}
 onChange={(e) => setRejectionReason(e.target.value)}
 placeholder={t('rejection_reason_placeholder')}
 className="min-h-[120px] bg-surface-container-lowest border-none resize-none rounded-2xl focus-visible:ring-1 focus-visible:ring-status-error/30"
 />
 <p className={cn(
 "text-label-xs font-bold transition-colors",
  rejectionReason.trim().length < 15 ? "text-status-warning" : "text-status-success"
 )}>
  {rejectionReason.trim().length} / 15 {common('characters')}
 </p>
 </div>

 <DialogFooter className="gap-3">
 <Button variant="ghost" onClick={() => setIsRejectDialogOpen(false)} className="rounded-xl">
 {common('cancel')}
 </Button>
 <Button 
 onClick={handleReject} 
  disabled={rejectionReason.trim().length < 15 || rejectStocktake.isPending}
 className="bg-status-error hover:bg-status-error/90 text-white rounded-xl px-8"
 >
 {t('confirm_rejection')}
 </Button>
 </DialogFooter>
 </div>
 </DialogContent>
 </Dialog>
 </PermissionGate>
 </div>
 )
}
