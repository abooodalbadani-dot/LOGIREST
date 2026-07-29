'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import {
  ArrowLeft,
  Wallet,
  PackageSearch,
  Warehouse,
  MessageSquare,
  TrendingUp,
  History,
  Package
} from 'lucide-react';

import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { DocumentExportMenu } from '@/components/shared/DocumentExportMenu';
import { StickyGlassHeader } from '@/components/shared/StickyGlassHeader';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RelationalName } from '@/components/shared/RelationalName';
import { useBaseCurrency } from '@/hooks/useBaseCurrency';
import { formatCurrency, formatDate } from '@/utils/currency';
import { resolveUomCode } from '@/utils/uom-helper';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

import type { GRN, GRNLineItem } from '@/types/documents';

interface AuditLogEntry {
  status: string;
  createdAt: string;
  userName?: string;
}

export interface GRNViewerDocument extends Omit<GRN, 'lines'> {
  supplierName?: string;
  poNumber?: string | null;
  auditLog?: AuditLogEntry[];
  lines: GRNLineItem[];
}

interface GRNViewerProps {
  document: GRNViewerDocument;
  locale: 'ar' | 'en';
  actions?: React.ReactNode;
}

/**
 * GRNViewer - Strict Immutable Rendering for Goods Received Notes.
 * Displays data in a read-only format without initializing form state or mutation hooks.
 */
