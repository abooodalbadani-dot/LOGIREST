'use client';

import * as React from 'react';
import { Calendar, Package, Building2, FileText, History, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { PRDetail } from '@/features/purchasing/hooks/usePR';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';
import { RelationalName } from '@/components/shared/RelationalName';
import { StickyGlassHeader } from '@/components/shared/StickyGlassHeader';

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

  const rejectionEvent = (document.approvalEvents || []).find(
    (e) => e.action?.toUpperCase() === 'REJECT'
  );

  // Build audit timeline entries from real approvalEvents
  const actionToStatusMap: Record<string, Status> = {
    SUBMIT: 'submitted',
    APPROVE: 'approved',
    REJECT: 'rejected',
    CANCEL: 'cancelled',
  };

  const approvalTimeline: Array<{ status: Status; at: string; by: string }> = (
    document.approvalEvents || []
  ).map((ev) => {
    const status =
      actionToStatusMap[ev.action?.toUpperCase()] ||
      (ev.action?.toLowerCase() as Status) ||
      'submitted';
    const userName = ev.user?.name
      ? `${ev.user.name} (${ev.user.role || ''})`
      : ev.user?.role || tc('system_user');
    const commentSuffix = ev.comments ? ` — ${ev.comments}` : '';

    return {
      status,
      at: ev.createdAt || document.createdAt || new Date().toISOString(),
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
  const alreadyContainsCurrent = timelineEntries.some((e) => e.status === currentStatusLower);

  if (currentStatusLower !== 'draft' && !alreadyContainsCurrent) {
    timelineEntries.push({
      status: currentStatusLower,
      at: document.updatedAt || document.createdAt || '',
      by: tc('system_user'),
    });
  }

  return (
    <div className="space-y-6 md:space-y-10 w-full bg-card border border-border shadow-sm min-h-screen p-4 sm:p-6 lg:p-10 animate-in fade-in duration-500">
      {/* Sticky Glass Header */}
      <StickyGlassHeader
        onBack={() => router.push('/purchase-requests')}
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-operational-cyan/10 text-operational-cyan">
              <Package className="w-4 h-4" />
            </div>
            {t('detail_title')}
          </div>
        }
        statusBadge={
          <span className="font-mono text-label-xs font-semibold text-muted-foreground/60">
            {tc('read_only_view')} • {document.documentNumber}
          </span>
        }
        actions={
          <div className="hidden md:flex items-center gap-3">
            <StatusBadge status={document.status as BadgeStatus} />
            {actions && (
              <>
                <div className="w-px h-8 bg-surface-variant/10 mx-1" />
                {actions}
              </>
            )}
          </div>
        }
      />

      {/* Mobile Header Actions (md:hidden) */}
      <div className="flex flex-col gap-3 mb-6 w-full md:hidden">
        <div className="flex justify-between items-center w-full">
          <StatusBadge status={document.status as BadgeStatus} />
        </div>
        {actions && (
          <div className="w-full flex items-center justify-center">
            {actions}
          </div>
        )}
      </div>

      {/* Rejection Banner for Rejected PRs */}
      {(document.status === 'REJECTED' || rejectionEvent) && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 p-6 rounded-2xl space-y-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 font-bold text-sm uppercase">
            <XCircle className="w-5 h-5 text-rose-500" />
            {locale === 'ar' ? 'سبب رفض الطلب (Rejection Reason)' : 'Rejection Reason'}
          </div>
          <p className="text-sm font-semibold text-foreground bg-card/80 p-4 rounded-xl border border-rose-500/20 shadow-xs">
            {rejectionEvent?.comments ||
              (locale === 'ar'
                ? 'تم رفض الطلب بواسطة إدارة المشتريات'
                : 'Request rejected by management')}
          </p>
          {rejectionEvent && rejectionEvent.createdAt && (
            <div className="text-xs text-muted-foreground/80 ps-1">
              {tc.has('by') ? tc('by') : locale === 'ar' ? 'بواسطة' : 'By'}:{' '}
              <strong>{rejectionEvent.user?.name || rejectionEvent.user?.role || 'المسؤول'}</strong> •{' '}
              {new Date(rejectionEvent.createdAt).toLocaleString(
                locale === 'ar' ? 'ar-SA' : 'en-US'
              )}
            </div>
          )}
        </div>
      )}

      <DocumentReadOnlyOverlay
        isPosted={document?.status === 'APPROVED' || document?.status === 'REJECTED'}
      >
        <div className="space-y-6 print:space-y-6">
          {/* Mobile Metadata Compression (The Top Info) */}
          <div className="bg-surface-container-low border border-border rounded-[var(--radius-lg)] p-4 mb-6 md:hidden">
            <div className="grid grid-cols-2 gap-4">
              {/* المستودع الطالب */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-[11px] font-bold uppercase truncate">{t('department')}</span>
                </div>
                <span className="text-sm font-bold text-foreground truncate">
                  <RelationalName name={document.warehouseName} rawId={document.departmentId} />
                </span>
              </div>

              {/* التاريخ المتوقع */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-[11px] font-bold uppercase truncate">{t('expected_date')}</span>
                </div>
                <span
                  className="text-sm font-bold text-foreground truncate force-latin-numbers"
                  dir="ltr"
                >
                  {document.expectedDate ? document.expectedDate.split('T')[0] : '—'}
                </span>
              </div>

              {/* ملاحظات */}
              {document.notes && (
                <div className="flex flex-col gap-1 min-w-0 col-span-2 pt-2 border-t border-border/50">
                  <span className="text-[11px] font-bold uppercase text-muted-foreground truncate">
                    {tc('notes')}
                  </span>
                  <span className="text-sm text-foreground break-words">{document.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Desktop Metadata Info Cards */}
          <div className="hidden md:grid md:grid-cols-3 gap-3 mb-6">
            {/* المستودع الطالب */}
            <div className="bg-surface-container-low border border-border rounded-[var(--radius-lg)] p-4 flex flex-col gap-1 items-start">
              <span className="text-label-sm text-muted-foreground flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary" />
                {t('department')}
              </span>
              <span className="text-title-sm font-bold text-foreground truncate">
                <RelationalName name={document.warehouseName} rawId={document.departmentId} />
              </span>
            </div>

            {/* التاريخ المتوقع */}
            <div className="bg-surface-container-low border border-border rounded-[var(--radius-lg)] p-4 flex flex-col gap-1 items-start">
              <span className="text-label-sm text-muted-foreground flex items-center gap-1.5 ">
                <Calendar className="w-4 h-4 text-amber-500" />
                {t('expected_date')}
              </span>
              <span
                className="text-title-sm font-bold text-foreground font-mono force-latin-numbers "
                dir="ltr"
              >
                {document.expectedDate ? document.expectedDate.split('T')[0] : '—'}
              </span>
            </div>

            {/* ملاحظات */}
            <div className="bg-surface-container-low border border-border rounded-[var(--radius-lg)] p-4 flex flex-col gap-1 items-start">
              <span className="text-label-sm text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-operational-cyan" />
                {tc('notes')}
              </span>
              <span className="text-body-md text-foreground line-clamp-2">
                {document.notes || tc('no_notes')}
              </span>
            </div>
          </div>

          {/* Items Table / Cards Section */}
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center gap-4 px-2">
              <div className="p-2.5 rounded-xl bg-operational-cyan/10 text-operational-cyan">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-label-xs font-semibold uppercase text-muted-foreground/70">
                  {tc('items')}
                </h3>
                <p className="text-label-xxs font-semibold text-muted-foreground/30 uppercase mt-0.5">
                  {t('specification')}
                </p>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-card border border-border shadow-sm rounded-[2rem] overflow-hidden border border-surface-variant/5">
              <DocumentLineItemTable
                mobileLayoutPattern="purchase-request-form"
                hideLotColumns={true}
                lines={document.lines.map((l) => ({
                  id: l.id,
                  item: {
                    id: l.item.id,
                    code: l.item.code,
                    nameEn: l.item.nameEn,
                    nameAr: l.item.nameAr,
                    image: l.item.image || null,
                    primaryUom: {
                      code: l.item.primaryUom.code,
                    },
                    uomConversions: l.item.uomConversions || [],
                  },
                  qty: l.reqQty,
                  uomId: l.uomId,
                  uom: l.uom,
                }))}
                locale={locale}
                isReadOnly={true}
              />
            </div>

            {/* Mobile Cards View */}
            <div className="flex flex-col gap-3 md:hidden">
              {document.lines.map((l, idx) => {
                const itemName =
                  locale === 'ar'
                    ? l.item?.nameAr || l.item?.name || l.item?.nameEn || ''
                    : l.item?.nameEn || l.item?.name || l.item?.nameAr || '';
                const itemCode = l.item?.code || '';
                const uomCode =
                  typeof l.uom === 'object' && l.uom?.code
                    ? l.uom.code
                    : typeof l.uom === 'string'
                      ? l.uom
                      : l.item?.primaryUom?.code || '';
                const image = l.item?.image || null;

                return (
                  <div
                    key={l.id || idx}
                    className="bg-card border border-border-color rounded-[var(--radius-md)] p-3 flex flex-col gap-3"
                  >
                    {/* Top Row: Unit badge on one side, Item name & Image & code on the other */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {image ? (
                          <img
                            src={image}
                            alt=""
                            className="w-10 h-10 object-cover rounded-lg border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-muted/60 flex items-center justify-center rounded-lg border border-border text-[10px] text-muted-foreground font-mono shrink-0">
                            N/A
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-foreground text-sm truncate">
                            {itemName}
                          </span>
                          <span className="text-xs font-mono font-bold text-brand-gold truncate">
                            {itemCode}
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-label-xs font-bold uppercase shrink-0 border border-border/50">
                        {uomCode || 'EA'}
                      </span>
                    </div>

                    {/* Bottom Row: Quantity */}
                    <div className="flex justify-between items-center border-t border-border-muted pt-2 text-start">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                        {t.has('qty')
                          ? t('qty')
                          : tc.has('qty')
                            ? tc('qty')
                            : locale === 'ar'
                              ? 'الكمية'
                              : 'Quantity'}
                      </span>
                      <span className="text-body-md font-bold force-latin-numbers text-foreground">
                        {l.reqQty}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DocumentReadOnlyOverlay>

      {/* Audit Trail Timeline */}
      <div className="space-y-10">
        {timelineEntries.length > 0 && (
          <div className="bg-card border border-border shadow-sm p-6 sm:p-8 rounded-2xl md:rounded-[2rem] shadow-sm border border-surface-variant/5 transition-all">
            <div className="flex items-center gap-3 mb-6 md:mb-10">
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
