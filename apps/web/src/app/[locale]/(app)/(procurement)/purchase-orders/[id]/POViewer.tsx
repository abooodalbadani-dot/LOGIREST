'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';

import { User, Wallet, Warehouse, Clock, FileText, ArrowLeft, History, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { DocumentExportMenu } from '@/components/shared/DocumentExportMenu';
import { StickyGlassHeader } from '@/components/shared/StickyGlassHeader';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { formatCurrency } from '@/utils/currency';
import { type PODetail, type POLine, type AuditLog } from '@/features/purchasing/hooks/usePO';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';

interface POViewerProps {
 document: PODetail;
 locale: 'ar' | 'en';
 actions?: React.ReactNode;
}

/**
 * POViewer - Strict Immutable Rendering for Purchase Orders.
 * This component handles strictly read-only display of a PO.
 */
export function POViewer({ document, locale, actions }: POViewerProps) {
 const t = useTranslations('procurement.po');
 const tCommon = useTranslations('common');
 const router = useRouter();

 const timeline = document?.auditLog?.map((log: AuditLog) => ({
  status: log.status.toLowerCase() as Status,
  at: log.createdAt,
  by: log.userName || tCommon('system')
 })) || [];

 interface MappedPOLine {
  id: string;
  item: {
   id: string;
   code: string;
   nameAr: string;
   nameEn: string;
   primaryUom: { code: string };
  };
  qty: number;
  uomId: string;
  unitCost: number;
 }

 const documentLines = document?.lines;
 const mappedLines = React.useMemo(() => {
  return documentLines?.map((line: POLine, idx: number) => ({
   id: line.id || String(idx),
   item: {
    id: line.itemId || '',
    code: line.item?.code || line.itemSku || line.itemId || '',
    nameAr: line.item?.nameAr || line.itemName || '',
    nameEn: line.item?.nameEn || line.itemName || '',
    primaryUom: { code: line.item?.primaryUom?.code || line.uomId || 'EA' }
   },
   qty: line.quantity ?? 0,
   uomId: line.uomId || 'EA',
   unitCost: line.unitPrice ?? 0
  })) || [];
 }, [documentLines]);

 const currencyCode = document?.currencyCode || 'USD';
 const extraColumns = React.useMemo(() => [
  {
   header: t('unit_price'),
   cell: (line: MappedPOLine) => (
    <span dir="ltr" className="font-mono text-label-sm font-bold text-operational-cyan">
     {formatCurrency(line.unitCost, currencyCode, locale)}
    </span>
   )
  },
  {
   header: tCommon('subtotal') || 'Subtotal',
   cell: (line: MappedPOLine) => (
    <span dir="ltr" className="font-mono text-body-md font-semibold text-foreground">
     {formatCurrency((line.qty || 0) * (line.unitCost || 0), currencyCode, locale)}
    </span>
   )
  }
 ], [t, tCommon, currencyCode, locale]);

 return (
  <div className="space-y-10 w-full bg-card border border-border shadow-sm min-h-screen p-6 lg:p-10 animate-in fade-in duration-500">
   <StickyGlassHeader
    title={
     <div className="flex items-center gap-3">
      <div className="p-2 rounded-xl bg-primary/10 text-primary">
       <Package className="w-4 h-4" />
      </div>
      {t('detail_title')}
     </div>
    }
    statusBadge={
     <span className="font-mono text-label-xs font-semibold text-muted-foreground/60">
      {tCommon('read_only_view')} • {document.documentNumber}
     </span>
    }
    actions={
     <div className="flex items-center gap-3">
      <StatusBadge status={document.status as BadgeStatus} />
      <DocumentExportMenu />
      {actions && (
       <>
        <div className="w-px h-8 bg-surface-variant/10 mx-1" />
        {actions}
       </>
      )}
     </div>
    }
   />

   <DocumentReadOnlyOverlay isPosted={document?.status === 'POSTED'}>
    <div className="space-y-10">
     {/* Header Stats */}
     <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[
       { label: tCommon('supplier'), value: document?.supplierName || document?.supplierId, icon: User, color: 'text-primary' },
       { label: tCommon('order_currency'), value: document?.currencyCode || document?.currencyId, icon: Wallet, color: 'text-operational-cyan' },
       { label: t('target_warehouse'), value: document?.warehouseName || document?.targetWarehouseId, icon: Warehouse, color: 'text-emerald-500' },
       { label: t('expected_delivery_date'), value: document?.expectedDeliveryDate || '—', icon: Clock, color: 'text-amber-500' },
      ].map((item, idx) => (
       <Card key={idx} className="p-5 bg-card border border-border shadow-sm border-none shadow-sm flex flex-col gap-3 rounded-2xl relative overflow-hidden group">
        <div className="flex items-center justify-between relative z-10">
         <div className={cn("w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center", item.color)}>
          <item.icon className="w-5 h-5" />
         </div>
         <span className="text-label-xxs font-semibold text-muted-foreground/30 uppercase">{item.label}</span>
        </div>
        <div className="flex flex-col relative z-10">
         <span className="text-title-sm font-semibold text-foreground line-clamp-1">{item.value}</span>
        </div>
       </Card>
      ))}
     </div>

     {/* Items Table */}
     <div className="space-y-6">
      <div className="flex items-center gap-4 px-2">
       <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
        <FileText className="w-4 h-4" />
       </div>
       <div>
        <h3 className="text-label-xs font-semibold uppercase text-muted-foreground/70">{tCommon('items')}</h3>
        <p className="text-label-xxs font-semibold text-muted-foreground/30 uppercase mt-0.5">{tCommon('order_details')}</p>
       </div>
      </div>

      <Card className="bg-card border border-border shadow-sm rounded-[2rem] overflow-hidden border border-surface-variant/5 shadow-sm p-1">
       <DocumentLineItemTable
        lines={mappedLines}
        isReadOnly={true}
        hideLotColumns={true}
        extraColumns={extraColumns}
       />

       <div className="p-8 bg-card border border-border shadow-sm/30 border-t border-outline-variant/50 flex justify-end">
        <div className="flex items-center gap-10">
         <div className="flex flex-col items-end">
          <p className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('order_total')}</p>
          <p dir="ltr" className="text-headline-lg font-semibold text-primary">
           {formatCurrency(document?.total || 0, currencyCode, locale)}
          </p>
         </div>
        </div>
       </div>
      </Card>
     </div>
    </div>
   </DocumentReadOnlyOverlay>

   {/* Footer / History */}
   <div className="space-y-10">
    {timeline.length > 0 && (
     <div className="bg-card border border-border shadow-sm p-8 rounded-[2rem] shadow-sm border border-surface-variant/5 transition-all">
      <div className="flex items-center gap-3 mb-10">
       <History className="w-4 h-4 text-primary opacity-20" />
       <h3 className="text-label-xs font-semibold uppercase text-primary/30">{tCommon('audit_trail')}</h3>
      </div>
      <StatusTimeline entries={timeline} />
     </div>
    )}

    <div className="flex items-center justify-between pt-12 mt-12 border-t border-surface-variant/10">
     <Button
      variant="ghost"
      type="button"
      onClick={() => router.back()}
      className="text-label-xs font-semibold uppercase text-muted-foreground/40 hover:text-foreground hover:bg-surface-container-high/50 h-12 px-8 rounded-xl transition-all"
     >
      <ArrowLeft className="w-3.5 h-3.5 me-2" />
      {tCommon('back')}
     </Button>
    </div>
   </div>
  </div>
 );
}
