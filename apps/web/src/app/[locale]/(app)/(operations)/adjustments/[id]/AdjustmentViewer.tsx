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
import { ADJUSTMENT_STATUS } from '@logirest/shared-types';
import type { AdjustmentDetail, AdjustmentLine } from '@/features/operations/hooks/useAdjustment';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';

import { RelationalName } from '@/components/shared/RelationalName';
import { useItems } from '@/features/items/hooks/useItems';
import { getScaledQtyBefore } from '@/utils/uom-helper';


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
  const tp = useTranslations('print');
  const locale = useLocale();
  const router = useRouter();


  const adjustmentStatus = document?.status ?? ADJUSTMENT_STATUS.DRAFT;

  const timelineEntries = useMemo(() => {
    if (document?.timeline && document.timeline.length > 0) {
      return document.timeline.map((e: { status: string; at: string; by: string }) => ({
        status: e.status.toLowerCase() as Status,
        at: e.at,
        by: e.by
      }));
    }
    if (!document) return [];
    const docAny = document as unknown as Record<string, unknown>;
    const h: { status: Status; at: string; by: string }[] = [
      { status: 'draft' as Status, at: (docAny.createdAt as string) ?? '', by: (docAny.createdBy as string) ?? tc('system_user') }
    ];
    const currentStatusNorm = (document.status || '').toLowerCase();
    if (currentStatusNorm !== 'draft' && currentStatusNorm !== 'posted') {
      h.push({
        status: (currentStatusNorm.includes('submitted') ? 'submitted' : currentStatusNorm) as Status,
        at: (docAny.updatedAt as string) || (docAny.createdAt as string) || '',
        by: (docAny.createdBy as string) || tc('system_user')
      });
    }
    if (currentStatusNorm === 'posted' || docAny.postedAt) {
      h.push({
        status: 'posted' as Status,
        at: (docAny.postedAt as string) || (docAny.updatedAt as string) || (docAny.createdAt as string) || '',
        by: (docAny.postedBy as string) || (docAny.createdBy as string) || tc('system_user')
      });
    }
    return h;
  }, [document, tc]);

  interface MappedAdjustmentLine extends LineItem {
    direction: AdjustmentLine['direction'];
    qtyBefore: number;
    qtyAdjusted: number;
    unitCost?: number | null;
    snapshotQtyBefore?: number | null;
    displayLot?: string;
  }

  const documentLines = document?.lines;
  const mappedLines = useMemo(() => {
    return documentLines?.map((line: AdjustmentLine) => {
      // Prefer the typed `lot` relation for lot number display.
      // Fall back to lotAllocations if relation object is absent.
      const allocLotId = line.lotAllocations?.[0]?.lotId;
      const displayLot = line.lot?.lotNumber || allocLotId || '';

      return {
        id: line.id,
        item: line.item,
        qty: line.qtyAdjusted,
        uomId: line.uomId,
        uom: line.uom || (line.item?.primaryUom ? { id: line.item.primaryUom.id, code: line.item.primaryUom.code, name: line.item.primaryUom.code } : undefined),
        direction: line.direction,
        // qtyBefore is computed by the backend:
        //   DRAFT  → live warehouseItem.qtyOnHand
        //   non-DRAFT → frozen snapshotQtyBefore
        qtyBefore: line.qtyBefore,
        qtyAdjusted: line.qtyAdjusted,
        snapshotQtyBefore: line.snapshotQtyBefore,
        unitCost: line.unitCost,
        lot: line.lot
          ? { lotNumber: line.lot.lotNumber, expiryDate: line.lot.expiryDate ?? null }
          : null,
        displayLot,
      };
    }) || [];
  }, [documentLines]);


  const { data: itemsData } = useItems({ limit: 1000 });
  const items = itemsData?.data || [];

  const extraColumns = useMemo(() => [
    {
      header: t('direction') || 'Direction',
      headerClassName: 'min-w-[120px] text-center whitespace-nowrap',
      cellClassName: 'min-w-[120px] text-center',
      cell: (line: MappedAdjustmentLine) => (
        <div className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-xs font-semibold uppercase whitespace-nowrap",
          line.direction === 'INCREASE' ? "bg-muted/50 text-foreground" : "bg-red-500/10 text-red-500"
        )}>
          {line.direction === 'INCREASE' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {t(`direction_${line.direction.toLowerCase()}`)}
        </div>
      )
    },
    {
      header: locale === 'ar' ? 'تكلفة الوحدة' : 'Unit Cost',
      headerClassName: 'min-w-[110px] text-center whitespace-nowrap',
      cellClassName: 'min-w-[110px] text-center',
      cell: (line: MappedAdjustmentLine) => (
        <span className="text-body-md font-bold text-foreground">
          {line.direction === 'INCREASE'
            ? (line.unitCost !== null && line.unitCost !== undefined
              ? formatQuantity(line.unitCost, locale as 'ar' | 'en')
              : '0')
            : '—'}
        </span>
      )
    },
    {
      header: t('qty_before') || 'Qty Before',
      headerClassName: 'min-w-[100px] text-center whitespace-nowrap',
      cellClassName: 'min-w-[100px] text-center',
      cell: (line: MappedAdjustmentLine) => {
        const scaledQtyBefore = getScaledQtyBefore(
          line.qtyBefore,
          line.uomId,
          line.item,
          items,
        );
        return (
          <span className="text-body-md font-bold text-muted-foreground/60" lang="en" dir="ltr">
            {formatQuantity(scaledQtyBefore, locale as 'ar' | 'en')}
          </span>
        );
      }
    },
    {
      header: t('qty_after') || 'Qty After',
      headerClassName: 'min-w-[100px] text-center whitespace-nowrap',
      cellClassName: 'min-w-[100px] text-center',
      cell: (line: MappedAdjustmentLine) => {
        const scaledQtyBefore = getScaledQtyBefore(
          line.qtyBefore,
          line.uomId,
          line.item,
          items,
        );
        const afterVal = line.direction === 'INCREASE'
          ? scaledQtyBefore + line.qtyAdjusted
          : scaledQtyBefore - line.qtyAdjusted;
        return (
          <span className={cn("text-body-md font-bold", afterVal < 0 ? "text-red-500" : "text-foreground")} lang="en" dir="ltr">
            {formatQuantity(afterVal, locale as 'ar' | 'en')}
          </span>
        );
      }
    },
    {
      header: tc('table_headers.lot') || 'Lot',
      headerClassName: 'min-w-[170px] max-w-[195px] text-center whitespace-nowrap',
      cellClassName: 'min-w-[170px] max-w-[195px] text-center',
      cell: (line: MappedAdjustmentLine) => {
        const lotVal = line.displayLot || '—';
        return (
          <span className="font-mono text-[11px] md:text-xs font-bold text-brand-gold bg-brand-gold/10 px-2.5 py-1 rounded-lg border border-brand-gold/20 truncate inline-block max-w-[170px]" title={lotVal}>
            {lotVal}
          </span>
        );
      }
    }
  ], [t, tc, locale, items]);


  return (
    <div className="min-h-screen print:bg-card print:min-h-0">
      {/* Print-Only Voucher Header */}
      <div className="print-only print-header p-6 border-b-2 border-gray-300 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold uppercase">{tp('adjustment_voucher_title')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{document?.documentNumber || ''}</p>
          </div>
          <div className="text-end text-sm text-muted-foreground">
            <p>{document?.createdAt ? format(new Date(document.createdAt), 'PPP') : ''}</p>
          </div>
        </div>
      </div>
      <StickyGlassHeader
        title={<span className="not-italic font-bold">{document?.documentNumber || '...'}</span>}
        statusBadge={
          <>
            <StatusBadge status={adjustmentStatus as BadgeStatus} />
            <ClientOnlyTime
              date={document?.createdAt}
              mode="date"
              locale={locale as 'ar' | 'en'}
              className="text-label-xxs font-semibold uppercase text-muted-foreground/40 shrink-0"
            />
          </>
        }
        actions={
          <>
            <DocumentExportMenu documentType="ADJUSTMENT" documentId={document?.id} documentNumber={document?.documentNumber} />
            {actions}
          </>
        }
        onBack={() => router.back()}
      />

      {/* Main Content */}
      <div className="max-w-[1920px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000 print:max-w-full print:px-0 print:py-0 print:space-y-4 print:animate-none">
        <div className="grid grid-cols-1 gap-6 print:block">
          {/* Full-Width Merged Container (Metadata + Audit Trail + Items Table) */}
          <div className="col-span-12 space-y-6 print:max-w-full">
            {/* Mobile & Desktop Metadata Card + Audit Trail Header */}
            <div className="bg-card border border-border rounded-[var(--radius-lg)] p-4 md:p-6 mb-6 flex flex-col gap-6">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-body-md font-bold uppercase text-foreground">{tc('details_section') || 'Document Details'}</h3>
                  <span className="text-xs text-muted-foreground">{document.documentNumber}</span>
                </div>

                {timelineEntries.length > 0 && (
                  <div className="w-full xl:w-auto bg-surface-container-highest/20 backdrop-blur-md border border-brand-gold/20 rounded-2xl px-3 py-2 sm:px-4 sm:py-2 flex items-center gap-3 overflow-hidden min-w-0">
                    <div className="flex items-center gap-1.5 shrink-0 text-brand-gold">
                      <History className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-wider hidden sm:inline">
                        {tc("audit_trail")}:
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
                      <StatusTimeline entries={timelineEntries} orientation="horizontal" />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground block font-medium uppercase mb-1">{tc('warehouse')}</span>
                  <span className="text-sm font-semibold text-foreground">
                    <RelationalName name={document.warehouseName} rawId={document.warehouseId} />
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-medium uppercase mb-1">{t('reason')}</span>
                  <span className="text-sm font-semibold text-foreground uppercase">
                    {t(`reason_${document.reason.toLowerCase()}`)}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground block font-medium uppercase mb-1">{tc('notes')}</span>
                  <p className="text-sm text-foreground break-words">{document.notes || tc('no_notes')}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-card border border-border shadow-sm rounded-xl overflow-x-auto w-full border-surface-variant/5">
              <div className="p-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <h3 className="text-label-sm font-semibold uppercase">{tc('items')}</h3>
                </div>
              </div>
              <DocumentReadOnlyOverlay isPosted={document?.status === 'POSTED'}>
                <DocumentLineItemTable<MappedAdjustmentLine>
                  lines={mappedLines}
                  isReadOnly={true}
                  hideLotColumns={true}
                  noCollapse={false}
                  mobileLayoutPattern="adjustment-form"
                  headers={{ qty: t('qty_adjusted') }}
                  renderQty={(line) => (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className={cn("text-body-md font-semibold", line.direction === 'INCREASE' ? "text-foreground" : "text-red-500")}>
                        {line.direction === 'INCREASE' ? '+' : '−'}{formatQuantity(line.qtyAdjusted, locale as 'ar' | 'en')}
                      </span>
                    </div>
                  )}
                  extraColumns={extraColumns}
                />
              </DocumentReadOnlyOverlay>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
