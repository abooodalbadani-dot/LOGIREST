'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { DocumentReadOnlyOverlay } from '@/components/shared/DocumentReadOnlyOverlay';
import { StatusTimeline, type Status } from '@/components/shared/StatusTimeline';

import {
  User,
  Wallet,
  Warehouse,
  Clock,
  FileText,
  Package,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge, type BadgeStatus } from '@/components/shared/StatusBadge';
import { DocumentExportMenu } from '@/components/shared/DocumentExportMenu';
import { StickyGlassHeader } from '@/components/shared/StickyGlassHeader';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { formatCurrency } from '@/utils/currency';
import { type PODetail, type POLine, type AuditLog } from '@/features/purchasing/hooks/usePO';
import { DocumentLineItemTable } from '@/components/shared/DocumentLineItemTable/DocumentLineItemTable';
import { RelationalName } from '@/components/shared/RelationalName';

interface POViewerProps {
  document: PODetail;
  locale: 'ar' | 'en';
  actions?: React.ReactNode;
  onDelete?: () => void;
  isDeletePending?: boolean;
  onApprove?: () => void;
  isApprovePending?: boolean;
  onReject?: () => void;
  isRejectPending?: boolean;
}

/**
 * POViewer - Strict Immutable Rendering for Purchase Orders.
 * Handles read-only display of a PO with high-density mobile optimization.
 */
