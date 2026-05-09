'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
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
import { cn } from '@/lib/utils';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface GRNViewerProps {
  document: any;
  actions?: React.ReactNode;
}

/**
 * GRNViewer - Strict Immutable Rendering for Goods Received Notes.
 * Centered in features/purchasing/components for consistency.
 */
export function GRNViewer({ document, actions }: GRNViewerProps) {
  const t = useTranslations('procurement.grn');
  const tc = useTranslations('common');
  const router = useRouter();
  const locale = useLocale();

  const totalForeign = document?.lines?.reduce((acc: number, line: any) => acc + (line.received_qty * (line.unit_cost_foreign || 0)), 0) || 0;
  const currentFxRate = document?.fx_rate || 1;
  const baseCurrency = 'SAR';

  const timelineEntries = document?.audit_log?.map((e: any) => ({
    status: e.status.toLowerCase() as Status,
    at: e.created_at,
    by: e.user_name || tc('system')
  })) || [
    { status: (document?.status || 'DRAFT').toLowerCase() as Status, at: document?.created_at || new Date().toISOString(), by: 'System' }
  ];

  return (
    <div className="space-y-10 w-full bg-surface-container-low min-h-screen p-6 lg:p-10 animate-in fade-in duration-500">
      {/* Structural Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-surface-container-lowest p-8 rounded-[2rem] border border-surface-variant/5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-title-lg font-semibold text-emerald-500 uppercase">{t('detail_title') || t('title')}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-label-xs font-bold text-muted-foreground/40 uppercase">{tc('read_only_view')}</p>
              <span className="text-muted-foreground/20">•</span>
              <span className="font-mono text-label-xs font-semibold text-muted-foreground/60">
                {document?.document_number}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <StatusBadge status={document?.status as BadgeStatus} />
          {actions && (
            <>
              <div className="w-px h-8 bg-surface-variant/10 mx-1" />
              {actions}
            </>
          )}
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Supplier Info */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex flex-col gap-1 group border border-surface-variant/5">
            <p className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('supplier')}</p>
            <p className="font-bold text-title-sm mt-2 italic uppercase text-foreground">{document?.supplier_name || 'Supply Co'}</p>
          </div>

          {/* Currency Info */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex flex-col gap-1 group relative overflow-hidden border border-surface-variant/5">
            <div className="absolute top-0 end-0 p-4 opacity-[0.02]">
              <Wallet className="w-12 h-12" />
            </div>
            <p className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('order_currency')}</p>
            <p className="font-mono font-semibold text-title-sm text-primary mt-2">{document?.currency_id}</p>
          </div>

          {/* Linked PO */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex flex-col gap-1 group relative overflow-hidden border border-surface-variant/5">
            <div className="absolute top-0 end-0 p-4 opacity-[0.02]">
              <PackageSearch className="w-12 h-12" />
            </div>
            <p className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('ref_document')}</p>
            <div className="mt-2">
              {document?.po_number ? (
                <Badge variant="outline" className="h-8 px-4 bg-primary/5 text-primary border-primary/20 text-label-xs font-semibold uppercase rounded-lg">
                  <span dir="ltr" className="font-mono">{document.po_number}</span>
                </Badge>
              ) : (
                <p className="font-semibold text-title-sm text-primary/10 italic uppercase">{t('direct_receipt')}</p>
              )}
            </div>
          </div>

          {/* Warehouse */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex flex-col gap-1 group relative overflow-hidden border border-surface-variant/5">
            <div className="absolute top-0 end-0 p-4 opacity-[0.02]">
              <Warehouse className="w-12 h-12" />
            </div>
            <p className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('warehouse')}</p>
            <p className="font-bold text-title-sm mt-2 uppercase italic text-foreground">{document?.warehouse_id === 'wh-1' ? 'Main Warehouse' : 'Kitchen Store'}</p>
          </div>

          {/* Notes */}
          <div className="col-span-full bg-surface-container-lowest p-6 rounded-2xl shadow-sm flex flex-col gap-1 group relative overflow-hidden border border-surface-variant/5">
            <div className="absolute top-0 end-0 p-4 opacity-[0.02]">
              <MessageSquare className="w-12 h-12" />
            </div>
            <p className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{tc('notes')}</p>
            <div className="mt-2 p-4 bg-surface-container-low rounded-xl text-body-md font-medium text-foreground/70 italic">
              {document?.notes || tc('no_notes')}
            </div>
          </div>
        </div>

        {/* Lines Table */}
        <DocumentReadOnlyOverlay isPosted={true}>
          <div className="bg-surface-container-lowest rounded-[2rem] overflow-hidden shadow-sm border border-surface-variant/5">
            <DocumentLineItemTable 
              lines={document?.lines || []} 
              isReadOnly={true}
              extraColumns={[
                {
                  header: tc('table_headers.received_qty'),
                  cell: (line: any) => (
                    <span dir="ltr" className="font-mono font-bold text-foreground/80">{line.received_qty}</span>
                  )
                },
                {
                  header: tc('table_headers.lot_allocation'),
                  cell: (line: any) => (
                    <span dir="ltr" className="font-mono text-label-xs font-semibold uppercase text-operational-cyan">
                      {line.lot?.lot_number || 'N/A'}
                    </span>
                  )
                }
              ]}
            />
          </div>
        </DocumentReadOnlyOverlay>

        {/* Financial Summary */}
        <div className="flex flex-col md:flex-row justify-end items-start md:items-center gap-8 pt-10">
          <div className="flex flex-col items-end gap-1 px-6 border-e border-surface-container-high/20">
            <p className="text-label-xs font-semibold uppercase text-muted-foreground/50">
              {t('finalized_rate')}
            </p>
            <div className="flex items-center gap-2 text-amber-500">
              <TrendingUp className="w-3 h-3" />
              <p dir="ltr" className="text-label-sm font-mono font-semibold">
                1 {document?.currency_id} = {currentFxRate} {baseCurrency}
              </p>
            </div>
          </div>

          <Card className="bg-surface-container-lowest p-8 rounded-2xl shadow-xl relative overflow-hidden min-w-[340px] group border border-surface-variant/5">
            <div className="absolute top-0 end-0 w-1 h-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-all" />
            <div className="space-y-6 relative z-10">
              <div className="flex justify-between items-baseline gap-10">
                <p className="text-label-xs font-semibold uppercase text-primary/30 group-hover:text-primary transition-colors">{t('receipt_total', { currency: document?.currency_id })}</p>
                <p dir="ltr" className="text-headline-lg font-display font-semibold text-foreground">{totalForeign.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="h-px bg-surface-container-high/20 w-full" />
              <div className="flex justify-between items-center gap-10">
                <p className="text-label-xs font-semibold uppercase text-primary/20">{t('base_value', { currency: baseCurrency })}</p>
                <p dir="ltr" className="text-title-lg font-mono font-semibold text-primary/60">
                  {(totalForeign * currentFxRate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Audit Trail */}
        <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-surface-variant/5">
          <div className="flex items-center gap-3 mb-10">
            <History className="w-4 h-4 text-primary opacity-20" />
            <h3 className="text-label-xs font-semibold uppercase text-primary/30">{tc('audit_trail')}</h3>
          </div>
          <StatusTimeline entries={timelineEntries} />
        </div>

        <div className="flex items-center justify-between pt-12 mt-12 border-t border-surface-variant/10">
          <Button
            variant="ghost"
            type="button"
            onClick={() => router.back()}
            className="text-label-xs font-semibold uppercase text-muted-foreground/40 hover:text-foreground hover:bg-surface-container-high/50 h-12 px-8 rounded-xl transition-all"
          >
            <ArrowLeft className={cn("w-3.5 h-3.5 me-2", locale === 'ar' && "rotate-180")} />
            {tc('back')}
          </Button>
        </div>
      </div>
    </div>
  );
}