export function GRNViewer({ document, locale, actions }: GRNViewerProps) {
  const t = useTranslations('procurement.grn');
  const tc = useTranslations('common');
  const router = useRouter();

  const { currency: baseCurrency, isLoading: loadingSettings } = useBaseCurrency();

  const totalForeign = document?.lines?.reduce((acc: number, line: GRNLineItem) => acc + (line.receivedQty * (line.unitCostForeign || 0)), 0) || 0;
  const currentFxRate = document?.fxRate || 1;

  const timelineEntries = document?.auditLog?.map((e: AuditLogEntry) => ({
    status: e.status.toLowerCase() as Status,
    at: e.createdAt,
    by: e.userName || tc('system_user')
  })) || [
      { status: (document?.status || 'DRAFT').toLowerCase() as Status, at: document?.createdAt || new Date().toISOString(), by: 'System' }
    ];

  if (loadingSettings) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-10 w-full min-h-screen px-0 py-6 sm:p-6 lg:p-10 bg-card border-y border-x-0 sm:border border-border shadow-sm rounded-none sm:rounded-2xl animate-in fade-in duration-500">
      <StickyGlassHeader
        onBack={() => router.back()}
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-muted/50 text-foreground">
              <Package className="w-4 h-4" />
            </div>
            {t('detail_title') || t('title')}
          </div>
        }
        statusBadge={
          <span className="font-mono text-label-xs font-semibold text-muted-foreground/60">
            {tc('read_only_view')} • {document?.documentNumber}
          </span>
        }
        actions={
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
            <div className="flex flex-row items-center gap-2 w-full md:w-auto">
              <StatusBadge status={document?.status as BadgeStatus} />
              <DocumentExportMenu documentType="GRN" documentId={document?.id} documentNumber={document?.documentNumber} />
            </div>
            {actions && (
              <>
                <div className="hidden md:block w-px h-8 bg-surface-variant/10 mx-1" />
                {actions}
              </>
            )}
          </div>
        }
      />

      <div className="max-w-[1400px] mx-auto space-y-10">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 px-4 sm:px-0">
          {/* Supplier Info */}
          <div className="col-span-2 md:col-span-1 bg-card border border-border/60 sm:border-border shadow-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl flex flex-col gap-1 group relative overflow-hidden">
            <p className="text-[10px] sm:text-xs font-bold uppercase text-primary tracking-widest">{tc('supplier')}</p>
            <p className="font-bold text-sm sm:text-title-sm mt-1 sm:mt-2 not-italic uppercase text-foreground">
              <RelationalName name={document?.supplierName} rawId={document?.supplierId} fallback="Supply Co" />
            </p>
          </div>

          {/* Currency Info */}
          <div className="col-span-1 bg-card border border-border/60 sm:border-border shadow-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl flex flex-col gap-1 group relative overflow-hidden">
            <div className="absolute top-0 end-0 p-3 sm:p-4 opacity-[0.02]">
              <Wallet className="w-8 h-8 sm:w-12 sm:h-12" />
            </div>
            <p className="text-[10px] sm:text-xs font-bold uppercase text-primary tracking-widest">{tc('order_currency')}</p>
            <p className="font-mono font-semibold text-sm sm:text-title-sm text-foreground mt-1 sm:mt-2">
              <RelationalName name={document?.currencyCode} rawId={document?.currencyId} />
            </p>
          </div>

          {/* Linked PO */}
          <div className="col-span-1 bg-card border border-border/60 sm:border-border shadow-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl flex flex-col gap-1 group relative overflow-hidden">
            <div className="absolute top-0 end-0 p-3 sm:p-4 opacity-[0.02]">
              <PackageSearch className="w-8 h-8 sm:w-12 sm:h-12" />
            </div>
            <p className="text-[10px] sm:text-xs font-bold uppercase text-primary tracking-widest">{tc('ref_document')}</p>
            <div className="mt-1 sm:mt-2">
              {document?.poNumber ? (
                <Badge variant="outline" className="h-7 sm:h-8 px-2 sm:px-4 bg-primary/5 text-foreground border-primary/20 text-[10px] sm:text-label-xs font-semibold uppercase rounded-md sm:rounded-lg">
                  <span dir="ltr" className="font-mono">{document.poNumber}</span>
                </Badge>
              ) : (
                <p className="font-bold text-sm sm:text-title-sm text-primary not-italic uppercase">{t('direct_receipt')}</p>
              )}
            </div>
          </div>

          {/* Warehouse */}
          <div className="col-span-2 md:col-span-1 bg-card border border-border/60 sm:border-border shadow-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl flex flex-col gap-1 group relative overflow-hidden">
            <div className="absolute top-0 end-0 p-3 sm:p-4 opacity-[0.02]">
              <Warehouse className="w-8 h-8 sm:w-12 sm:h-12" />
            </div>
            <p className="text-[10px] sm:text-xs font-bold uppercase text-primary tracking-widest">{tc('warehouse')}</p>
            <p className="font-bold text-sm sm:text-title-sm mt-1 sm:mt-2 uppercase not-italic text-foreground">
              <RelationalName name={document?.warehouseName} rawId={document?.warehouseId} />
            </p>
          </div>

          {/* Notes */}
          <div className="col-span-2 md:col-span-2 lg:col-span-4 bg-card border border-border/60 sm:border-border shadow-sm p-4 sm:p-6 rounded-xl sm:rounded-2xl flex flex-col gap-1 group relative overflow-hidden">
            <div className="absolute top-0 end-0 p-3 sm:p-4 opacity-[0.02]">
              <MessageSquare className="w-8 h-8 sm:w-12 sm:h-12" />
            </div>
            <p className="text-[10px] sm:text-xs font-bold uppercase text-primary tracking-widest">{tc('notes')}</p>
            <div className="mt-1 sm:mt-2 p-3 sm:p-4 bg-background/40 sm:bg-card border border-border/40 sm:border-border shadow-sm rounded-lg sm:rounded-xl text-xs sm:text-body-md font-bold text-foreground/70 not-italic">
              {document?.notes || tc('no_notes')}
            </div>
          </div>
        </div>

        {/* Lines Table */}
        <DocumentReadOnlyOverlay isPosted={document?.status === 'POSTED'}>
          <div className="hidden md:block bg-card border-y border-x-0 sm:border border-border shadow-sm rounded-none sm:rounded-[2rem] overflow-hidden shadow-sm border border-surface-variant/5">
            <DocumentLineItemTable
              lines={document?.lines || []}
              locale={locale}
              isReadOnly={true}
              extraColumns={[
                {
                  header: tc('table_headers.received_qty'),
                  cell: (line: GRNLineItem) => (
                    <span dir="ltr" className="font-mono font-bold text-foreground/80">{line.receivedQty}</span>
                  )
                },
                {
                  header: tc('table_headers.lot_allocation'),
                  cell: (line: GRNLineItem) => (
                    <span dir="ltr" className="font-mono text-label-xs font-semibold uppercase text-operational-cyan">
                      {line.lot?.lotNumber || 'N/A'}
                    </span>
                  )
                }
              ]}
            />
          </div>

          {/* Mobile Cards View */}
          <div className="flex flex-col gap-3 md:hidden w-full px-4 sm:px-0">
            {document?.lines?.map((line, idx) => (
              <div key={line.id || idx} className="bg-card border border-border/60 shadow-sm p-4 sm:p-5 rounded-xl flex flex-col gap-3 relative overflow-hidden group">
                <div className="flex gap-3 items-center border-b border-border/40 pb-3">
                  {(line.item.image || line.item.imageUrl) ? (
                    <img src={(line.item.image || line.item.imageUrl)!} alt="Product" className="w-12 h-12 object-cover rounded-lg border border-border shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-surface flex items-center justify-center rounded-lg border border-border text-[10px] text-muted-foreground font-mono shrink-0">
                      N/A
                    </div>
                  )}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-bold text-foreground leading-tight whitespace-normal">
                      {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn) : (line.item.nameEn || line.item.name || line.item.nameAr)}
                    </span>
                    <span className="text-[10px] text-brand-gold font-mono tracking-widest mt-1">{line.item.code || 'ITM-000'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col bg-surface/50 dark:bg-surface-container-low/30 p-2 rounded-lg border border-border/70">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">REQ QTY</span>
                    <span className="text-xs font-black text-foreground font-mono" dir="ltr">{line.qty}</span>
                  </div>
                  <div className="flex flex-col bg-primary/5 p-2 rounded-lg border border-primary/20">
                    <span className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1">RECEIVED</span>
                    <span className="text-xs font-black text-primary font-mono" dir="ltr">{line.receivedQty}</span>
                  </div>
                  <div className="flex flex-col bg-surface/50 dark:bg-surface-container-low/30 p-2 rounded-lg border border-border/70">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">UOM</span>
                    <span className="text-xs font-bold text-foreground uppercase"> {resolveUomCode(line.uomId, line.item, null, 'PCS')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-3 mt-1">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">LOT</span>
                    <span className="text-[10px] font-bold text-foreground font-mono" dir="ltr">{line.lot?.lotNumber || '—'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">EXPIRY</span>
                    <span className="text-[10px] font-bold text-foreground font-mono" dir="ltr">
                      {line.lot?.expiryDate ? formatDate(line.lot.expiryDate, locale as 'ar' | 'en') : '—'}
                    </span>
                  </div>

                </div>

              </div>
            ))}
          </div>
        </DocumentReadOnlyOverlay>

        {/* Financial Summary */}
        <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-4 sm:gap-8 pt-6 px-4 sm:px-0">
          <div className="flex flex-row md:flex-col items-center justify-between md:items-end gap-1 px-4 sm:px-6 w-full md:w-auto bg-amber-500/5 sm:bg-transparent rounded-xl sm:rounded-none p-3 sm:p-0 border border-amber-500/10 md:border-amber-500/0 md:border-e md:border-surface-container-high/20">
            <p className="text-[10px] sm:text-xs font-bold uppercase text-muted-foreground tracking-widest">
              {t('finalized_rate')}
            </p>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <TrendingUp className="w-3 h-3 hidden md:block" />
              <p dir="ltr" className="text-xs sm:text-label-sm font-mono font-bold">
                1 {document?.currencyCode || 'USD'} = {currentFxRate} {baseCurrency}
              </p>
            </div>
          </div>

          <Card className="bg-card border border-border/60 sm:border-border shadow-sm p-4 sm:p-8 rounded-xl sm:rounded-2xl relative overflow-hidden w-full md:min-w-[340px] group">
            <div className="absolute top-0 end-0 w-1 h-full bg-muted/50 group-hover:bg-emerald-500 transition-all hidden sm:block" />
            <div className="space-y-4 sm:space-y-6 relative z-10">
              <div className="flex justify-between items-center gap-6 sm:gap-10">
                <p className="text-[10px] sm:text-xs font-bold uppercase text-primary tracking-widest">{t('receipt_total', { currency: document?.currencyCode || 'USD' })}</p>
                <p dir="ltr" className="text-2xl sm:text-headline-lg font-display font-black text-foreground">{formatCurrency(totalForeign, document?.currencyCode || 'USD', locale)}</p>
              </div>
              <div className="h-px bg-surface-container-high/10 sm:bg-surface-container-high/20 w-full" />
              <div className="flex justify-between items-center gap-6 sm:gap-10">
                <p className="text-[10px] sm:text-xs font-bold uppercase text-primary tracking-widest">{t('base_value', { currency: baseCurrency })}</p>
                <p dir="ltr" className="text-sm sm:text-title-lg font-mono font-bold text-primary/60">
                  {formatCurrency(totalForeign * currentFxRate, baseCurrency, locale)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Audit Trail */}
        <div className="px-4 sm:px-0">
          <div className="bg-card border border-border/60 sm:border-border shadow-sm p-5 sm:p-8 rounded-xl sm:rounded-[2rem]">
            <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-10">
              <History className="w-4 h-4 text-primary opacity-20" />
              <h3 className="text-[10px] sm:text-xs font-bold uppercase text-primary tracking-widest">{tc('audit_trail')}</h3>
            </div>
            <StatusTimeline entries={timelineEntries} />
          </div>
        </div>
      </div>
    </div>
  );
}