export function POViewer({
  document,
  locale,
  actions,
  onDelete,
  isDeletePending = false,
  onApprove,
  isApprovePending = false,
  onReject,
  isRejectPending = false,
}: POViewerProps) {
  const t = useTranslations('procurement.po');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const timeline =
    document?.auditLog?.map((log: AuditLog) => ({
      status: log.status.toLowerCase() as Status,
      at: log.createdAt,
      by: log.userName || tCommon('system_user'),
    })) || [];

  interface MappedPOLine {
    id: string;
    item: {
      id: string;
      code: string;
      nameAr: string;
      nameEn: string;
      image?: string | null;
      primaryUom: { code: string };
    };
    qty: number;
    uomId: string;
    unitCost: number;
  }

  const formattedDeliveryDate = React.useMemo(() => {
    const rawDate = document?.expectedDeliveryDate || document?.expectedDate;
    if (!rawDate) return '—';
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return String(rawDate).split('T')[0];
      return d.toISOString().split('T')[0];
    } catch {
      return String(rawDate).split('T')[0];
    }
  }, [document?.expectedDeliveryDate, document?.expectedDate]);

  const documentLines = document?.lines;
  const mappedLines = React.useMemo(() => {
    return (
      documentLines?.map((line: POLine, idx: number) => ({
        id: line.id || String(idx),
        item: {
          id: line.itemId || '',
          code: line.item?.code || line.itemSku || line.itemId || '',
          nameAr: line.item?.nameAr || line.itemName || '',
          nameEn: line.item?.nameEn || line.itemName || '',
          image: line.item?.image || null,
          primaryUom: { code: line.item?.primaryUom?.code || line.uomId || 'EA' },
        },
        uom: line.uom || (line.uomId ? { id: line.uomId, code: line.uomId } : undefined),
        qty: line.quantity ?? 0,
        uomId: line.uomId || 'EA',
        unitCost: line.unitPrice ?? 0,
      })) || []
    );
  }, [documentLines]);

  const currencyCode = document?.currencyCode || 'USD';
  const extraColumns = React.useMemo(
    () => [
      {
        header: t('unit_price'),
        cell: (line: MappedPOLine) => (
          <span dir="ltr" className="font-mono text-label-sm font-bold text-operational-cyan force-latin-numbers">
            {formatCurrency(line.unitCost, currencyCode, locale)}
          </span>
        ),
      },
      {
        header:
          (tCommon.has('subtotal') ? tCommon('subtotal') : null) ||
          (locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal'),
        cell: (line: MappedPOLine) => (
          <span dir="ltr" className="font-mono text-body-md font-semibold text-foreground force-latin-numbers">
            {formatCurrency((line.qty || 0) * (line.unitCost || 0), currencyCode, locale)}
          </span>
        ),
      },
    ],
    [t, tCommon, currencyCode, locale]
  );

  return (
    <div className="space-y-6 md:space-y-10 w-full bg-card border border-border shadow-sm min-h-screen p-4 sm:p-6 lg:p-10 animate-in fade-in duration-500">
      {/* Sticky Header */}
      <StickyGlassHeader
        onBack={() => router.push('/purchase-orders')}
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
          <div className="hidden md:flex items-center gap-3">
            <StatusBadge status={document.status as BadgeStatus} />
            <DocumentExportMenu
              documentType="PO"
              documentId={document.id}
              documentNumber={document.documentNumber}
            />
            {actions && (
              <>
                <div className="w-px h-8 bg-surface-variant/10 mx-1" />
                {actions}
              </>
            )}
          </div>
        }
      />

      {/* 3. Mobile Header Actions (md:hidden) */}
      <div className="flex flex-col gap-3 mb-6 w-full md:hidden">
        <div className="flex justify-between items-center w-full">
          {/* Render Status Badge (e.g., APPROVED / معتمد) */}
          <StatusBadge status={document.status as BadgeStatus} />
          <div className="flex items-center gap-2">
            {/* Render Export (تصدير) Button */}
            <DocumentExportMenu
              documentType="PO"
              documentId={document.id}
              documentNumber={document.documentNumber}
            />
          </div>
        </div>

        {/* Workflow Actions (Email PO, Delete, Fulfill, Approve, Reject, etc.) */}
        {actions && (
          <div className="w-full flex items-center justify-center">
            {actions}
          </div>
        )}
      </div>

      <DocumentReadOnlyOverlay isPosted={document?.status === 'POSTED'}>
        <div className="space-y-6 md:space-y-10">
          {/* 2. Mobile Metadata Compression (The Top Info) */}
          <div className="bg-surface-container-low border border-border rounded-[var(--radius-lg)] p-4 mb-6 md:hidden">
            <div className="grid grid-cols-2 gap-4">
              {/* Supplier Data */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-[11px] font-bold uppercase truncate">{tCommon('supplier')}</span>
                </div>
                <span className="text-sm font-bold text-foreground truncate">
                  <RelationalName name={document?.supplierName} rawId={document?.supplierId} />
                </span>
              </div>

              {/* Currency Data */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Wallet className="w-3.5 h-3.5 text-operational-cyan shrink-0" />
                  <span className="text-[11px] font-bold uppercase truncate">{tCommon('order_currency')}</span>
                </div>
                <span className="text-sm font-bold text-foreground truncate">
                  <RelationalName name={document?.currencyCode} rawId={document?.currencyId} />
                </span>
              </div>

              {/* Warehouse Data */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Warehouse className="w-3.5 h-3.5 text-foreground shrink-0" />
                  <span className="text-[11px] font-bold uppercase truncate">{t('target_warehouse')}</span>
                </div>
                <span className="text-sm font-bold text-foreground truncate">
                  <RelationalName name={document?.warehouseName} rawId={document?.targetWarehouseId} />
                </span>
              </div>

              {/* Date Data (Keep force-latin-numbers on the date value!) */}
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-[11px] font-bold uppercase truncate">{t('expected_delivery_date')}</span>
                </div>
                <span className="text-sm font-bold text-foreground truncate force-latin-numbers" dir="ltr">
                  {formattedDeliveryDate}
                </span>
              </div>
            </div>
          </div>

          {/* Desktop 4-Card Stats (hidden on mobile) */}
          <div className="hidden md:grid md:grid-cols-4 gap-4">
            {[
              {
                label: tCommon('supplier'),
                value: <RelationalName name={document?.supplierName} rawId={document?.supplierId} />,
                icon: User,
                color: 'text-primary',
              },
              {
                label: tCommon('order_currency'),
                value: <RelationalName name={document?.currencyCode} rawId={document?.currencyId} />,
                icon: Wallet,
                color: 'text-operational-cyan',
              },
              {
                label: t('target_warehouse'),
                value: <RelationalName name={document?.warehouseName} rawId={document?.targetWarehouseId} />,
                icon: Warehouse,
                color: 'text-foreground',
              },
              {
                label: t('expected_delivery_date'),
                value: <span className="force-latin-numbers" dir="ltr">{formattedDeliveryDate}</span>,
                icon: Clock,
                color: 'text-amber-500',
              },
            ].map((item, idx) => (
              <Card
                key={idx}
                className="p-5 bg-card border border-border shadow-sm flex flex-col gap-3 rounded-2xl relative overflow-hidden group"
              >
                <div className="flex items-center gap-3 relative z-10">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center shrink-0',
                      item.color
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase truncate">
                    {item.label}
                  </span>
                </div>
                <div className="flex flex-col relative z-10">
                  <span className="text-title-sm font-bold text-foreground line-clamp-1 not-italic">
                    {item.value}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Items Section */}
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center gap-4 px-2">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase text-muted-foreground">{tCommon('items')}</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase mt-0.5">
                  {(tCommon.has('order_details') ? tCommon('order_details') : null) ||
                    (locale === 'ar' ? 'تفاصيل الطلب' : 'Order Details')}
                </p>
              </div>
            </div>

            {/* 4. Mobile Item Cards Layout (md:hidden) */}
            <div className="flex flex-col gap-3 md:hidden">
              {document?.lines?.map((line: POLine, idx: number) => {
                const itemImage = line.item?.image || null;
                const itemName =
                  locale === 'ar'
                    ? line.item?.nameAr || line.itemName || ''
                    : line.item?.nameEn || line.itemName || '';
                const itemCode = line.item?.code || line.itemSku || line.itemId || '';
                const uomDisplay =
                  line.uom?.code || line.uom?.name || line.item?.primaryUom?.code || line.uomId || 'EA';
                const qty = line.quantity ?? 0;
                const unitPrice = line.unitPrice ?? 0;
                const subtotal = qty * unitPrice;

                return (
                  <div
                    key={line.id || idx}
                    className="bg-card border border-border-color rounded-[var(--radius-md)] p-3 flex flex-col gap-3"
                  >
                    {/* Top Row: Left side Unit Badge, Right side Item Name & Image */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {itemImage ? (
                          <img
                            src={itemImage}
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
                        {uomDisplay}
                      </span>
                    </div>

                    {/* Bottom Row: 3 Columns (Qty, Unit Price, Subtotal) */}
                    <div className="grid grid-cols-3 gap-2 border-t border-border-muted pt-2 text-start">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          {tCommon('quantity') || (locale === 'ar' ? 'الكمية' : 'Qty')}
                        </span>
                        <span className="text-body-md font-bold force-latin-numbers text-foreground">
                          {qty}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          {t('unit_price') || (locale === 'ar' ? 'سعر الوحدة' : 'Unit Price')}
                        </span>
                        <span className="text-body-sm force-latin-numbers text-foreground" dir="ltr">
                          {formatCurrency(unitPrice, currencyCode, locale)}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                          {(tCommon.has('subtotal') ? tCommon('subtotal') : null) ||
                            (locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal')}
                        </span>
                        <span className="text-body-sm font-bold text-operational-cyan force-latin-numbers" dir="ltr">
                          {formatCurrency(subtotal, currencyCode, locale)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Mobile Total Card */}
              <div className="bg-card border border-border-color rounded-[var(--radius-md)] p-4 flex justify-between items-center mt-2">
                <span className="text-xs font-bold uppercase text-muted-foreground">
                  {t('order_total') || (locale === 'ar' ? 'إجمالي الأمر' : 'Order Total')}
                </span>
                <span dir="ltr" className="text-headline-sm font-bold text-operational-cyan force-latin-numbers">
                  {formatCurrency(document?.total || 0, currencyCode, locale)}
                </span>
              </div>
            </div>

            {/* Desktop Items Table (hidden on mobile) */}
            <div className="hidden md:block">
              <Card className="bg-card border border-border shadow-sm rounded-[2rem] overflow-hidden p-1">
                <DocumentLineItemTable
                  lines={mappedLines}
                  isReadOnly={true}
                  hideLotColumns={true}
                  extraColumns={extraColumns}
                  noCollapse={true}
                />

                <div className="p-8 bg-card border-t border-border flex justify-end">
                  <div className="flex items-center gap-10">
                    <div className="flex flex-col items-end">
                      <p className="text-xs font-bold uppercase text-muted-foreground">{t('order_total')}</p>
                      <p dir="ltr" className="text-headline-lg font-semibold text-primary force-latin-numbers">
                        {formatCurrency(document?.total || 0, currencyCode, locale)}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </DocumentReadOnlyOverlay>

      {/* Footer / History */}
      <div className="space-y-10">
        {timeline.length > 0 && (
          <div className="bg-card border border-border shadow-sm p-6 sm:p-8 rounded-2xl md:rounded-[2rem] shadow-sm transition-all">
            <div className="flex items-center gap-3 mb-6 md:mb-10">
              <History className="w-4 h-4 text-primary opacity-20" />
              <h3 className="text-xs font-bold uppercase text-primary">{tCommon('audit_trail')}</h3>
            </div>
            <StatusTimeline entries={timeline} />
          </div>
        )}
      </div>
    </div>
  );
}
