'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  ArrowUp, 
  ArrowDown, 
  History, 
  Info, 
  Clock 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatQuantity } from '@/utils/currency';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { ADJUSTMENT_STATUS } from '@/contracts/statuses';
import { AdjustmentDetail, AdjustmentLine } from '@/features/operations/hooks/useAdjustment';

interface AdjustmentViewerProps {
  document: AdjustmentDetail;
  actions?: React.ReactNode;
}

/**
 * AdjustmentViewer - Strict Immutable Rendering for Inventory Adjustments.
 */
export function AdjustmentViewer({ document, actions }: AdjustmentViewerProps) {
  const t = useTranslations('operations.adjustment');
  const tc = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();

  const adjustmentStatus = document?.status ?? ADJUSTMENT_STATUS.DRAFT;
  
  const timelineEntries = document?.timeline?.map((e: { status: string; at: string; by: string }) => ({
    status: e.status.toLowerCase() as Status,
    at: e.at,
    by: e.by
  })) || [];

  return (
    <div className="min-h-screen bg-surface-container-low">
      {/* Sticky Glass Header */}
      <div className="sticky top-0 z-40 w-full glass-header h-16 border-b border-outline-variant/10 px-6 lg:px-10 flex items-center justify-between gap-6 transition-all">
        <div className="flex items-center gap-4 overflow-hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.back()} 
            className="rounded-lg shrink-0 hover:bg-surface-container-high"
          >
            <ArrowLeft className={cn("w-5 h-5", locale === 'ar' && "rotate-180")} />
          </Button>
          <div className="flex flex-col min-w-0">
            <h1 className="text-title-lg font-semibold uppercase italic truncate">
              {document?.document_number || '...'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={adjustmentStatus as BadgeStatus} />
              <span className="text-label-xxs font-semibold uppercase text-muted-foreground/40 shrink-0">
                {format(new Date(document?.created_at || new Date()), 'yyyy-MM-dd')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {actions}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 border border-surface-variant/5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tc('warehouse')}</label>
                  <p className="font-bold text-body-md bg-surface-container-low p-3 rounded-lg uppercase italic">{document.warehouse_id === 'wh-1' ? tc('warehouses.main') : tc('warehouses.kitchen')}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('reason')}</label>
                  <p className="font-bold text-body-md bg-surface-container-low p-3 rounded-lg uppercase italic">{t(`reason_${document.reason.toLowerCase()}`)}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tc('notes')}</label>
                <div className="bg-surface-container-low rounded-lg min-h-[120px] p-4 text-body-md italic text-foreground/70">
                  {document.notes || tc('no_notes')}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden border border-surface-variant/5">
              <div className="p-8 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <h3 className="text-label-sm font-semibold uppercase">{tc('items')}</h3>
                </div>
              </div>
              <DocumentReadOnlyOverlay isPosted={true}>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low/50">
                        <th className="px-8 h-14 text-start text-label-xs font-semibold uppercase text-muted-foreground/60">{tc('item')}</th>
                        <th className="px-6 h-14 text-center text-label-xs font-semibold uppercase text-muted-foreground/60">{t('direction')}</th>
                        <th className="px-6 h-14 text-center text-label-xs font-semibold uppercase text-muted-foreground/60">{t('qty_before')}</th>
                        <th className="px-6 h-14 text-center text-label-xs font-semibold uppercase text-muted-foreground/60">{t('qty_adjusted')}</th>
                        <th className="px-6 h-14 text-center text-label-xs font-semibold uppercase text-muted-foreground/60">{t('qty_after')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-0">
                      {document.lines.map((line: AdjustmentLine) => (
                        <tr key={line.id} className="group even:bg-surface-container-low/30 hover:bg-surface-container-high/20 transition-all border-none">
                          <td className="px-8 py-6">
                            <div className="flex flex-col min-w-0">
                              <span className="text-body-md font-bold truncate">{locale === 'ar' ? line.item.name_ar : line.item.name_en}</span>
                              <span className="text-label-xs font-mono text-primary/40 uppercase mt-1">{line.item.code}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-xs font-semibold uppercase",
                              line.direction === 'INCREASE' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                            )}>
                              {line.direction === 'INCREASE' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                              {t(`direction_${line.direction.toLowerCase()}`)}
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center tabular-nums">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-body-md font-bold text-muted-foreground/40">{formatQuantity(line.qty_before, locale as 'ar' | 'en')}</span>
                              <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">{line.item.primary_uom.code}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center tabular-nums">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={cn("text-body-md font-semibold", line.direction === 'INCREASE' ? "text-emerald-500" : "text-red-500")}>
                                {line.direction === 'INCREASE' ? '+' : '−'}{formatQuantity(line.qty_adjusted, locale as 'ar' | 'en')}
                              </span>
                              <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">{line.item.primary_uom.code}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center tabular-nums">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={cn(
                                "text-body-md font-bold",
                                (line.direction === 'INCREASE' ? line.qty_before + line.qty_adjusted : line.qty_before - line.qty_adjusted) < 0 ? "text-red-500" : "text-foreground"
                              )}>
                                {formatQuantity(line.direction === 'INCREASE' ? line.qty_before + line.qty_adjusted : line.qty_before - line.qty_adjusted, locale as 'ar' | 'en')}
                              </span>
                              <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">{line.item.primary_uom.code}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DocumentReadOnlyOverlay>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm relative overflow-hidden group border border-surface-variant/5">
              <div className="absolute top-0 end-0 w-32 h-32 bg-primary/5 blur-[50px] -me-16 -mt-16 rounded-full group-hover:bg-primary/10 transition-all duration-700" />
              <div className="relative space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <History className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="text-label-xs font-semibold uppercase">{tc('audit_trail')}</h4>
                </div>
                {timelineEntries.length > 0 ? (
                  <div className="ps-2">
                    <StatusTimeline entries={timelineEntries} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 opacity-20 gap-3">
                    <Clock className="w-10 h-10" />
                    <p className="text-label-xs font-semibold uppercase">{t('no_history')}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm space-y-6 border border-surface-variant/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Info className="w-5 h-5 text-emerald-500" />
                </div>
                <h4 className="text-label-xs font-semibold uppercase">{t('document_info')}</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-surface-container-low">
                  <span className="text-label-sm text-muted-foreground">{tc('status')}</span>
                  <StatusBadge status={adjustmentStatus as BadgeStatus} />
                </div>
                {document?.posted_at && (
                  <div className="flex justify-between items-center py-3 border-b border-surface-container-low">
                    <span className="text-label-sm text-muted-foreground">{t('posted_at')}</span>
                    <span className="text-label-xs font-bold" dir="ltr">
                      {format(new Date(document.posted_at), 'yyyy-MM-dd HH:mm')}
                    </span>
                  </div>
                )}
                {document?.approved_by && (
                  <div className="flex justify-between items-center py-3 border-b border-surface-container-low">
                    <span className="text-label-sm text-muted-foreground">{t('approved_by')}</span>
                    <span className="text-label-xs font-semibold uppercase text-foreground/70">{document.approved_by}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
