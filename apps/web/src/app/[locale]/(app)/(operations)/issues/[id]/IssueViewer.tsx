'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { StatusTimeline, Status } from '@/components/shared/StatusTimeline';
import { ClientOnlyTime } from '@/components/shared/ClientOnlyTime';
import { 
 ArrowLeft, 
 History, 
 Info, 
 Clock,
 User,
 FileText,
 MapPin,
 Printer
} from 'lucide-react';
import { useSystemPrintSettings } from '@/features/admin/hooks/useSystemPrintSettings';
import { dispatchPrintJob } from '@/lib/export/printDispatcher';
import { ThermalReceipt } from '@/components/shared/ThermalReceipt';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { RelationalName } from '@/components/shared/RelationalName';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import type { LotAllocation, StockIssue } from '@/types/documents';

interface IssueViewerProps {
 issue: StockIssue;
 locale: 'ar' | 'en';
}

export function IssueViewer({ issue, locale }: IssueViewerProps) {
 const t = useTranslations('operations.issue');
 const tCommon = useTranslations('common');
 const router = useRouter();
 const { data: settings, isLoading: isLoadingSettings } = useSystemPrintSettings();
 const [thermalConfig, setThermalConfig] = useState<{ paperSize: '80mm' | '58mm'; showLogo: boolean } | null>(null);

 const issueStatus = issue?.status ?? 'DRAFT';
 
 // Adapt timeline entries
 const timelineEntries = [
  { status: 'draft' as Status, at: issue.createdAt ?? '', by: issue.createdBy ?? tCommon('system_user') }
 ];
 if (issue.postedAt) {
  timelineEntries.push({ status: 'posted' as Status, at: issue.postedAt, by: issue.postedBy ?? tCommon('system_user') });
 }

 const lines: LineItem[] = (issue.lines || []).map(l => ({
  id: l.id,
  item: {
   id: l.item.id,
   code: l.item.code,
   name: l.item.name,
   primaryUom: { code: l.item.primaryUom?.code || l.uomId || '' },
  },
  lot: l.lot ? { lotNumber: l.lot.lotNumber, expiryDate: l.lot.expiryDate } : null,
  qty: l.qty,
  uomId: l.uomId,
  lotAllocations: l.lotAllocations,
 }));

 return (
  <div className="min-h-screen bg-card border border-border shadow-sm">
   {/* Sticky Glass Header */}
   <div className="sticky top-0 z-40 w-full glass-header h-16 border-b border-outline-variant/10 px-6 lg:px-10 flex items-center justify-between gap-6 transition-all">
    <div className="flex items-center gap-4 overflow-hidden">
     <Button 
      variant="ghost" 
      size="icon" 
      onClick={() => router.back()} 
      className="rounded-lg shrink-0 hover:bg-surface-container-high"
      aria-label={tCommon('back')}
     >
      <ArrowLeft className={cn("w-5 h-5", locale === 'ar' && "rotate-180")} />
     </Button>
     <div className="flex flex-col min-w-0">
      <h1 className="text-title-lg font-semibold uppercase italic truncate">
       {issue?.documentNumber || '...'}
      </h1>
      <div className="flex items-center gap-2 mt-0.5">
       <StatusBadge status={issueStatus} />
       <ClientOnlyTime 
        date={issue?.createdAt || new Date()} 
        mode="date"
        className="text-label-xxs font-semibold uppercase text-muted-foreground/40 shrink-0"
       />
      </div>
     </div>
    </div>
    <div className="flex items-center gap-3 shrink-0">
     <Button
      variant="outline"
      disabled={isLoadingSettings}
      className="bg-surface-container-high border-white/5 rounded-xl h-11 px-6 text-label-xs font-semibold uppercase transition-all hover:bg-surface-container-highest"
      onClick={() => dispatchPrintJob({
       docType: 'INVENTORY_ISSUE',
       doc: issue,
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

   {/* Main Content */}
   <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
     {/* Left Column */}
     <div className="lg:col-span-8 space-y-8">
      {/* Header Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border shadow-sm p-6 rounded-lg shadow-sm space-y-3">
         <div className="flex items-center gap-2 text-primary/40">
          <MapPin className="w-4 h-4" />
          <span className="text-label-xs font-semibold uppercase">{t('destination')}</span>
         </div>
         <p className="font-bold text-body-md">
          {issue.destinationDeptId === 'dep-1' ? tCommon('departments.kitchen_1') : 
           issue.destinationDeptId === 'dep-2' ? tCommon('departments.pastry') : 
           issue.destinationDeptId || '—'}
         </p>
        </div>
        <div className="bg-card border border-border shadow-sm p-6 rounded-lg shadow-sm space-y-3">
         <div className="flex items-center gap-2 text-primary/40">
          <User className="w-4 h-4" />
          <span className="text-label-xs font-semibold uppercase">{t('requested_by')}</span>
         </div>
         <p className="font-bold text-body-md">{issue.requestedBy || '—'}</p>
        </div>
        <div className="bg-card border border-border shadow-sm p-6 rounded-lg shadow-sm space-y-3">
         <div className="flex items-center gap-2 text-primary/40">
          <Clock className="w-4 h-4" />
          <span className="text-label-xs font-semibold uppercase">{tCommon('warehouse')}</span>
         </div>
         <p className="font-bold text-body-md">
          {issue.warehouseId === 'wh-1' ? tCommon('warehouses.main') :
           issue.warehouseId || tCommon('dash')}
         </p>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-card border border-border shadow-sm rounded-lg shadow-sm overflow-hidden">
       <div className="p-8 flex justify-between items-center border-b border-outline-variant/5">
        <div className="flex items-center gap-4">
         <div className="w-1.5 h-6 bg-primary rounded-full" />
         <h3 className="text-label-sm font-semibold uppercase">{t('line_items')}</h3>
        </div>
        <div className="px-4 py-2 bg-card border border-border shadow-sm rounded-lg text-label-xs font-mono text-primary/40">
         {lines.length} {t('entries').toUpperCase()}
        </div>
       </div>
       <DocumentReadOnlyOverlay isPosted={issue.status === 'POSTED'}>
        <DocumentLineItemTable 
         lines={lines} 
         locale={locale} 
         isReadOnly={true}
         extraColumns={[
          {
           header: t('qty'),
           cell: (line) => (
            <div className="flex items-center gap-2 tabular-nums">
             <span className="text-body-md font-bold text-foreground">{line.qty}</span>
             <RelationalName 
              name={line.item.primaryUom?.code} 
              rawId={line.uomId} 
              fallback="N/A" 
              className="text-label-xs font-semibold uppercase text-primary/20" 
             />
            </div>
           )
          },
          {
           header: t('allocate'),
           cell: (line: LineItem) => {
            const lineAllocations = line.lotAllocations || [];
            return (
             <div className="flex flex-wrap gap-1.5 max-w-[200px]">
              {lineAllocations.map((alloc: LotAllocation) => (
               <div key={alloc.lotId} className="px-2.5 py-1 bg-muted/50 rounded-lg flex items-center gap-1.5">
                <span className="text-label-xxs font-mono text-foreground/80">{alloc.lotNumber}</span>
                <div className="w-1 h-1 rounded-full bg-muted/50" />
                <span className="text-label-xxs font-semibold text-foreground">{alloc.allocatedQty}</span>
               </div>
              ))}
              {lineAllocations.length === 0 && (
               <span className="text-label-xxs font-semibold uppercase text-muted-foreground/30">—</span>
              )}
             </div>
            );
           }
          }
         ]}
        />
       </DocumentReadOnlyOverlay>
      </div>

      {/* Notes Section */}
      {issue.notes && (
       <div className="bg-card border border-border shadow-sm p-8 rounded-lg shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-primary/30">
         <FileText className="w-4 h-4" />
         <h3 className="text-label-xs font-semibold uppercase">{t('operational_notes')}</h3>
        </div>
        <div className="bg-card border border-border shadow-sm p-6 rounded-xl border border-outline-variant/5">
         <p className="text-body-md text-foreground/70 italic leading-relaxed">
          {issue.notes}
         </p>
        </div>
       </div>
      )}
     </div>

     {/* Right Column */}
     <div className="lg:col-span-4 space-y-8">
      {/* History Section */}
      <div className="bg-card border border-border shadow-sm p-8 rounded-lg shadow-sm relative overflow-hidden group">
       <div className="absolute top-0 end-0 w-32 h-32 bg-primary/5 blur-[50px] -me-16 -mt-16 rounded-full group-hover:bg-primary/10 transition-all duration-700" />
       <div className="relative space-y-8">
        <div className="flex items-center gap-4">
         <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <History className="w-5 h-5 text-primary" />
         </div>
         <h4 className="text-label-xs font-semibold uppercase">{t('status_history')}</h4>
        </div>
        <div className="ps-2">
         <StatusTimeline entries={timelineEntries} />
        </div>
       </div>
      </div>

      {/* Audit Info */}
      <div className="bg-card border border-border shadow-sm p-8 rounded-lg shadow-sm space-y-6">
       <div className="flex items-center gap-4 border-b border-outline-variant/5 pb-4">
        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
         <Info className="w-5 h-5 text-foreground" />
        </div>
        <h4 className="text-label-xs font-semibold uppercase">{tCommon('audit_info')}</h4>
       </div>
       <div className="space-y-4">
        <div className="flex justify-between items-center py-2">
         <span className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('created_by')}</span>
         <span className="text-label-xs font-mono font-bold text-foreground/60">{issue.createdBy || tCommon('system_user')}</span>
        </div>
        <div className="flex justify-between items-center py-2">
         <span className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('created_at')}</span>
         <ClientOnlyTime 
          date={issue.createdAt || new Date()} 
          mode="datetime"
          className="text-label-xs font-mono font-bold text-foreground/60"
         />
        </div>
        {issue.postedAt && (
         <>
          <div className="flex justify-between items-center py-2 pt-4 border-t border-outline-variant/5">
           <span className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('posted_by')}</span>
           <span className="text-label-xs font-mono font-bold text-foreground/60">{issue.postedBy || tCommon('system_user')}</span>
          </div>
          <div className="flex justify-between items-center py-2">
           <span className="text-label-xs font-semibold uppercase text-muted-foreground/40">{t('posted_at')}</span>
           <ClientOnlyTime 
            date={issue.postedAt} 
            mode="datetime"
            className="text-label-xs font-mono font-bold text-foreground/60"
           />
          </div>
         </>
        )}
       </div>
      </div>
     </div>
    </div>
   </div>
   {thermalConfig && (
    <ThermalReceipt
     docType="INVENTORY_ISSUE"
     docNumber={issue.documentNumber}
     date={issue.createdAt}
     operator={issue.createdBy || tCommon('system_user')}
     department={
      issue.destinationDeptId === 'dep-1' ? tCommon('departments.kitchen_1') : 
      issue.destinationDeptId === 'dep-2' ? tCommon('departments.pastry') : 
      issue.destinationDeptId || undefined
     }
     warehouse={
      issue.warehouseId === 'wh-1' ? tCommon('warehouses.main') :
      issue.warehouseId || ''
     }
     notes={issue.notes || undefined}
     items={(issue.lines || []).map(line => ({
      code: line.item.code,
      name: line.item.name || '',
      qty: line.qty,
      uom: line.item.primaryUom?.code || line.uomId || '',
      notes: line.lot ? `${line.lot.lotNumber}` : undefined,
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

