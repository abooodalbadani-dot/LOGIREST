"use client"

import * as React from "react";
import { useStocktake, useApproveStocktake, useRejectStocktake } from "@/features/operations/api/useStocktakes";
import { useWarehouses } from "@/features/warehouses/api/useWarehouses";
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
import { canPerformActionV2, type DocumentStatus } from '@/core/workflow/document-engine';

import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/utils/currency";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { STOCKTAKE_STATUS_UI } from "@/domain/status-ui-map";
import { MetricCard } from "@/components/ui/metric-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export function StocktakeApproveClient({ id, locale }: { id: string, locale: 'ar' | 'en' }) {
 const t = useTranslations('operations.stocktake')
 const common = useTranslations('common')
 const router = useRouter()
 const { user } = useAuth();
 
 const { data: session, isLoading, error } = useStocktake(id);
 const { data: warehouses } = useWarehouses();
 const approveStocktake = useApproveStocktake();
 const rejectStocktake = useRejectStocktake();

 const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false);
 const [rejectionReason, setRejectionReason] = React.useState("");

 // Access Control: Enforce role and workflow status via engine
 const canApprove = React.useMemo(() => {
  if (!session || !user) return false;
  return canPerformActionV2('STOCKTAKE', session.status as DocumentStatus, 'APPROVE', user.role);
 }, [session, user]);

 if (isLoading) return <LoadingSkeleton />
 if (error || !session) return <ErrorState onRetry={() => window.location.reload()} />

 if (!canApprove) {
  router.replace(`/stocktake/${id}`);
  return null;
 }

 const warehouse = warehouses?.find(w => w.id === session.warehouse_id);
 const warehouseName = warehouse ? (locale === 'ar' ? warehouse.nameAr : warehouse.nameEn) : (session.warehouse_name || session.warehouse_id);
 const currencyCode = 'SAR'; // Base currency

 // Calculations
 const itemsWithVariance = session.items.filter(item => (item.variance || 0) !== 0);
 const totalPositiveVariance = session.items.reduce((acc, item) => {
 const variance = item.variance || 0;
 return variance > 0 ? acc + (variance * item.unit_cost) : acc;
 }, 0);
 const totalNegativeVariance = session.items.reduce((acc, item) => {
 const variance = item.variance || 0;
 return variance < 0 ? acc + (Math.abs(variance) * item.unit_cost) : acc;
 }, 0);
 const netImpact = totalPositiveVariance - totalNegativeVariance;

 const handleApprove = () => {
  approveStocktake.mutate(
   { id },
   {
    onSuccess: () => {
     toast.success(t('approved_success'));
     router.push(`/stocktake/${id}`);
    },
    onError: () => {
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
     toast.success(t('rejected_success'));
     setIsRejectDialogOpen(false);
     router.push(`/stocktake/${id}`);
    },
    onError: () => {
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
 <Button 
 variant="outline" 
 className="border-status-error/20 text-status-error hover:bg-status-error/10 rounded-xl"
 onClick={() => setIsRejectDialogOpen(true)}
 >
 <XCircle className="w-4 h-4 me-2" />
 {t('reject_session')}
 </Button>
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
 <Card className="bg-surface-container-low border-none shadow-none rounded-[2rem] overflow-hidden">
 <div className="p-8 bg-white/[0.01]">
 <h3 className="text-body-md font-semibold uppercase text-muted-foreground/40">
 {t('variance_details_table')}
 </h3>
 </div>
 <div className="overflow-x-auto">
 <Table>
 <TableHeader className="bg-white/[0.02]">
 <TableRow className="hover:bg-transparent border-none">
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 h-12 px-8 w-[25%]">{common('item')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t('snapshot_qty')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t('counted_qty')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t('variance')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t('total_value')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 h-12 px-8">{t('variance_reason')}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {session.items.map((item) => {
  const variance = (item.counted_qty || 0) - (item.snapshot_qty ?? 0);
  const varianceValue = variance * item.unit_cost;
 
 return (
 <TableRow key={item.id} className="hover:bg-white/[0.01] transition-colors border-none group">
 <TableCell className="px-8 py-5">
 <div className="flex flex-col gap-0.5">
 <span className="font-bold text-foreground group-hover:text-primary transition-colors">{item.item_name}</span>
 <span className="text-label-xs font-semibold text-muted-foreground/30 font-mono" dir="ltr">{item.barcode}</span>
 </div>
 </TableCell>
 <TableCell className="text-center font-mono text-label-sm font-bold text-muted-foreground/60" dir="ltr">
 {formatNumber(item.snapshot_qty, locale, 3)} {item.uom}
 </TableCell>
 <TableCell className="text-center font-mono text-label-sm font-semibold text-foreground" dir="ltr">
 {formatNumber(item.counted_qty, locale, 3)} {item.uom}
 </TableCell>
 <TableCell className="text-center">
 <div className={cn(
 "inline-flex items-center px-2 py-0.5 rounded-md font-mono font-semibold text-label-xs",
 variance === 0 ? "bg-status-success/10 text-status-success" : 
 variance > 0 ? "bg-status-info/10 text-status-info" : "bg-status-error/10 text-status-error"
 )} dir="ltr">
 {variance > 0 ? '+' : ''}{formatNumber(variance, locale, 3)}
 </div>
 </TableCell>
 <TableCell className="text-center font-mono text-label-sm font-semibold" dir="ltr">
 <span className={cn(varianceValue > 0 ? "text-status-info" : varianceValue < 0 ? "text-status-error" : "text-muted-foreground/40")}>
 {formatCurrency(varianceValue, currencyCode, locale)}
 </span>
 </TableCell>
 <TableCell className="px-8">
 <span className="text-label-sm text-muted-foreground/60 leading-relaxed">
 {item.variance_reason || "—"}
 </span>
 </TableCell>
 </TableRow>
 );
 })}
 </TableBody>
 </Table>
 </div>
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
 rejectionReason.length < 15 ? "text-status-warning" : "text-status-success"
 )}>
 {rejectionReason.length} / 15 {common('characters')}
 </p>
 </div>

 <DialogFooter className="gap-3">
 <Button variant="ghost" onClick={() => setIsRejectDialogOpen(false)} className="rounded-xl">
 {common('cancel')}
 </Button>
 <Button 
 onClick={handleReject} 
 disabled={rejectionReason.length < 15 || rejectStocktake.isPending}
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
