'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { 
 ArrowLeft, 
 Clock, 
 User, 
 Building2, 
 Warehouse, 
 FileText,
 History,
 Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StatusTimeline, type StatusTimelineEntry } from '@/components/shared/StatusTimeline';
import { cn } from '@/lib/utils';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { useMemo, useState } from 'react';
import type { Status } from '@/components/shared/StatusTimeline';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { type KitchenRequestDetail, type KitchenRequestItem } from '@/features/operations/types/kitchen-request';
import { useSystemPrintSettings } from '@/features/admin/hooks/useSystemPrintSettings';
import { dispatchPrintJob } from '@/lib/export/printDispatcher';
import { ThermalReceipt } from '@/components/shared/ThermalReceipt';

interface KitchenRequestLineItem extends LineItem {
 fulfilledQty?: number;
 notes?: string;
}

interface KitchenRequestViewerProps {
 request: KitchenRequestDetail;
 locale: 'ar' | 'en';
 actions?: React.ReactNode;
}

export function KitchenRequestViewer({ request, locale, actions }: KitchenRequestViewerProps) {
 const t = useTranslations('operations.kitchen_request');
 const tCommon = useTranslations('common');
 const router = useRouter();
 const { data: settings, isLoading: isLoadingSettings } = useSystemPrintSettings();
 const [thermalConfig, setThermalConfig] = useState<{ paperSize: '80mm' | '58mm'; showLogo: boolean } | null>(null);

 const tableLines = useMemo((): KitchenRequestLineItem[] => {
  return request.items.map((item) => ({
   id: item.id,
   item: {
    id: item.itemId,
    code: item.itemId,
    nameEn: item.itemName,
    nameAr: item.itemName,
    primaryUom: { code: item.uom }
   },
   qty: item.quantity,
   fulfilledQty: item.fulfilledQuantity,
   uomId: '',
   lot: null,
   notes: item.notes,
  }));
 }, [request.items]);

 const history = [
  { status: 'draft' as Status, at: request.createdAt, by: request.requestedBy }
 ];
 if (request.requestedAt) {
  history.push({ status: 'submitted' as Status, at: request.requestedAt, by: request.requestedBy });
 }
 if (request.approvedAt) {
  history.push({ status: 'approved' as Status, at: request.approvedAt, by: request.approvedBy || 'Approver' });
 }
 if (request.rejectedAt) {
  history.push({ status: 'rejected' as Status, at: request.rejectedAt, by: request.rejectedBy || 'Rejecter' });
 }
 if (request.status === 'CANCELLED') {
  history.push({ status: 'cancelled' as Status, at: request.updatedAt || request.createdAt, by: request.rejectedBy || 'System' });
 }
 if (request.fulfilledAt) {
  history.push({ status: request.status.toLowerCase() as Status, at: request.fulfilledAt, by: request.fulfilledBy || 'Store Keeper' });
 }

 return (
  <div className="min-h-screen bg-card border border-border shadow-sm">
   <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
     <div className="space-y-4">
      <Breadcrumb 
       items={[
        { label: tCommon('inventory'), href: '#' },
        { label: t('title'), href: "/kitchen-requests" },
        { label: request.requestNumber }
       ]} 
      />
      <div className="flex items-center gap-4">
       <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-lg">
        <ArrowLeft className={cn("w-5 h-5", locale === 'ar' && "rotate-180")} />
       </Button>
       <div>
        <h1 className="text-headline-lg font-semibold uppercase italic">{request.requestNumber}</h1>
        <div className="flex items-center gap-3 mt-1">
         <StatusBadge status={request.status} />
         <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <ClientOnlyTime date={request.createdAt} mode="date" locale={locale} className="tabular-nums" />
         </span>
        </div>
       </div>
      </div>
     </div>

     <div className="flex items-center gap-3">
      {actions}
      <Button
       variant="outline"
       disabled={isLoadingSettings}
       className="bg-surface-container-high border-white/5 rounded-xl h-11 px-6 text-label-xs font-semibold uppercase transition-all hover:bg-surface-container-highest"
       onClick={() => dispatchPrintJob({
        docType: 'KITCHEN_REQUEST',
        doc: request,
        settings,
        locale,
        onThermalPrint: (paperSize, showLogo) => {
         setThermalConfig({ paperSize, showLogo });
        }
       })}
      >
       <Printer className="w-4 h-4 me-2" />
       {tCommon('print')}
      </Button>
     </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
     <div className="lg:col-span-8 space-y-8">
      <div className="bg-card border border-border shadow-sm p-8 rounded-lg border border-surface-container-high/20 grid grid-cols-1 md:grid-cols-3 gap-8">
       <div className="space-y-1">
        <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2">
         <Building2 className="w-3.5 h-3.5" />
         {t('department')}
        </span>
        <p className="text-body-md font-bold">{request.departmentName}</p>
       </div>
       <div className="space-y-1">
        <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2">
         <Warehouse className="w-3.5 h-3.5" />
         {t('warehouse')}
        </span>
        <p className="text-body-md font-bold">{request.warehouseName}</p>
       </div>
       <div className="space-y-1">
        <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2">
         <User className="w-3.5 h-3.5" />
         {t('requested_by')}
        </span>
        <p className="text-body-md font-bold">{request.requestedBy}</p>
       </div>
       {request.notes && (
        <div className="md:col-span-3 pt-4 border-t border-surface-container-high/50 space-y-1">
         <span className="text-label-xs font-semibold uppercase text-muted-foreground/40 flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" />
          {tCommon('notes')}
         </span>
         <p className="text-label-sm text-muted-foreground italic leading-relaxed">&quot;{request.notes}&quot;</p>
        </div>
       )}
      </div>

      <div className="bg-card border border-border shadow-sm rounded-lg border border-surface-container-high/20 overflow-hidden">
       <div className="p-8 border-b border-surface-container-high/50 flex justify-between items-center">
        <div className="flex items-center gap-4">
         <div className="w-1.5 h-6 bg-cyan-500 rounded-full" />
         <h3 className="text-label-sm font-semibold uppercase">{t('items')}</h3>
        </div>
        <Badge variant="outline" className="rounded-lg text-label-xxs font-semibold px-3 py-1 border-none bg-surface-container-high text-muted-foreground/60">
         {request.items.length} {t('entries')}
        </Badge>
       </div>
       <DocumentLineItemTable<KitchenRequestLineItem>
        lines={tableLines}
        locale={locale}
        isReadOnly={true}
        hideLotColumns={true}
        headers={{
         code: tCommon('table_headers.code'),
         name: tCommon('table_headers.name'),
         qty: tCommon('table_headers.qty'),
         uom: tCommon('table_headers.uom'),
        }}
        renderQty={(line) => (
         <span className="text-body-md font-semibold text-foreground tabular-nums">
          {line.qty}
         </span>
        )}
        renderUom={(line) => (
         <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">
          {line.item.primaryUom?.code || '---'}
         </span>
        )}
        extraColumns={[
         {
          header: t('fulfilled') || 'Fulfilled',
          cell: (line) => (
           <span className={cn(
            "text-body-md font-semibold tabular-nums",
            (line.fulfilledQty || 0) < line.qty ? "text-amber-500" : "text-foreground"
           )}>{line.fulfilledQty || 0}</span>
          )
         },
         {
          header: tCommon('notes') || 'Notes',
          cell: (line) => (
           <p className="text-label-xs font-medium text-muted-foreground/60 max-w-[200px] line-clamp-2 italic">
            {line.notes || '—'}
           </p>
          )
         }
        ]}
       />
      </div>
     </div>

     <div className="lg:col-span-4 space-y-8">
      <div className="bg-card border border-border shadow-sm p-8 rounded-lg border border-surface-container-high/20 relative overflow-hidden group">
       <div className="absolute top-0 end-0 w-32 h-32 bg-muted/50 blur-[50px] -me-16 -mt-16 rounded-full group-hover:bg-muted/50 transition-all duration-700" />
       <div className="relative space-y-8">
        <div className="flex items-center gap-4">
         <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
          <History className="w-5 h-5 text-foreground" />
         </div>
         <h4 className="text-label-xs font-semibold uppercase">{tCommon('history')}</h4>
        </div>
        <div className="ps-2">
         <StatusTimeline entries={history} />
        </div>
       </div>
      </div>
     </div>
    </div>
   </div>
   {thermalConfig && (
    <ThermalReceipt
     docType="KITCHEN_REQUEST"
     docNumber={request.requestNumber}
     date={request.createdAt}
     operator={request.requestedBy}
     department={request.departmentName}
     warehouse={request.warehouseName || ''}
     notes={request.notes}
     items={request.items.map(item => ({
      code: item.itemId,
      name: item.itemName,
      qty: item.quantity,
      uom: item.uom,
      fulfilledQty: item.fulfilledQuantity,
      notes: item.notes,
     }))}
     paperSize={thermalConfig.paperSize}
     showLogo={thermalConfig.showLogo}
     locale={locale}
     onClose={() => setThermalConfig(null)}
    />
   )}
  </div>
 );
}
