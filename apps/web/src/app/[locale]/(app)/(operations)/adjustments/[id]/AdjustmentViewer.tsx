'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useMemo } from 'react';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';
import { format } from 'date-fns';
import { 
  ArrowUp, 
  ArrowDown, 
  History, 
  Info, 
  Clock 
} from 'lucide-react';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { cn } from '@/lib/utils';
import { formatQuantity } from '@/utils/currency';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { DocumentExportMenu } from '@/components/shared/DocumentExportMenu';
import { StickyGlassHeader } from '@/components/shared/StickyGlassHeader';
import { ADJUSTMENT_STATUS } from '@/contracts/statuses';
import { AdjustmentDetail, AdjustmentLine } from '@/features/operations/hooks/useAdjustment';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { useWarehouses } from '@/features/warehouses/hooks/useWarehouses';

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

  const { data: warehousesData } = useWarehouses();
  const warehouses = warehousesData?.data || [];
  const warehouseName = document?.warehouse_id
    ? warehouses.find(w => w.id === document.warehouse_id)
    : null;

  const adjustmentStatus = document?.status ?? ADJUSTMENT_STATUS.DRAFT;
  
  const timelineEntries = document?.timeline?.map((e: { status: string; at: string; by: string }) => ({
    status: e.status.toLowerCase() as Status,
    at: e.at,
    by: e.by
  })) || [];

  interface MappedAdjustmentLine {
    id: string;
    item: AdjustmentLine['item'];
    qty: number;
    uom_id: string;
    direction: AdjustmentLine['direction'];
    qty_before: number;
    qty_adjusted: number;
  }

  const documentLines = document?.lines;
  const mappedLines = useMemo(() => {
    return documentLines?.map((line: AdjustmentLine) => ({
      id: line.id,
      item: line.item,
      qty: line.qty_adjusted,
      uom_id: line.item.primary_uom.code,
      direction: line.direction,
      qty_before: line.qty_before,
      qty_adjusted: line.qty_adjusted,
    })) || [];
  }, [documentLines]);

  const extraColumns = useMemo(() => [
    {
      header: t('direction'),
      cell: (line: MappedAdjustmentLine) => (
        <div className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-xs font-semibold uppercase",
          line.direction === 'INCREASE' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
        )}>
          {line.direction === 'INCREASE' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {t(`direction_${line.direction.toLowerCase()}`)}
        </div>
      )
    },
    {
      header: t('qty_before'),
      cell: (line: MappedAdjustmentLine) => (
        <span className="text-body-md font-bold text-muted-foreground/40">
          {formatQuantity(line.qty_before, locale as 'ar' | 'en')}
        </span>
      )
    },
    {
      header: t('qty_after'),
      cell: (line: MappedAdjustmentLine) => {
        const afterVal = line.direction === 'INCREASE' 
          ? line.qty_before + line.qty_adjusted 
          : line.qty_before - line.qty_adjusted;
        return (
          <span className={cn("text-body-md font-bold", afterVal < 0 ? "text-red-500" : "text-foreground")}>
            {formatQuantity(afterVal, locale as 'ar' | 'en')}
          </span>
        );
      }
    }
  ], [t, locale]);

  return (
    <div className="min-h-screen bg-surface-container-low print:bg-white print:min-h-0">
      <style jsx global>{`
        @media print {
          @page { margin: 1.5cm; size: A4 portrait; }
          body { background: white !important; }
        }
      `}</style>
      {/* Print-Only Voucher Header */}
      <div className="hidden print:block p-6 border-b-2 border-gray-300 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold uppercase">Warehouse Adjustment Voucher</h1>
            <p className="text-sm text-gray-600 mt-1">{document?.document_number || ''}</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>{document?.created_at ? format(new Date(document.created_at), 'PPP') : ''}</p>
          </div>
        </div>
      </div>
      <StickyGlassHeader
        title={<span className="italic">{document?.document_number || '...'}</span>}
        statusBadge={
          <>
            <StatusBadge status={adjustmentStatus as BadgeStatus} />
            <ClientOnlyTime 
              date={document?.created_at} 
              mode="date" 
              locale={locale as 'ar' | 'en'}
              className="text-label-xxs font-semibold uppercase text-muted-foreground/40 shrink-0"
            />
          </>
        }
        actions={
          <>
            <DocumentExportMenu />
            {actions}
          </>
        }
        onBack={() => router.back()}
      />

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 print:max-w-full print:px-0 print:py-0 print:space-y-4 print:animate-none">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-8 print:max-w-full">
            <div className="bg-surface-container-lowest p-8 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 border border-surface-variant/5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-label-xs font-semibold uppercase text-muted-foreground/40">{tc('warehouse')}</label>
                  <p className="font-bold text-body-md bg-surface-container-low p-3 rounded-lg uppercase italic">{warehouseName ? (locale === 'ar' ? warehouseName.name_ar : warehouseName.name_en) : document.warehouse_id}</p>
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
                <DocumentLineItemTable
                  lines={mappedLines}
                  isReadOnly={true}
                  hideLotColumns={true}
                  headers={{ qty: t('qty_adjusted') }}
                  renderQty={(line) => (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={cn("text-body-md font-semibold", line.direction === 'INCREASE' ? "text-emerald-500" : "text-red-500")}>
                        {line.direction === 'INCREASE' ? '+' : '−'}{formatQuantity(line.qty_adjusted, locale as 'ar' | 'en')}
                      </span>
                    </div>
                  )}
                  extraColumns={extraColumns}
                />
              </DocumentReadOnlyOverlay>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-8 print:hidden">
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
                    <ClientOnlyTime 
                      date={document.posted_at} 
                      mode="datetime" 
                      locale={locale as 'ar' | 'en'}
                      className="text-label-xs font-bold"
                    />
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
