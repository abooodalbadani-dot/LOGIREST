"use client"

import * as React from "react";
import { useStocktake, useSubmitVariance, useRecountItems } from "@/features/operations/api/useStocktakes";
import { useWarehouses } from "@/features/warehouses/hooks/useWarehouses";
import { useBaseCurrency } from "@/hooks/useBaseCurrency";
import { mapToSessionVM } from "@/features/operations/mappers/stocktakeMapper";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { 
 AlertTriangle, 
 CheckCircle2,
 Calculator,
 BarChart3,
 ArrowUpRight,
 ArrowDownRight
} from "lucide-react";
import { STOCKTAKE_STATUS } from "@logirest/shared-types";
import { isStocktakeInReview } from "@/domain/status-guards";
import { STOCKTAKE_STATUS_UI } from "@/domain/status-ui-map";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MetricCard } from "@/components/ui/metric-card";
import { toast } from "sonner";
import { useUnsavedChangesGuard } from "@/lib/unsaved-changes/useUnsavedChangesGuard";

import { cn } from "@/lib/utils";
import { formatQuantity, formatCurrency, formatNumber } from "@/utils/currency";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocumentLineItemTable, type LineItem } from "@/components/shared/DocumentLineItemTable/DocumentLineItemTable";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/PageHeader";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { PostConfirmDialog } from "@/components/shared/PostConfirmDialog";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAudioFeedback } from '@/hooks/useAudioFeedback';

interface StocktakeLineItem extends LineItem {
  snapshotQty: number | null;
  countedQty: number | null;
  uom: string;
  unitCost: number;
  varianceReason: string;
}

