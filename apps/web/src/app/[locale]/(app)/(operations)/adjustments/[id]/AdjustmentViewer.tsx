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
import { AdjustmentDetail, AdjustmentLine } from '@/features/operations/hooks/useAdjustment';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { RelationalName } from '@/components/shared/RelationalName';

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
  }

  const documentLines = document?.lines;
  const mappedLines = useMemo(() => {
   return documentLines?.map((line: AdjustmentLine) => ({
    id: line.id,
    item: line.item,
    qty: line.qtyAdjusted,
    uomId: line.uomId,
    direction: line.direction,
    qtyBefore: line.qtyBefore,
    qtyAdjusted: line.qtyAdjusted,
    unitCost: line.unitCost,
    lot: line.lot ? {
     lotNumber: line.lot.lotNumber,
     expiryDate: line.lot.expiryDate ?? null,
    } : null,
   })) || [];
  }, [documentLines]);

  const extraColumns = useMemo(() => [
   {
    header: locale === 'ar' ? 'تكلفة الوحدة' : 'Unit Cost',
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
    header: t('direction') || 'Direction',
    cell: (line: MappedAdjustmentLine) => (
     <div className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-xs font-semibold uppercase",
      line.direction === 'INCREASE' ? "bg-muted/50 text-foreground" : "bg-red-500/10 text-red-500"
     )}>
      {line.direction === 'INCREASE' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      {t(`direction_${line.direction.toLowerCase()}`)}
     </div>
    )
   },
   {
    header: t('qty_before') || 'Qty Before',
    cell: (line: MappedAdjustmentLine) => (
     <span className="text-body-md font-bold text-muted-foreground/40" lang="en" dir="ltr">
      {formatQuantity(line.qtyBefore, locale as 'ar' | 'en')}
     </span>
    )
   },
   {
    header: tc('table_headers.lot') || 'Lot',
    cell: (line: MappedAdjustmentLine) => (
     <span className="text-body-md font-mono text-muted-foreground/60">
      {line.lot?.lotNumber || '—'}
     </span>
    )
   },
   {
    header: t('qty_after') || 'Qty After',
    cell: (line: MappedAdjustmentLine) => {
     const afterVal = line.direction === 'INCREASE'
      ? line.qtyBefore + line.qtyAdjusted
      : line.qtyBefore - line.qtyAdjusted;
     return (
      <span className={cn("text-body-md font-bold", afterVal < 0 ? "text-red-500" : "text-foreground")} lang="en" dir="ltr">
       {formatQuantity(afterVal, locale as 'ar' | 'en')}
      </span>
     );
    }
   }
  ], [t, tc, locale]);

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
   <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 print:max-w-full print:px-0 print:py-0 print:space-y-4 print:animate-none">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
     {/* Left Column */}
     <div className="lg:col-span-8 space-y-8 print:max-w-full">
      <div className="bg-card border border-border shadow-sm p-8 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 border border-surface-variant/5">
        <div className="space-y-4">
         <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase text-muted-foreground">{tc('warehouse')}</label>
          <div className="font-bold text-body-md bg-card border border-border shadow-sm p-3 rounded-lg uppercase not-italic">
           <RelationalName name={document.warehouseName} rawId={document.warehouseId} />
          </div>
         </div>

         <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase text-muted-foreground">{t('reason')}</label>
          <p className="font-bold text-body-md bg-card border border-border shadow-sm p-3 rounded-lg uppercase not-italic">{t(`reason_${document.reason.toLowerCase()}`)}</p>
         </div>
        </div>

        <div className="space-y-1.5">
         <label className="text-xs font-bold uppercase text-muted-foreground">{tc('notes')}</label>
         <div className="bg-card border border-border shadow-sm rounded-lg min-h-[120px] p-4 text-body-md not-italic font-bold text-foreground">
          {document.notes || tc('no_notes')}
         </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-card border border-border shadow-sm rounded-lg shadow-sm overflow-hidden border border-surface-variant/5">
       <div className="p-8 flex justify-between items-center">
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

     {/* Right Column */}
     <div className="lg:col-span-4 space-y-8 print-hidden">
      <div className="bg-card border border-border shadow-sm p-8 rounded-lg shadow-sm relative overflow-hidden group border border-surface-variant/5">
       <div className="absolute top-0 end-0 w-32 h-32 bg-primary/5 blur-[50px] -me-16 -mt-16 rounded-full group-hover:bg-primary/10 transition-all duration-700" />
       <div className="relative space-y-8">
        <div className="flex items-center gap-4">
         <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <History className="w-5 h-5 text-primary" />
         </div>
         <h4 className="text-xs font-bold uppercase">{tc('audit_trail')}</h4>
        </div>
        {timelineEntries.length > 0 ? (
         <div className="ps-2">
          <StatusTimeline entries={timelineEntries} />
         </div>
        ) : (
         <div className="flex flex-col items-center justify-center py-8 opacity-20 gap-3">
          <Clock className="w-10 h-10" />
          <p className="text-xs font-bold uppercase">{t('no_history')}</p>
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
