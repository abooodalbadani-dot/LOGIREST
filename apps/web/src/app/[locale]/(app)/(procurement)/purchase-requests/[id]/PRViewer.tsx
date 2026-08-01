'use client';

import * as React from 'react';
import { Calendar, Package, ArrowLeft, Building2, FileText, History, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { PRDetail } from '@/features/purchasing/hooks/usePR';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
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
 * Displays PR details, line items (hiding lot/expiry), rejection reasons, and complete audit trail.
 */
export function PRViewer({ document, locale, actions }: PRViewerProps) {
 const t = useTranslations('procurement.pr');
 const tc = useTranslations('common');
 const router = useRouter();

 const rejectionEvent = (document.approvalEvents || []).find(e => e.action?.toUpperCase() === 'REJECT');

 // Build audit timeline entries from real approvalEvents
 const actionToStatusMap: Record<string, Status> = {
  SUBMIT: 'submitted',
  APPROVE: 'approved',
  REJECT: 'rejected',
  CANCEL: 'cancelled',
 };

 const approvalTimeline: Array<{ status: Status; at: string; by: string }> = (document.approvalEvents || []).map((ev) => {
  const status = actionToStatusMap[ev.action?.toUpperCase()] || (ev.action?.toLowerCase() as Status) || 'submitted';
  const userName = ev.user?.name ? `${ev.user.name} (${ev.user.role || ''})` : ev.user?.role || tc('system_user');
  const commentSuffix = ev.comments ? ` — ${ev.comments}` : '';
  
  return {
   status,
   at: ev.createdAt,
   by: `${userName}${commentSuffix}`,
  };
 });

 const timelineEntries: Array<{ status: Status; at: string; by: string }> = [
  {
   status: 'draft' as Status,
   at: document.createdAt || '',
   by: document.createdBy || tc('system_user'),
  },
  ...approvalTimeline,
 ];

 // Ensure current status is represented if not already in approvalTimeline
 const currentStatusLower = document.status.toLowerCase() as Status;
 const alreadyContainsCurrent = timelineEntries.some(e => e.status === currentStatusLower);

 if (currentStatusLower !== 'draft' && !alreadyContainsCurrent) {
  timelineEntries.push({
   status: currentStatusLower,
   at: document.updatedAt || document.createdAt || '',
   by: tc('system_user'),
  });
 }

 return (
  <div className="space-y-10 w-full bg-card border border-border shadow-sm min-h-screen p-6 lg:p-10 animate-in fade-in duration-500">
   {/* Header card with back arrow next to document title */}
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card border border-border shadow-sm p-8 rounded-[2rem] border border-surface-variant/5 shadow-sm print:hidden">
    <div className="flex items-center gap-4">
     {/* Back arrow button placed next to the document title */}
     <Button
      variant="ghost"
      size="icon"
      type="button"
      onClick={() => router.back()}
      className="h-10 w-10 rounded-2xl border border-border/80 hover:bg-surface-container-high transition-all shrink-0 shadow-xs"
      title={tc('back')}
     >
      <ArrowLeft className="w-5 h-5 text-foreground rtl:rotate-180" />
     </Button>

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

   {/* Rejection Banner for Rejected PRs */}
   {(document.status === 'REJECTED' || rejectionEvent) && (
    <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 p-6 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-2">
     <div className="flex items-center gap-2 font-bold text-sm uppercase">
      <XCircle className="w-5 h-5 text-rose-500" />
      {locale === 'ar' ? 'سبب رفض الطلب (Rejection Reason)' : 'Rejection Reason'}
     </div>
     <p className="text-sm font-semibold text-foreground bg-card/80 p-4 rounded-xl border border-rose-500/20 shadow-xs">
      {rejectionEvent?.comments || (locale === 'ar' ? 'تم رفض الطلب بواسطة إدارة المشتريات' : 'Request rejected by management')}
     </p>
     {rejectionEvent && (
      <div className="text-xs text-muted-foreground/80 ps-1">
       {tc.has('by') ? tc('by') : (locale === 'ar' ? 'بواسطة' : 'By')}: <strong>{rejectionEvent.user?.name || rejectionEvent.user?.role || 'المسؤول'}</strong> • {new Date(rejectionEvent.createdAt).toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')}
      </div>
     )}
    </div>
   )}

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

     {/* Items Table (Suppressing non-applicable Batch & Expiry columns) */}
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
        hideLotColumns={true}
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
          },
          uomConversions: l.item.uomConversions || []
         },
         qty: l.reqQty,
         uomId: l.uomId,
         uom: l.uom
        }))}
        locale={locale}
        isReadOnly={true}
       />
      </div>
     </div>
    </div>
   </DocumentReadOnlyOverlay>

   {/* Audit Trail Timeline */}
   <div className="space-y-10">
    {timelineEntries.length > 0 && (
     <div className="bg-card border border-border shadow-sm p-8 rounded-[2rem] shadow-sm border border-surface-variant/5 transition-all">
       <div className="flex items-center gap-3 mb-10">
        <History className="w-4 h-4 text-primary opacity-40" />
        <h3 className="text-xs font-bold uppercase text-primary">{tc('audit_trail')}</h3>
       </div>
      <StatusTimeline entries={timelineEntries} />
     </div>
    )}
   </div>
  </div>
 );
}