export function StocktakeVarianceClient({ id, locale }: { id: string, locale: 'ar' | 'en' }) {
 const t = useTranslations('operations.stocktake')
 const common = useTranslations('common')
 const baseRouter = useRouter()
 const { data: rawSession, isLoading, error } = useStocktake(id);
 const session = rawSession ? mapToSessionVM(rawSession) : null;
const { data: warehousesData } = useWarehouses(); const warehouses = warehousesData?.data || [];
  const { currency: currencyCode } = useBaseCurrency();
  const submitVariance = useSubmitVariance();
  const recountItems = useRecountItems();
  const { playSound } = useAudioFeedback();

 const tableLines = React.useMemo((): StocktakeLineItem[] => {
  if (!session) return [];
  return session.items.map((item) => ({
    id: item.id,
    item: {
      id: item.itemId,
      code: item.barcode || '',
      name_en: item.itemName,
      name_ar: item.itemName,
      primary_uom: { code: item.uom }
    },
    qty: item.countedQty ?? 0,
    uom_id: '',
    lot: null,
    snapshotQty: item.snapshotQty,
    countedQty: item.countedQty,
    uom: item.uom,
    unitCost: item.unitCost,
    varianceReason: item.varianceReason || '',
  }));
 }, [session]);

  const [reasons, setReasons] = React.useState<Record<string, string>>({})
  const [discrepanciesOnly, setDiscrepanciesOnly] = React.useState(false)

  const filteredTableLines = React.useMemo(() => {
    if (!discrepanciesOnly) return tableLines;
    return tableLines.filter(line => (line.countedQty || 0) !== (line.snapshotQty ?? 0));
  }, [tableLines, discrepanciesOnly])

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

  const isDirty = React.useMemo(() => {
    return session?.items?.some(item => {
      const currentReason = reasons[item.id] || "";
      const originalReason = item.varianceReason || "";
      return currentReason !== originalReason;
    }) ?? false;
  }, [reasons, session?.items]);

  const { router: guardedRouter } = useUnsavedChangesGuard(isDirty);

  if (isLoading) return <PageSkeleton variant="list" />;
  if (!session) return <ErrorState onRetry={() => window.location.reload()} />;

 const warehouse = warehouses?.find(w => w.id === session.warehouseId);
 const warehouseName = warehouse ? (locale === 'ar' ? warehouse.name_ar : warehouse.name_en) : (session.warehouseName || session.warehouseId);

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

  // Status check: Must be in REVIEW
  if (!isStocktakeInReview(session.status)) {
    baseRouter.replace(`/stocktake/${id}`);
    return null;
  }

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
          playSound('success');
          toast.success(t('posted_success_variance'))
          guardedRouter.push(`/stocktake/${id}`, { skipGuard: true })
        },
        onError: () => {
          playSound('error');
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
 backHref={`/stocktake/${id}`}
 >
  <div className="flex items-center gap-4">
   <StatusBadge 
     status={session.status} 
     configMap={STOCKTAKE_STATUS_UI}
     className="h-9 px-4 text-label-xs font-semibold border-none" 
   />
  <PostConfirmDialog
  title={t('partial_recount_title') || 'Request Partial Recount'}
  description={t('partial_recount_desc') || 'This will notify the counting team to recount the items with discrepancies.'}
  variant="info"
  icon="info"
  onConfirm={() => {
     const discrepancyItemIds = itemsWithVariance.map(i => i.id);
     recountItems.mutate(
       { id, itemIds: discrepancyItemIds },
       {
         onSuccess: () => {
           playSound('success');
           toast.success(t('partial_recount_requested') || 'Partial recount requested successfully');
           guardedRouter.push(`/stocktake/${id}/count`, { skipGuard: true });
         },
         onError: () => {
           playSound('error');
           toast.error(common('error'));
         }
       }
     );
   }}
  trigger={
  <Button variant="outline" size="sm" className="h-9 px-5 text-label-xs font-bold uppercase border-outline-low/20">
    {t('request_partial_recount') || 'Partial Recount'}
  </Button>
  }
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

  <div className="flex items-center gap-3 px-1">
    <Switch checked={discrepanciesOnly} onCheckedChange={setDiscrepanciesOnly} id="discrepancies-toggle" />
    <label htmlFor="discrepancies-toggle" className="text-label-xs font-bold uppercase text-muted-foreground/60 cursor-pointer select-none">
      {t('discrepancies')} Only
    </label>
  </div>

  <Card className="p-10 bg-surface-container-low border-none shadow-none rounded-[2.5rem]">
     <DocumentLineItemTable
       lines={filteredTableLines}
      locale={locale}
      isReadOnly={true}
      hideLotColumns={true}
      headers={{ qty: t('counted_qty') }}
      rowClassName={(line) => {
        const variance = (line.countedQty || 0) - (line.snapshotQty ?? 0);
        return variance !== 0 ? "bg-amber-500/[0.02] hover:bg-amber-500/[0.04]" : "";
      }}
      renderQty={(line) => (
        <span className="font-mono text-label-sm font-semibold text-foreground">
          {formatQuantity(line.countedQty, locale)}
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
              {formatQuantity(line.snapshotQty, locale)} {line.uom}
            </span>
          )
        },
        {
          header: t('variance'),
          cell: (line) => {
            const counted = line.countedQty || 0;
            const variance = counted - (line.snapshotQty ?? 0);
            return (
              <div className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono font-semibold text-label-xs",
                variance === 0 ? "bg-emerald-500/10 text-emerald-500" : 
                variance > 0 ? "bg-blue-500/10 text-blue-500" : 
                "bg-red-500/10 text-red-500"
              )} dir="ltr">
                {variance === 0 ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                {variance > 0 ? '+' : ''}{formatQuantity(variance, locale)}
              </div>
            );
          }
        },
        {
          header: t('variance_value'),
          cell: (line) => {
            const counted = line.countedQty || 0;
            const variance = counted - (line.snapshotQty ?? 0);
            const varianceValue = variance * line.unitCost;
            return (
              <div className={cn(
                "font-mono text-label-sm font-semibold",
                varianceValue === 0 ? "text-muted-foreground/40" : 
                varianceValue > 0 ? "text-blue-500" : "text-red-500"
              )} dir="ltr">
                {formatCurrency(varianceValue, currencyCode, locale)}
              </div>
            );
          }
        },
        {
          header: t('variance_reason'),
          cell: (line) => {
            const counted = line.countedQty || 0;
            const variance = counted - (line.snapshotQty ?? 0);
            const hasVariance = variance !== 0;
            const reasonError = hasVariance && !isReasonValid(line.id, variance);
            return hasVariance ? (
              <div className="space-y-1.5 text-start min-w-[200px]">
                <Textarea
                  value={reasons[line.id] || ""} 
                  onChange={(e) => {
                    const val = e.target.value.slice(0, 500);
                    handleReasonChange(line.id, val);
                  }}
                  placeholder={t('mandatory_reason')}
                  maxLength={500}
                  className={cn(
                    "min-h-[80px] text-body-md bg-surface-container-medium border-none resize-none transition-all rounded-xl focus-visible:ring-1 focus-visible:ring-primary/30",
                    reasonError ? "bg-amber-500/10 focus-visible:ring-amber-500/50" : ""
                  )}
                />
                <div className="flex items-center justify-between">
                  {reasonError && (
                    <p className="text-label-xs text-amber-500 font-medium animate-in fade-in slide-in-from-top-1">
                      {t('validation.variance_reason_min')}
                    </p>
                  )}
                  <p className={cn(
                    "text-label-xs font-bold ms-auto transition-colors",
                    (reasons[line.id] || "").trim().length >= 10 ? "text-status-success" : "text-status-warning"
                  )}>
                    {(reasons[line.id] || "").trim().length} / 500
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-label-sm text-muted-foreground italic flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />
                {t('no_variance_recorded')}
              </div>
            );
          }
        }
      ]}
    />
 </Card>
 </div>
 </PermissionGate>
 )
}
