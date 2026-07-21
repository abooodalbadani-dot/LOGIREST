'use client';

import * as React from 'react';
import { Calendar, Package, ArrowLeft, Building2, FileText, History } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { PRDetail } from '@/features/purchasing/hooks/usePR';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { DocumentLineItemTable, type LineItem } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';
import { RelationalName } from '@/components/shared/RelationalName';

interface PRViewerProps {
 document: PRDetail;
 locale: 'ar' | 'en';
 actions?: React.ReactNode;
}

/**
 * PRViewer - Strict Immutable Rendering for Purchase Requests.
 * This component handles strictly read-only display of a PR.
 * - No React Hook Form
 * - No Mutation Hooks
 * - No Inputs
 */
export function PRViewer({ document, locale, actions }: PRViewerProps) {
 const t = useTranslations('procurement.pr');
 const tc = useTranslations('common');
 const router = useRouter();

 const timelineEntries = [
  { status: 'draft' as Status, at: document.createdAt || '', by: document.createdBy || tc('system') },
  { status: document.status.toLowerCase() as Status, at: document.updatedAt || document.createdAt || '', by: tc('system') },
 ];

 return (
  <div className="space-y-10 w-full bg-card border border-border shadow-sm min-h-screen p-6 lg:p-10 animate-in fade-in duration-500">
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card border border-border shadow-sm p-8 rounded-[2rem] border border-surface-variant/5 shadow-sm print:hidden">
    <div className="flex items-center gap-4">
     <div className="p-3 rounded-2xl bg-operational-cyan/10 text-operational-cyan">
      <Package className="w-6 h-6" />
     </div>
     <div>
      <h3 className="text-title-lg font-semibold text-operational-cyan uppercase">{t('detail_title')}</h3>
      <div className="flex items-center gap-2 mt-0.5">
       <p className="text-label-xs font-bold text-muted-foreground/40 uppercase">{tc('read_only_view')}</p>
       <span className="text-muted-foreground/20">•</span>
       <span className="font-mono text-label-xs font-semibold text-muted-foreground/60">
        {document.documentNumber}
       </span>
      </div>
     </div>
    </div>
    
    <div className="flex items-center gap-3">

     <StatusBadge status={document.status as BadgeStatus} />
     {actions && (
      <>
       <div className="w-px h-8 bg-surface-variant/10 mx-1" />
       {actions}
      </>
     )}
    </div>
   </div>

   <div className="hidden print:block mb-8">
    <h1 className="text-2xl font-bold uppercase">{t('detail_title') || 'Purchase Request'}</h1>
    <p className="text-sm font-mono text-muted-foreground mt-1">Ref: {document.documentNumber}</p>
   </div>

   <DocumentReadOnlyOverlay isPosted={document?.status === 'APPROVED' || document?.status === 'REJECTED'}>
    <div className="space-y-10 print:space-y-6">
     {/* Header Info */}
     <div className="bg-card border border-border shadow-sm p-8 rounded-[2rem] border border-surface-variant/5 print:p-0 print:border-none print:bg-transparent">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="flex flex-col gap-2">
         <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 ps-1">
          <Building2 className="w-3 h-3" />
          {t('department')}
         </label>
         <div className="bg-card border border-border shadow-sm h-11 px-4 rounded-xl flex items-center text-label-xs font-bold uppercase text-foreground/80 border border-surface-variant/5">
         <RelationalName name={document.warehouseName} rawId={document.departmentId} />
        </div>
       </div>

        <div className="flex flex-col gap-2">
         <label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2 ps-1">
          <Calendar className="w-3 h-3" />
          {t('expected_date')}
         </label>
         <div className="bg-card border border-border shadow-sm h-11 px-4 rounded-xl flex items-center text-label-xs font-bold uppercase text-foreground/80 border border-surface-variant/5 font-mono">
         {document.expectedDate.split('T')[0]}
        </div>
       </div>

        <div className="flex flex-col gap-2 lg:col-span-3">
         <label className="text-xs font-bold uppercase text-muted-foreground ps-1">{tc('notes')}</label>
         <div className="bg-card border border-border shadow-sm min-h-[44px] px-4 py-3 rounded-xl flex items-center text-label-xs font-bold uppercase text-foreground border border-surface-variant/5 not-italic">
         {document.notes || tc('no_notes')}
        </div>
       </div>
      </div>
     </div>

     {/* Items Table */}
     <div className="space-y-6">
      <div className="flex items-center gap-4 px-2">
       <div className="p-2.5 rounded-xl bg-operational-cyan/10 text-operational-cyan">
        <FileText className="w-4 h-4" />
       </div>
       <div>
        <h3 className="text-label-xs font-semibold uppercase text-muted-foreground/70">{tc('items')}</h3>
        <p className="text-label-xxs font-semibold text-muted-foreground/30 uppercase mt-0.5">{t('specification')}</p>
       </div>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-[2rem] overflow-hidden border border-surface-variant/5">
       <DocumentLineItemTable
        mobileLayoutPattern="purchase-request-form"
        lines={document.lines.map(l => ({
         id: l.id,
         item: {
          id: l.item.id,
          code: l.item.code,
          nameEn: l.item.nameEn,
          nameAr: l.item.nameAr,
          image: l.item.image || null,
          primaryUom: {
           code: l.item.primaryUom.code
          }
         },
         qty: l.reqQty,
         uomId: l.uomId
        }))}
        locale={locale}
        isReadOnly={true}
       />
      </div>
     </div>
    </div>
   </DocumentReadOnlyOverlay>

   {/* Footer / History */}
   <div className="space-y-10">
    {timelineEntries.length > 0 && (
     <div className="bg-card border border-border shadow-sm p-8 rounded-[2rem] shadow-sm border border-surface-variant/5 transition-all">
       <div className="flex items-center gap-3 mb-10">
        <History className="w-4 h-4 text-primary opacity-20" />
        <h3 className="text-xs font-bold uppercase text-primary">{tc('audit_trail')}</h3>
       </div>
      <StatusTimeline entries={timelineEntries} />
     </div>
    )}

    <div className="flex items-center justify-between pt-12 mt-12 border-t border-surface-variant/10 print:hidden">
     <Button
      variant="ghost"
      type="button"
      onClick={() => router.back()}
      className="text-label-xs font-semibold uppercase text-muted-foreground/40 hover:text-foreground hover:bg-surface-container-high/50 h-12 px-8 rounded-xl transition-all"
     >
      <ArrowLeft className="w-3.5 h-3.5 me-2" />
      {tc('back')}
     </Button>
    </div>
   </div>
  </div>
 );
}
