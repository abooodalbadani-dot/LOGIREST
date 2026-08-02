'use client';

import { useState, useMemo } from 'react';
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
 Printer,
 Warehouse
} from 'lucide-react';
import { useSystemPrintSettings } from '@/features/admin/hooks/useSystemPrintSettings';
import { dispatchPrintJob } from '@/lib/export/printDispatcher';
import { ThermalReceipt } from '@/components/shared/ThermalReceipt';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { RelationalName } from '@/components/shared/RelationalName';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import type { LotAllocation, StockIssue } from '@/types/documents';
import { useAuth } from '@/providers/AuthProvider';

interface IssueViewerProps {
 issue: StockIssue;
 locale: 'ar' | 'en';
 actions?: React.ReactNode;
}

export function IssueViewer({ issue, locale, actions }: IssueViewerProps) {
 const t = useTranslations('operations.issue');
 const tCommon = useTranslations('common');
 const router = useRouter();
 const { user } = useAuth();
 const { data: settings, isLoading: isLoadingSettings } = useSystemPrintSettings();
 const [thermalConfig, setThermalConfig] = useState<{ paperSize: '80mm' | '58mm'; showLogo: boolean } | null>(null);

 const issueStatus = issue?.status ?? 'DRAFT';

  // Adapt timeline entries
  const timelineEntries = useMemo(() => {
    const issueAny = issue as unknown as Record<string, unknown>;
    const cachedTimeline = issueAny.timeline as {
      status: string;
      at: string;
      by: string;
    }[] | undefined;
    if (cachedTimeline && cachedTimeline.length > 0) {
      return cachedTimeline.map(e => ({
        status: e.status.toLowerCase() as Status,
        at: e.at,
        by: e.by
      }));
    }
    const h = [
      { status: 'draft' as Status, at: issue.createdAt ?? '', by: issue.createdBy ?? tCommon('system_user') }
    ];

    const currentStatusNorm = (issue.status || '').toLowerCase();
    if (currentStatusNorm !== 'draft' && currentStatusNorm !== 'posted') {
      const statusTime = (issueAny.submittedAt as string) || (issueAny.updatedAt as string) || issue.createdAt || '';
      const statusUser = (issueAny.submittedBy as string) || issue.createdBy || tCommon('system_user');
      const normalizedStatus = (currentStatusNorm.includes('submitted') ? 'submitted' : currentStatusNorm) as Status;
      h.push({
        status: normalizedStatus,
        at: statusTime,
        by: statusUser
      });
    }

    // Final posted status (checks both status string and postedAt timestamp)
    if (currentStatusNorm === 'posted' || issue.postedAt) {
      const postedTime = issue.postedAt || (issueAny.updatedAt as string) || issue.createdAt || '';
      const postedUser = issue.postedBy || issue.createdBy || tCommon('system_user');
      h.push({
        status: 'posted' as Status,
        at: postedTime,
        by: postedUser
      });
    }
    return h;
  }, [issue, tCommon]);

 const lines: LineItem[] = (issue.lines || []).map(l => ({
  id: l.id,
  item: {
   id: l.item.id,
   code: l.item.code,
   name: l.item.name,
   nameAr: l.item.nameAr,
   nameEn: l.item.nameEn,
   image: l.item.image,
   primaryUom: l.item.primaryUom ? { id: l.item.primaryUom.id, code: l.item.primaryUom.code, name: l.item.primaryUom.name } : null,
  },
  lot: l.lot ? { lotNumber: l.lot.lotNumber, expiryDate: l.lot.expiryDate } : null,
  qty: l.qty,
   uom: (l as { uom?: { id: string; code: string; name?: string } }).uom || (l.item?.primaryUom ? { id: l.item.primaryUom.id, code: l.item.primaryUom.code, name: l.item.primaryUom.name } : undefined),
  uomId: l.uomId,
  lotAllocations: l.lotAllocations,
 }));

 return (
  <div className="min-h-screen bg-background">
   {/* Main Content */}
    <div className="max-w-[1400px] mx-auto px-0 sm:px-6 lg:px-10 py-6 sm:py-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
     {/* Left Column */}
     <div className="lg:col-span-2 flex flex-col gap-6 w-full">
       {/* 1. The Header block (Normal Flow) */}
       <div className="flex items-center justify-between w-full bg-card px-4 py-3 sm:p-4 rounded-xl border border-border/50">
        <div className="flex items-center gap-3 sm:gap-4 overflow-hidden min-w-0 flex-1">
         <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()} 
          className="rounded-lg shrink-0 hover:bg-surface-container-high h-9 w-9"
          aria-label={tCommon('back')}
         >
          <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
         </Button>
         <div className="flex flex-col min-w-0 break-words break-all flex-1">
           <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight uppercase break-words break-all leading-tight">
            {issue?.documentNumber || '...'}
           </h1>
           <div className="flex flex-wrap gap-2 items-center mt-1">
            <StatusBadge status={issueStatus} />
            <ClientOnlyTime 
             date={issue?.createdAt || new Date()} 
             mode="date"
             className="text-xs font-bold uppercase text-muted-foreground shrink-0"
            />
           </div>
         </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ms-2">
         {actions}
         <Button
          variant="outline"
          disabled={isLoadingSettings}
          className="bg-surface-container-high border-white/5 rounded-xl h-10 sm:h-11 px-3 sm:px-6 text-label-xs font-semibold uppercase transition-all hover:bg-surface-container-highest"
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
          <Printer className="w-4 h-4 sm:me-2" />
          <span className="hidden sm:inline">{tCommon('print')}</span>
         </Button>
        </div>
       </div>

       {/* 2. Mobile Metadata Compression (md:hidden) */}
       <div className="md:hidden bg-surface-container-low border border-border rounded-[var(--radius-lg)] p-3 mb-4">
         <div className="grid grid-cols-2 gap-3">
           <div className="flex flex-col gap-1 min-w-0">
             <div className="flex items-center gap-1.5 text-muted-foreground">
               <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
               <span className="text-[10px] font-bold uppercase tracking-widest truncate">{t('destination')}</span>
             </div>
             <p className="font-bold text-sm text-foreground truncate">
               <RelationalName 
                 name={issue.destinationDeptId === 'dep-1' ? tCommon('departments.kitchen_1') : 
                       issue.destinationDeptId === 'dep-2' ? tCommon('departments.pastry') : 
                       issue.destinationDepartmentName || issue.departmentName} 
                 rawId={issue.destinationDeptId} 
                 fallback="—"
               />
             </p>
           </div>

           <div className="flex flex-col gap-1 min-w-0">
             <div className="flex items-center gap-1.5 text-muted-foreground">
               <User className="w-3.5 h-3.5 text-primary shrink-0" />
               <span className="text-[10px] font-bold uppercase tracking-widest truncate">{t('requested_by')}</span>
             </div>
             <p className="font-bold text-sm text-foreground truncate">{issue.requestedBy || '—'}</p>
           </div>

           <div className="col-span-2 flex flex-col gap-1 min-w-0 border-t border-border/40 pt-2.5">
             <div className="flex items-center gap-1.5 text-muted-foreground">
               <Warehouse className="w-3.5 h-3.5 text-primary shrink-0" />
               <span className="text-[10px] font-bold uppercase tracking-widest truncate">{tCommon('warehouse')}</span>
             </div>
             <p className="font-bold text-sm text-foreground truncate">
               <RelationalName 
                 name={issue.warehouseId === 'wh-1' ? tCommon('warehouses.main') : issue.warehouseName} 
                 rawId={issue.warehouseId} 
                 fallback={tCommon('dash')}
               />
             </p>
           </div>
         </div>
       </div>

       {/* 2. Desktop Summary Info (hidden md:block) */}
       <div className="hidden md:block bg-surface-lowest dark:bg-card border border-border shadow-sm p-5 rounded-xl w-full">
         <div className="grid grid-cols-3 gap-6 divide-x rtl:divide-x-reverse divide-border/50">
           <div className="flex flex-col gap-1.5">
             <div className="flex items-center gap-1.5 text-muted-foreground">
               <MapPin className="w-3.5 h-3.5 text-primary" />
               <span className="text-[10px] font-bold uppercase tracking-widest">{t('destination')}</span>
             </div>
             <p className="font-bold text-sm text-foreground">
               <RelationalName 
                 name={issue.destinationDeptId === 'dep-1' ? tCommon('departments.kitchen_1') : 
                       issue.destinationDeptId === 'dep-2' ? tCommon('departments.pastry') : 
                       issue.destinationDepartmentName || issue.departmentName} 
                 rawId={issue.destinationDeptId} 
                 fallback="—"
               />
             </p>
           </div>

           <div className="flex flex-col gap-1.5 px-4 lg:px-6">
             <div className="flex items-center gap-1.5 text-muted-foreground">
               <User className="w-3.5 h-3.5 text-primary" />
               <span className="text-[10px] font-bold uppercase tracking-widest">{t('requested_by')}</span>
             </div>
             <p className="font-bold text-sm text-foreground">{issue.requestedBy || '—'}</p>
           </div>

           <div className="flex flex-col gap-1.5 px-4 lg:px-6">
             <div className="flex items-center gap-1.5 text-muted-foreground">
               <Warehouse className="w-3.5 h-3.5 text-primary" />
               <span className="text-[10px] font-bold uppercase tracking-widest">{tCommon('warehouse')}</span>
             </div>
             <p className="font-bold text-sm text-foreground">
               <RelationalName 
                 name={issue.warehouseId === 'wh-1' ? tCommon('warehouses.main') : issue.warehouseName} 
                 rawId={issue.warehouseId} 
                 fallback={tCommon('dash')}
               />
             </p>
           </div>
         </div>
       </div>

       {/* 3. The Line Items Section */}
       <div className="w-full">
        {/* Mobile View Item Cards (md:hidden) */}
        <div className="md:hidden flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded-sm" />
              <h3 className="text-sm font-bold text-foreground uppercase">{t('line_items')}</h3>
            </div>
            <span className="text-xs font-semibold text-muted-foreground px-2.5 py-1 rounded-lg bg-surface-container-high border border-border">
              {lines.length} {t('entries')}
            </span>
          </div>

          <DocumentReadOnlyOverlay isPosted={issue.status === 'POSTED'}>
            <div className="flex flex-col gap-3">
              {lines.map((line) => {
                const uomDisplay =
                  (typeof line.uom === 'object' && line.uom ? line.uom.code || line.uom.name : line.uom) ||
                  line.item.primaryUom?.code ||
                  line.item.primaryUom?.name ||
                  'UNIT';
                const itemName =
                  locale === 'ar'
                    ? line.item.nameAr || line.item.name || line.item.nameEn || ''
                    : line.item.nameEn || line.item.name || line.item.nameAr || '';
                const itemImage = line.item.image || (line.item as { imageUrl?: string }).imageUrl;
                const lotAllocations = line.lotAllocations || [];

                return (
                  <div
                    key={line.id}
                    className="bg-card border border-border rounded-[var(--radius-md)] p-3 flex flex-col gap-3 shadow-sm"
                  >
                    {/* Top Row: Left (Image + Code + Name), Right (UOM Badge + QTY) */}
                    <div className="flex justify-between items-start gap-3 w-full">
                      {/* Left Side */}
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {itemImage ? (
                          <img
                            src={itemImage}
                            alt={itemName}
                            className="w-11 h-11 object-cover rounded-lg border border-border shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-11 h-11 bg-surface-container-highest flex items-center justify-center rounded-lg border border-border/50 text-[10px] text-muted-foreground font-mono font-bold shrink-0">
                            N/A
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[10px] font-mono font-bold text-muted-foreground bg-surface-container-highest px-1.5 py-0.5 rounded border border-border/50 w-fit leading-none mb-1" dir="ltr">
                            {line.item.code}
                          </span>
                          <span className="text-title-sm font-bold text-foreground leading-snug break-words">
                            {itemName}
                          </span>
                        </div>
                      </div>

                      {/* Right Side: Unit Badge & QTY */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-surface-container-high border border-border text-muted-foreground">
                          {uomDisplay}
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{tCommon('table_headers.qty')}</span>
                          <span className="text-body-md font-bold force-latin-numbers text-foreground">
                            {line.qty}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Allocations & Lots Compact Box */}
                    <div className="bg-surface-container-lowest p-2 rounded-sm mt-1 flex flex-col gap-2 border border-border/40">
                      {/* Allocations Badges */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {t('allocate')}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {lotAllocations.length > 0 ? (
                            lotAllocations.map((alloc: LotAllocation, idx: number) => (
                              <div
                                key={`${alloc.lotId || alloc.lotNumber || 'alloc'}-${idx}`}
                                className="px-2 py-1 bg-surface-container-high rounded-md flex items-center gap-1.5 border border-border/50"
                              >
                                <span className="text-xs font-mono text-foreground/90 font-medium" dir="ltr">
                                  {alloc.lotNumber}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                                <span className="text-xs font-bold force-latin-numbers text-foreground">
                                  {alloc.allocatedQty}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground/50">—</span>
                          )}
                        </div>
                      </div>

                      {/* Lot & Expiry Info */}
                      {(line.lot || lotAllocations.length > 0) && (
                        <div className="flex items-center justify-between border-t border-border/30 pt-1.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {t('lot')}:
                            </span>
                            <span className="font-mono font-semibold text-foreground" dir="ltr">
                              {line.lot?.lotNumber || lotAllocations[0]?.lotNumber || '—'}
                            </span>
                          </div>
                          {(line.lot?.expiryDate || lotAllocations.some(a => a.expiryDate)) && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                {tCommon('table_headers.expiry')}:
                              </span>
                              <ClientOnlyTime
                                date={line.lot?.expiryDate || lotAllocations.find(a => a.expiryDate)?.expiryDate}
                                mode="date"
                                className="font-mono text-muted-foreground text-[11px]"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </DocumentReadOnlyOverlay>
        </div>

        {/* Desktop View Table (hidden md:block) */}
        <div className="hidden md:block w-full bg-card dark:bg-card border border-border dark:border-[#b48e67]/40 shadow-sm rounded-xl overflow-hidden mt-6">
          <div className="p-4 md:p-6 flex justify-between items-center border-b border-border dark:border-[#b48e67]/20">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-primary dark:bg-[#b48e67] rounded-sm" />
              <h3 className="text-sm md:text-base font-bold text-foreground dark:text-white uppercase">{t('line_items')}</h3>
            </div>
            <div className="px-4 py-1.5 bg-transparent border border-border dark:border-[#b48e67]/60 shadow-sm rounded-lg text-xs font-medium text-muted-foreground dark:text-[#b48e67]">
              {lines.length} {t('entries')}
            </div>
          </div>
          <DocumentReadOnlyOverlay isPosted={issue.status === 'POSTED'}>
            <DocumentLineItemTable 
              lines={lines} 
              locale={locale} 
              isReadOnly={true}
              noCollapse={true}
              borderless={true}
              extraColumns={[
                {
                  header: t('allocate'),
                  cell: (line: LineItem) => {
                    const lineAllocations = line.lotAllocations || [];
                    return (
                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                        {lineAllocations.map((alloc: LotAllocation, idx: number) => (
                          <div key={`${alloc.lotId || alloc.lotNumber || 'alloc'}-${idx}`} className="px-2.5 py-1 bg-muted/50 rounded-lg flex items-center gap-1.5">
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
       </div>

      {/* Notes Section */}
      {issue.notes && (
        <div className="bg-surface-lowest dark:bg-card border-y border-x-0 sm:border border-border shadow-none sm:shadow-sm p-4 sm:p-5 rounded-none sm:rounded-xl space-y-3">
        <div className="flex items-center gap-3 text-primary">
         <FileText className="w-4 h-4" />
         <h3 className="text-[10px] tracking-widest font-bold uppercase">{t('operational_notes')}</h3>
        </div>
        <div className="bg-slate-50 dark:bg-surface-container border border-border/50 shadow-sm p-4 rounded-lg">
         <p className="text-sm text-foreground font-bold not-italic leading-relaxed">
          {issue.notes}
         </p>
        </div>
       </div>
      )}
     </div>

     {/* Right Column */}
     <div className="lg:col-span-1 space-y-6">
      {/* History Section */}
       <div className="bg-surface-lowest dark:bg-card border-y border-x-0 sm:border border-border shadow-none sm:shadow-sm p-4 sm:p-5 rounded-none sm:rounded-xl relative overflow-hidden group">
       <div className="absolute top-0 end-0 w-32 h-32 bg-primary/5 blur-[50px] -me-16 -mt-16 rounded-full group-hover:bg-primary/10 transition-all duration-700" />
       <div className="relative space-y-6">
        <div className="flex items-center gap-3">
         <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <History className="w-4 h-4 text-primary" />
         </div>
         <h4 className="text-[10px] font-bold uppercase tracking-widest">{t('status_history')}</h4>
        </div>
        <div className="ps-2">
         <StatusTimeline entries={timelineEntries} />
        </div>
       </div>
      </div>

      {/* Audit Info */}
       <div className="bg-surface-lowest dark:bg-card border-y border-x-0 sm:border border-border shadow-none sm:shadow-sm p-4 sm:p-5 rounded-none sm:rounded-xl space-y-5">
       <div className="flex items-center gap-3 border-b border-border/50 pb-3">
        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
         <Info className="w-4 h-4 text-foreground" />
        </div>
        <h4 className="text-[10px] font-bold uppercase tracking-widest">{tCommon('audit_trail')}</h4>
       </div>
       <div className="space-y-4">
        <div className="flex justify-between items-center py-2">
         <span className="text-xs font-bold uppercase text-muted-foreground">{t('created_by')}</span>
         <span className="text-xs font-mono font-bold text-foreground">{issue.createdBy || tCommon('system_user')}</span>
        </div>
        <div className="flex justify-between items-center py-2">
         <span className="text-xs font-bold uppercase text-muted-foreground">{t('created_at')}</span>
         <ClientOnlyTime 
          date={issue.createdAt || new Date()} 
          mode="datetime"
          className="text-xs font-mono font-bold text-foreground"
         />
        </div>
        {issue.postedAt && (
         <>
          <div className="flex justify-between items-center py-2 pt-4 border-t border-outline-variant/5">
           <span className="text-xs font-bold uppercase text-muted-foreground">{t('posted_by')}</span>
           <span className="text-xs font-mono font-bold text-foreground">{issue.postedBy || tCommon('system_user')}</span>
          </div>
          <div className="flex justify-between items-center py-2">
           <span className="text-xs font-bold uppercase text-muted-foreground">{t('posted_at')}</span>
           <ClientOnlyTime 
            date={issue.postedAt} 
            mode="datetime"
            className="text-xs font-mono font-bold text-foreground"
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

   {/* Action Toolbar / Footer removed in favor of WorkflowActionBar in top header */}
  </div>
 );
}
