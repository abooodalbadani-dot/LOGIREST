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
import { usePostIssue } from '@/features/operations/hooks/usePostIssue';
import { canPerformActionV2 } from '@logirest/shared-types';
import { PostConfirmDialog } from '@/components/shared/PostConfirmDialog';

interface IssueViewerProps {
 issue: StockIssue;
 locale: 'ar' | 'en';
}

export function IssueViewer({ issue, locale }: IssueViewerProps) {
 const t = useTranslations('operations.issue');
 const tCommon = useTranslations('common');
 const router = useRouter();
 const { user } = useAuth();
 const { data: settings, isLoading: isLoadingSettings } = useSystemPrintSettings();
 const [thermalConfig, setThermalConfig] = useState<{ paperSize: '80mm' | '58mm'; showLogo: boolean } | null>(null);
 const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
 const postIssueMutation = usePostIssue();

 const issueStatus = issue?.status ?? 'DRAFT';
 
 const handlePost = async () => {
  try {
   await postIssueMutation.mutateAsync({
    id: issue.id,
    confirmation: 'ACKNOWLEDGE_IRREVERSIBLE',
    version: issue.version
   });
   setIsPostDialogOpen(false);
  } catch (err) {
   console.error(err);
  }
 };

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
    if (issue.postedAt) {
      h.push({ status: 'posted' as Status, at: issue.postedAt, by: issue.postedBy ?? tCommon('system_user') });
    }
    return h;
  }, [issue, tCommon]);

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
  <div className="min-h-screen bg-background">
   {/* Main Content */}
   <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
     {/* Left Column */}
     <div className="lg:col-span-2 flex flex-col gap-6 w-full">
      {/* 1. The Header block (Normal Flow) */}
      <div className="flex items-center justify-between w-full bg-card p-4 rounded-xl border border-border/50">
       <div className="flex items-center gap-4 overflow-hidden">
        <Button 
         variant="ghost" 
         size="icon" 
         onClick={() => router.back()} 
         className="rounded-lg shrink-0 hover:bg-surface-container-high"
         aria-label={tCommon('back')}
        >
         <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
        </Button>
        <div className="flex flex-col min-w-0">
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight uppercase">
           {issue?.documentNumber || '...'}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
           <StatusBadge status={issueStatus} />
           <ClientOnlyTime 
            date={issue?.createdAt || new Date()} 
            mode="date"
            className="text-xs font-bold uppercase text-muted-foreground shrink-0"
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

      {/* 2. The Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
       <div className="bg-card border border-border shadow-sm p-6 rounded-lg space-y-3">
        <div className="flex items-center gap-2 text-primary">
         <MapPin className="w-4 h-4" />
         <span className="text-xs font-bold uppercase">{t('destination')}</span>
        </div>
         <p className="font-bold text-body-md">
          <RelationalName 
           name={issue.destinationDeptId === 'dep-1' ? tCommon('departments.kitchen_1') : 
                 issue.destinationDeptId === 'dep-2' ? tCommon('departments.pastry') : 
                 issue.destinationDepartmentName || issue.departmentName} 
           rawId={issue.destinationDeptId} 
           fallback="—"
          />
         </p>
       </div>
       <div className="bg-card border border-border shadow-sm p-6 rounded-lg space-y-3">
        <div className="flex items-center gap-2 text-primary">
         <User className="w-4 h-4" />
         <span className="text-xs font-bold uppercase">{t('requested_by')}</span>
        </div>
        <p className="font-bold text-body-md">{issue.requestedBy || '—'}</p>
       </div>
       <div className="bg-card border border-border shadow-sm p-6 rounded-lg space-y-3">
        <div className="flex items-center gap-2 text-primary">
         <Warehouse className="w-4 h-4" />
         <span className="text-xs font-bold uppercase">{tCommon('warehouse')}</span>
        </div>
         <p className="font-bold text-body-md">
          <RelationalName 
           name={issue.warehouseId === 'wh-1' ? tCommon('warehouses.main') : issue.warehouseName} 
           rawId={issue.warehouseId} 
           fallback={tCommon('dash')}
          />
         </p>
       </div>
      </div>

      {/* 3. The Line Items Table */}
      <div className="w-full bg-card dark:bg-[#0B1220] border border-border dark:border-[#b48e67]/40 shadow-sm rounded-xl overflow-hidden mt-6">
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
         noCollapse={false}
         borderless={true}
         mobileLayoutPattern="elegant"
         extraColumns={[
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
       <div className="bg-card border border-border shadow-sm p-8 rounded-lg space-y-4">
        <div className="flex items-center gap-3 text-primary">
         <FileText className="w-4 h-4" />
         <h3 className="text-xs font-bold uppercase">{t('operational_notes')}</h3>
        </div>
        <div className="bg-card border border-border shadow-sm p-6 rounded-xl border border-outline-variant/5">
         <p className="text-body-md text-foreground font-bold not-italic leading-relaxed">
          {issue.notes}
         </p>
        </div>
       </div>
      )}
     </div>

     {/* Right Column */}
     <div className="lg:col-span-1 space-y-6">
      {/* History Section */}
      <div className="bg-card border border-border shadow-sm p-8 rounded-lg relative overflow-hidden group">
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
      <div className="bg-card border border-border shadow-sm p-8 rounded-lg space-y-6">
       <div className="flex items-center gap-4 border-b border-outline-variant/5 pb-4">
        <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
         <Info className="w-5 h-5 text-foreground" />
        </div>
        <h4 className="text-xs font-bold uppercase">{tCommon('audit_trail')}</h4>
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

   {/* Action Toolbar / Footer */}
   {issueStatus === 'SUBMITTED' && canPerformActionV2('issue', 'SUBMITTED', 'POST', user?.role) && (
    <div className="w-full flex items-center justify-end gap-4 px-6 lg:px-10 py-4 bg-muted/30 border-t border-border mt-auto print:hidden">
     <Button 
      onClick={() => setIsPostDialogOpen(true)}
      disabled={postIssueMutation.isPending}
      className="bg-brand-gold hover:bg-brand-gold-hover text-white transition-colors h-11 px-8 rounded-xl font-bold uppercase"
     >
      {t('post_issue') || 'Post Issue'}
     </Button>
    </div>
   )}

   <PostConfirmDialog
    open={isPostDialogOpen}
    onOpenChange={setIsPostDialogOpen}
    title={t('post_confirm_title') || 'Post Confirmation'}
    description={t('post_confirm_desc') || 'Are you sure you want to post this issue? This action is irreversible.'}
    warningText=""
    requiresTextConfirmation={true}
    onConfirm={handlePost}
    isLoading={postIssueMutation.isPending}
   />
  </div>
 );
}
