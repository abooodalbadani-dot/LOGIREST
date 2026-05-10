"use client"

import * as React from "react";
import { useStocktake, useSubmitVariance } from "@/features/operations/api/useStocktakes";
import { useWarehouses } from "@/features/warehouses/api/useWarehouses";
import { mapToSessionVM } from "@/features/operations/mappers/stocktakeMapper";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { 
 AlertTriangle, 
 CheckCircle2 
} from "lucide-react";
import { STOCKTAKE_STATUS } from "@/contracts/statuses";
import { isStocktakeInReview } from "@/domain/status-guards";
import { STOCKTAKE_STATUS_UI } from "@/domain/status-ui-map";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { toast } from "sonner";
import { useUnsavedChangesGuard } from "@/lib/unsaved-changes/useUnsavedChangesGuard";

import { cn } from "@/lib/utils";
import { formatQuantity, formatCurrency } from "@/utils/currency";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { PostConfirmDialog } from "@/components/shared/PostConfirmDialog";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";

export function StocktakeVarianceClient({ id, locale }: { id: string, locale: 'ar' | 'en' }) {
 const t = useTranslations('operations.stocktake')
 const common = useTranslations('common')
 const baseRouter = useRouter()
 const { data: rawSession, isLoading, error } = useStocktake(id);
 const session = rawSession ? mapToSessionVM(rawSession) : null;
 const { data: warehouses } = useWarehouses();
 const submitVariance = useSubmitVariance();

 const [reasons, setReasons] = React.useState<Record<string, string>>({})

  const isInitialized = React.useRef(false)
  React.useEffect(() => {
    if (session?.items && !isInitialized.current) {
      const initialReasons: Record<string, string> = {}
      session.items.forEach(item => {
        if (item.varianceReason) {
          initialReasons[item.id] = item.varianceReason
        }
      })
      setReasons(initialReasons)
      isInitialized.current = true
    }
  }, [session?.items])

 if (isLoading) return <PageSkeleton variant="list" />;
 if (!session) return <ErrorState onRetry={() => window.location.reload()} />;

 const warehouse = warehouses?.find(w => w.id === session.warehouseId);
 const warehouseName = warehouse ? (locale === 'ar' ? warehouse.nameAr : warehouse.nameEn) : (session.warehouseName || session.warehouseId);
 const currencyCode = 'SAR';

 const itemsWithVariance = session.items.filter(i => (i.countedQty || 0) - (i.snapshotQty ?? 0) !== 0);
 const totalPositiveVariance = session.items.reduce((acc, i) => {
   const diff = (i.countedQty || 0) - (i.snapshotQty ?? 0);
   return diff > 0 ? acc + (diff * i.unitCost) : acc;
 }, 0);
 const totalNegativeVariance = session.items.reduce((acc, i) => {
   const diff = (i.countedQty || 0) - (i.snapshotQty ?? 0);
   return diff < 0 ? acc + (Math.abs(diff) * i.unitCost) : acc;
 }, 0);
 const netImpact = totalPositiveVariance - totalNegativeVariance;

 const isDirty = React.useMemo(() => {
   return session.items.some(item => {
     const currentReason = reasons[item.id] || "";
     const originalReason = item.varianceReason || "";
     return currentReason !== originalReason;
   });
 }, [reasons, session.items]);

  // Status check: Must be in REVIEW
  if (!isStocktakeInReview(session.status)) {
    baseRouter.replace(`/stocktake/${id}`);
    return null;
  }

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  const handleReasonChange = (lineId: string, value: string) => {
    setReasons(prev => ({ ...prev, [lineId]: value }))
  }

  const isReasonValid = (lineId: string, variance: number) => {
    if (variance === 0) return true
    const reason = reasons[lineId] || ""
    return reason.trim().length >= 10
  }

  const canSubmit = session.items.every(item => {
    const variance = (item.countedQty || 0) - (item.snapshotQty ?? 0)
    return isReasonValid(item.id, variance)
  })

  const handleSubmit = () => {
    const updates = session.items.map(item => ({
      line_id: item.id,
      variance_reason: reasons[item.id] || ""
    }))

    submitVariance.mutate(
      { id, items: updates },
      {
        onSuccess: () => {
          toast.success(t('posted_success_variance'))
          guardedRouter.push(`/stocktake/${id}`, { skipGuard: true })
        },
        onError: () => {
          toast.error(common('error'))
        }
      }
    )
  }

 return (
 <PermissionGate action="edit" resource="operations_stocktake">
 <div className="space-y-6">
 <PageHeader
 title={t('variance_review')}
 subtitle={`${warehouseName} ${common('dash')} ${t('variance_review_desc')}`}
 backHref={`/stocktake/${id}/count`}
 >
 <div className="flex items-center gap-4">
  <StatusBadge 
    status={session.status} 
    configMap={STOCKTAKE_STATUS_UI}
    className="h-9 px-4 text-label-xs font-semibold border-none" 
  />
 <PostConfirmDialog
 title={t('confirm_variance_title')}
 description={t('confirm_variance_desc')}
 onConfirm={handleSubmit}
 trigger={
 <Button disabled={!canSubmit || submitVariance.isPending} className="primary-gradient shadow-lg shadow-primary/20">
 {t('submit_for_approval')}
 </Button>
 }
 />
 </div>
 </PageHeader>

 <div className="grid grid-cols-5 gap-4">
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

 <Card className="p-10 bg-surface-container-low border-none shadow-none rounded-[2.5rem]">
 <div className="rounded-3xl bg-white/[0.01] overflow-hidden">
 <Table>
 <TableHeader className="bg-white/[0.02]">
 <TableRow className="hover:bg-transparent border-none">
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 h-12 px-8 w-[25%]">{common('item')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t('snapshot_qty')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t('counted_qty')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t('variance')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 text-center h-12">{t('variance_value')}</TableHead>
 <TableHead className="text-label-xs font-semibold uppercase text-muted-foreground/40 h-12 w-[30%]">{t('variance_reason')}</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {session.items.map((item) => {
 const counted = item.countedQty || 0
 const variance = counted - (item.snapshotQty ?? 0)
 const varianceValue = variance * item.unitCost
 const hasVariance = variance !== 0
  const reasonError = hasVariance && !isReasonValid(item.id, variance)

 return (
 <TableRow key={item.id} className={cn("transition-colors border-none group", hasVariance ? "bg-amber-500/[0.02] hover:bg-amber-500/[0.04]" : "hover:bg-white/[0.01]")}>
 <TableCell className="px-8 py-6">
 <div className="flex flex-col gap-1">
 <span className="font-bold text-foreground group-hover:text-primary transition-colors">{item.itemName}</span>
 <span className="text-label-xs font-semibold text-muted-foreground/40 font-mono" dir="ltr">{item.barcode}</span>
 </div>
 </TableCell>
  <TableCell className="text-center font-mono text-label-sm font-bold text-muted-foreground/60" dir="ltr">
 {formatQuantity(item.snapshotQty, locale)} {item.uom}
 </TableCell>
 <TableCell className="text-center font-mono text-label-sm font-semibold text-foreground" dir="ltr">
 {formatQuantity(counted, locale)} {item.uom}
 </TableCell>
 <TableCell className="text-center">
 <div className={cn(
 "inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-semibold text-label-xs",
 variance === 0 ? "bg-emerald-500/10 text-emerald-500" : 
 variance > 0 ? "bg-blue-500/10 text-blue-500" : 
 "bg-red-500/10 text-red-500"
 )} dir="ltr">
 {variance === 0 ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
 {variance > 0 ? '+' : ''}{formatQuantity(variance, locale)}
 </div>
 </TableCell>
 <TableCell className="text-center">
 <div className={cn(
 "font-mono text-label-sm font-semibold",
 varianceValue === 0 ? "text-muted-foreground/40" : 
 varianceValue > 0 ? "text-blue-500" : "text-red-500"
 )} dir="ltr">
 {formatCurrency(varianceValue, currencyCode, locale)}
 </div>
 </TableCell>
 <TableCell>
 {hasVariance ? (
 <div className="space-y-1.5">
                    <Textarea
                      value={reasons[item.id] || ""} 
                      onChange={(e) => handleReasonChange(item.id, e.target.value)}
                      placeholder={t('mandatory_reason')}
                      className={cn(
                        "min-h-[80px] text-body-md bg-surface-container-medium border-none resize-none transition-all rounded-xl focus-visible:ring-1 focus-visible:ring-primary/30",
                        reasonError ? "bg-amber-500/10 focus-visible:ring-amber-500/50" : ""
                      )}
                    />
 {reasonError && (
 <p className="text-label-xs text-amber-500 font-medium animate-in fade-in slide-in-from-top-1">
 {t('validation.variance_reason_min')}
 </p>
 )}
 </div>
 ) : (
 <div className="text-label-sm text-muted-foreground italic flex items-center gap-1.5 justify-center">
 <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />
 {t('no_variance_recorded')}
 </div>
 )}
 </TableCell>
 </TableRow>
 )
 })}
 </TableBody>
 </Table>
 </div>
 </Card>
 </div>
 </PermissionGate>
 )
}
