'use client';

import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import { formatDate, formatQuantity } from '@/utils/currency';
import type { LotAllocation } from '@/types/documents';
import { useVirtualizer } from '@tanstack/react-virtual';
import { RelationalName } from '@/components/shared/RelationalName';

export interface LineItem {
  id: string;
  item: { id: string; code: string; name?: string; nameAr?: string; nameEn?: string; image?: string | null; primaryUom?: { code: string; name?: string } | null; category?: { id: string; name: string } | null };
  lot?: { lotNumber: string; expiryDate: string | null } | null;
  qty: number;
  uomId: string;
  unitCost?: number | null;
  lotAllocations?: LotAllocation[];
}

export interface ExtraColumn<T extends LineItem = LineItem> {
  header: string;
  cell: (line: T) => React.ReactNode;
  mobileOrder?: number;
  mobileWidth?: string;
  headerClassName?: string;
  cellClassName?: string;
  isAction?: boolean;
}

interface DocumentLineItemTableProps<T extends LineItem = LineItem> {
  lines: T[];
  extraColumns?: ExtraColumn<T>[];
  onRemoveLine?: (lineId: string) => void;
  isReadOnly?: boolean;
  /** Optional locale override (defaults to useLocale() internally). */
  locale?: 'ar' | 'en';
  /** Override header labels. Defaults to English. */
  headers?: {
    code?: string;
    name?: string;
    lot?: string;
    expiry?: string;
    qty?: string;
    uom?: string;
  };
  /** Suppress lot/expiry columns entirely (e.g. for adjustments). Default false. */
  hideLotColumns?: boolean;
  /** Custom renderer for the quantity cell. */
  renderQty?: (line: T) => React.ReactNode;
  /** Custom renderer for the UOM cell. */
  renderUom?: (line: T) => React.ReactNode;
  /** High density mode (ultra-dense alternating borderless grid layout) */
  dense?: boolean;
  /** Enable virtualization. Default: true. */
  enableVirtualization?: boolean;
  /** Maximum height of the scrollable container. Default: '480px'. */
  maxHeight?: string;
  /** Expose internal virtualizer instance to parent */
  virtualizerRef?: React.MutableRefObject<unknown>;
  /** Apply custom classes to table rows based on line state */
  rowClassName?: (line: T, index: number) => string;
  /** Layout mode: traditional horizontal table or two-tier master-detail card stack */
  layoutMode?: 'table' | 'two-tier';
  /** Suppress external card wrapper styling (no outer border/bg/shadow) */
  borderless?: boolean;
  /** Suppress UOM column entirely (render UOM badge inside name/code cell) */
  hideUomColumn?: boolean;
  /** Prevent collapsing into vertical cards on mobile viewports */
  noCollapse?: boolean;
  /** Custom renderer for additional details in the item name column. */
  renderItemDescription?: (line: T) => React.ReactNode;
  /** Custom mobile layout pattern: e.g. 'issue-form' for side-by-side inputs and action below. */
  mobileLayoutPattern?: 'standard' | 'issue-form' | 'adjustment-form' | 'variance-form' | 'elegant' | 'transfer-form' | 'purchase-request-form' | 'goods-received-form';
}


export function DocumentLineItemTable<T extends LineItem>({
  lines,
  extraColumns = [],
  onRemoveLine,
  isReadOnly,
  headers = {},
  hideLotColumns = false,
  renderQty,
  renderUom,
  dense = false,
  enableVirtualization = false,
  maxHeight = '480px',
  virtualizerRef,
  rowClassName,
  layoutMode = 'table',
  borderless = false,
  hideUomColumn = false,
  noCollapse = true,
  renderItemDescription,
  mobileLayoutPattern = 'standard',
}: DocumentLineItemTableProps<T>) {
  const t = useTranslations('common.table_headers');
  const tc = useTranslations('common');
  const ta = useTranslations('operations.adjustment');
  const locale = useLocale();

  const renderAdjustmentMobileCard = (line: T) => {
    const isUnitCostCol = (header: string) => header === 'Unit Cost' || header === 'تكلفة الوحدة' || header.toLowerCase().includes('cost') || header.includes('تكلفة');
    const isDirectionCol = (header: string) => header === 'Direction' || header === 'الاتجاه' || header.toLowerCase().includes('direction') || header.includes('اتجاه');
    const isBeforeCol = (header: string) => header === 'Qty Before' || header === 'قبل' || header.toLowerCase().includes('before') || header.includes('قبل');
    const isAfterCol = (header: string) => header === 'Qty After' || header === 'بعد التعديل' || header.toLowerCase().includes('after') || header.includes('بعد');
    const isLotCol = (header: string) => header === 'Lot' || header === 'الدفعة' || header === 'Lot Number' || header === 'رقم الدفعة' || header.toLowerCase().includes('lot') || header.includes('دفعة');

    const unitCostCol = extraColumns.find(c => isUnitCostCol(c.header));
    const directionCol = extraColumns.find(c => isDirectionCol(c.header));
    const beforeCol = extraColumns.find(c => isBeforeCol(c.header));
    const afterCol = extraColumns.find(c => isAfterCol(c.header));
    const lotCol = extraColumns.find(c => isLotCol(c.header));

    const matchedCols = [unitCostCol, directionCol, beforeCol, afterCol, lotCol].filter(Boolean);
    const remainingCols = extraColumns.filter(c => !matchedCols.includes(c));

    const isAdjustmentLine = (l: unknown): l is { direction: 'INCREASE' | 'DECREASE'; qtyBefore?: number; unitCost?: number | null } => {
      return typeof l === 'object' && l !== null && 'direction' in l;
    };
    const adjLine = isAdjustmentLine(line) ? line : undefined;

    const afterQty = adjLine?.direction === 'INCREASE'
      ? (adjLine?.qtyBefore ?? 0) + line.qty
      : (adjLine?.qtyBefore ?? 0) - line.qty;

    return (
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl dark:bg-slate-800/40 dark:border-slate-700/50 flex flex-col w-full mb-4 relative overflow-hidden">
        {/* Header Section */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-start w-full">
          <div className="flex flex-col gap-1 min-w-0 flex-1 text-start">
            <span className="font-bold text-slate-900 dark:text-white text-sm truncate block">
              {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
            </span>
            <span className="font-bold text-brand-gold text-sm truncate block">
              &lrm;{line.item.code}
            </span>
            {renderItemDescription?.(line as T)}
          </div>
          <div className="flex items-center gap-3">
            {!isReadOnly && onRemoveLine && (
              <button
                type="button"
                onClick={() => onRemoveLine(line.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors flex items-center justify-center bg-transparent shrink-0"
                aria-label={tc('actions.remove_line')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {line.item.image ? (
              <img src={line.item.image} alt="Product" className="w-10 h-10 object-cover rounded-md border border-slate-200 dark:border-slate-700/50 shrink-0" />
            ) : (
              <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700/50 text-[10px] text-slate-500 font-mono shrink-0">
                N/A
              </div>
            )}
          </div>
        </div>

        {/* Body Section */}
        <div className="p-3 flex flex-col gap-3 w-full text-start text-xs">
          {!isReadOnly ? (
            <>
              {/* Row 1: Qty & Direction in ONE ROW */}
              <div className="grid grid-cols-2 gap-3 w-full items-center">
                {/* Qty & Unit */}
                <div className="flex flex-col gap-1 w-full min-w-0">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {locale === 'ar' ? 'المعدل' : 'Adjustment'}
                  </span>
                  <div className="flex items-center gap-1.5 w-full">
                    <div className="flex-1 min-w-0">
                      {renderQty ? renderQty(line) : formatQuantity(line.qty, locale as 'ar' | 'en')}
                    </div>
                    <span className="uppercase text-[10px] font-bold text-slate-400 shrink-0">
                      {line.item.primaryUom?.name || line.item.primaryUom?.code || 'TU'}
                    </span>
                  </div>
                </div>

                {/* Direction */}
                <div className="flex flex-col gap-1 w-full min-w-0">
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {locale === 'ar' ? 'الاتجاه' : 'Direction'}
                  </span>
                  <div className="w-full flex justify-end">
                    {directionCol ? directionCol.cell(line) : null}
                  </div>
                </div>
              </div>

              {/* Row 2: Unit Cost & Lot in ONE ROW */}
              <div className="grid grid-cols-2 gap-3 w-full items-center">
                {/* Unit Cost */}
                <div className="flex flex-col gap-1 w-full min-w-0">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {locale === 'ar' ? 'تكلفة الوحدة' : 'Unit Cost'}
                  </span>
                  <div className="w-full">
                    {unitCostCol ? unitCostCol.cell(line) : null}
                  </div>
                </div>

                {/* Lot */}
                <div className="flex flex-col gap-1 w-full min-w-0">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {locale === 'ar' ? 'الدفعة' : 'Lot'}
                  </span>
                  <div className="w-full">
                    {lotCol ? lotCol.cell(line) : null}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* ReadOnly Layout: Compact 2-column view */}
              <div className="grid grid-cols-2 gap-3 w-full items-center">
                {/* Qty + Direction */}
                <div className="flex justify-between items-center text-sm w-full gap-2">
                  <span className="text-slate-900 dark:text-white shrink-0">{locale === 'ar' ? 'المعدل' : 'Adjustment'}</span>
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-end gap-1" dir="ltr">
                    <span className="font-mono">{formatQuantity(line.qty, locale as 'ar' | 'en')}</span>
                    <span className="uppercase text-xs text-slate-500 ms-1">{line.item.primaryUom?.code || 'TU'}</span>
                    {adjLine && (
                      adjLine.direction === 'INCREASE' ? (
                        <span className="text-emerald-500 text-[10px] font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded ms-1">{locale === 'ar' ? 'زيادة ↑' : 'Inc ↑'}</span>
                      ) : (
                        <span className="text-red-500 text-[10px] font-bold bg-red-500/10 px-1.5 py-0.5 rounded ms-1">{locale === 'ar' ? 'نقصان ↓' : 'Dec ↓'}</span>
                      )
                    )}
                  </div>
                </div>

                {/* Unit Cost */}
                {unitCostCol && (
                  <div className="flex justify-between items-center text-sm w-full gap-2">
                    <span className="text-slate-900 dark:text-white shrink-0">{locale === 'ar' ? 'تكلفة الوحدة' : 'Unit Cost'}</span>
                    <div className="flex-1 flex justify-end truncate">
                      {unitCostCol.cell(line)}
                    </div>
                  </div>
                )}
              </div>

              {/* Lot if present */}
              {lotCol && (
                <div className="flex justify-between items-center text-sm w-full gap-2">
                  <span className="text-slate-900 dark:text-white shrink-0">{locale === 'ar' ? 'الدفعة' : 'Lot'}</span>
                  <div className="flex-1 flex justify-end overflow-hidden">
                    {lotCol.cell(line)}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Remaining columns if any */}
          {remainingCols.map((col, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm w-full gap-2 mt-1">
              <span className="text-slate-900 dark:text-white shrink-0">{col.header}</span>
              <div className="flex-1 flex justify-end truncate">
                {col.cell(line)}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Section: Stock Impact */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-b-xl flex justify-between items-center text-sm border-t border-slate-100 dark:border-slate-700/50 w-full">
          <div className="flex items-center gap-2 font-mono" dir="ltr">
            <span className="text-slate-500">{formatQuantity(adjLine?.qtyBefore ?? 0, locale as 'ar' | 'en')}</span>
            <span className="text-slate-400">➔</span>
            <span className={cn("font-bold text-base", afterQty < 0 ? "text-red-500" : "text-emerald-500 dark:text-emerald-400")}>
              {formatQuantity(afterQty, locale as 'ar' | 'en')}
            </span>
          </div>
          <span className="text-slate-500 font-medium text-xs">{locale === 'ar' ? 'تأثير المخزون' : 'Stock Impact'}</span>
        </div>

        {/* Error if negative */}
        {afterQty < 0 && (
          <div className="mx-3 mb-3 bg-red-500/10 text-red-500 p-2 rounded-md text-xs font-medium text-center border border-red-500/20">
            {ta('errors.exceeds_available_stock') || (locale === 'ar' ? 'يتجاوز المخزون المتاح' : 'Exceeds available stock')}
          </div>
        )}
      </div>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      const activeEl = document.activeElement as HTMLInputElement;
      if (activeEl && activeEl.tagName === 'INPUT' && (activeEl.type === 'number' || activeEl.type === 'text')) {
        e.preventDefault();
        const container = e.currentTarget;
        const inputs = Array.from(container.querySelectorAll('input:not([disabled])')) as HTMLInputElement[];
        const currentIndex = inputs.indexOf(activeEl);
        if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
          inputs[currentIndex + 1].focus();
          inputs[currentIndex + 1].select();
        }
      }
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const activeEl = document.activeElement as HTMLInputElement;
      if (activeEl && activeEl.tagName === 'INPUT' && (activeEl.type === 'number' || activeEl.type === 'text')) {
        e.preventDefault();
        const container = e.currentTarget;
        const inputs = Array.from(container.querySelectorAll('input:not([disabled])')) as HTMLInputElement[];
        const currentIndex = inputs.indexOf(activeEl);
        if (e.key === 'ArrowDown' && currentIndex >= 0 && currentIndex < inputs.length - 1) {
          inputs[currentIndex + 1].focus();
          inputs[currentIndex + 1].select();
        } else if (e.key === 'ArrowUp' && currentIndex > 0) {
          inputs[currentIndex - 1].focus();
          inputs[currentIndex - 1].select();
        }
      }
    }
  };

  const isActionColumn = (col: ExtraColumn<T>) => {
    return !!(col.isAction || col.header === tc('table_headers.lot_allocation') || col.header === 'Lot Allocation' || col.header === 'تخصيص الدفعة' || col.header === 'تخصيص الحصة');
  };

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (dense ? 48 : 64),
    overscan: 10,
    enabled: enableVirtualization,
  });

  if (virtualizerRef) {
    virtualizerRef.current = rowVirtualizer;
  }

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? virtualRows?.[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows?.[virtualRows.length - 1]?.end || 0)
      : 0;

  const h = {
    code: headers.code ?? t('code'),
    name: headers.name ?? t('name'),
    lot: headers.lot ?? t('lot'),
    expiry: headers.expiry ?? t('expiry'),
    qty: headers.qty ?? t('qty'),
    uom: headers.uom ?? t('uom'),
  };

  const baseCols = (hideLotColumns ? 3 : 5) - (hideUomColumn ? 1 : 0);
  const totalCols = baseCols + extraColumns.length + (!isReadOnly && onRemoveLine ? 1 : 0);

  return (
    <div
      ref={parentRef}
      className={cn(
        layoutMode === 'two-tier'
          ? "w-full overflow-y-auto custom-scrollbar p-2 bg-[#0B1220]"
          : borderless
            ? "w-full overflow-x-auto relative custom-scrollbar bg-transparent p-1 md:p-0"
            : "w-full overflow-x-auto relative custom-scrollbar rounded-xl border border-border bg-card shadow-sm",
        dense ? "border-border/80" : ""
      )}
      style={enableVirtualization || layoutMode === 'two-tier' ? { maxHeight, overflowY: 'auto' } : {}}
      onKeyDown={handleKeyDown}
    >
      <table className={cn(
        layoutMode === 'two-tier'
          ? "w-full block text-start"
          : "w-full min-w-full text-start border-collapse text-sm whitespace-nowrap"
      )}>
        <thead className={cn(
          layoutMode === 'two-tier' ? "hidden" : noCollapse ? "table-header-group bg-card border-b border-border text-muted-foreground text-xs uppercase tracking-wider sticky top-0 z-20" : "hidden md:table-header-group bg-card border-b border-border text-muted-foreground text-xs uppercase tracking-wider sticky top-0 z-20",
          dense ? "border-b border-border" : ""
        )}>
          <tr>
            <th className={cn("sticky start-0 z-20 bg-card border-e border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] px-6 py-4 font-medium text-start whitespace-nowrap text-muted-foreground", noCollapse ? "w-auto min-w-[130px] md:min-w-[180px]" : mobileLayoutPattern === 'transfer-form' ? "w-[250px] min-w-[250px]" : "w-full min-w-[120px] md:min-w-[180px]", dense ? "px-3 py-2 h-9 text-[10px]" : "px-8 h-14")}>{h.name}</th>
            {!hideLotColumns && (
              <>
                <th className={cn("px-6 py-4 font-medium text-start whitespace-nowrap text-muted-foreground", noCollapse ? "table-cell" : "hidden md:table-cell", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{h.lot}</th>
                <th className={cn("px-6 py-4 font-medium text-start whitespace-nowrap text-muted-foreground", noCollapse ? "table-cell" : "hidden md:table-cell", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{h.expiry}</th>
              </>
            )}
            <th className={cn("px-6 py-4 font-medium text-center whitespace-nowrap text-muted-foreground", noCollapse ? "min-w-[85px] md:min-w-[120px]" : mobileLayoutPattern === 'transfer-form' ? "w-[140px] min-w-[130px]" : "min-w-[120px]", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{h.qty}</th>
            {!hideUomColumn && (
              <th className={cn("px-6 py-4 font-medium text-start whitespace-nowrap text-muted-foreground", noCollapse ? "table-cell" : "hidden md:table-cell", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{h.uom}</th>
            )}
            {extraColumns.map((col, i) => (
              <th key={i} className={cn("px-6 py-4 font-medium text-center whitespace-nowrap text-muted-foreground", col.headerClassName, dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{col.header}</th>
            ))}
            {!isReadOnly && onRemoveLine && (
              <th className={cn("px-6 py-4 font-medium whitespace-nowrap w-10 text-muted-foreground", dense ? "px-3 py-2 h-9" : "px-6 h-14")} />
            )}
          </tr>
        </thead>
        <tbody className={cn(layoutMode === 'two-tier' ? "block w-full" : "")}>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={totalCols} className={cn("text-center", dense ? "px-4 py-10" : "px-8 py-20")}>
                <p className={cn("text-label-xs font-semibold uppercase text-muted-foreground/20 italic")}>{tc('no_items')}</p>
              </td>
            </tr>
          ) : enableVirtualization ? (
            <>
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} colSpan={totalCols} />
                </tr>
              )}
              {virtualRows.map((virtualRow) => {
                const line = lines[virtualRow.index];
                const idx = virtualRow.index;
                const itemColSpan = (!isReadOnly && onRemoveLine) ? "md:col-span-4" : "md:col-span-5";
                return (
                  <tr
                    key={line.id}
                    ref={rowVirtualizer.measureElement}
                    data-index={virtualRow.index}
                    className={cn(
                      layoutMode === 'two-tier'
                        ? "flex flex-col md:grid md:grid-cols-12 gap-4 p-5 mb-4 border border-brand-gold/20 hover:border-brand-gold/40 bg-card rounded-2xl shadow-lg transition-all w-full items-center"
                        : noCollapse
                          ? "border-b border-border last:border-0 hover:bg-muted/50 transition-colors group table-row"
                          : "border-b border-border last:border-0 hover:bg-muted/50 transition-colors group flex flex-col border-b border-brand-gold/10 w-full md:table-row md:border-b md:border-border/50 md:bg-transparent md:p-0 md:mb-0 md:rounded-none shadow-none",
                      rowClassName?.(line, idx)
                    )}
                    style={layoutMode === 'two-tier' ? {} : { minHeight: `${dense ? 48 : 64}px` }}
                  >
                    {layoutMode === 'two-tier' ? (
                      <>
                        {/* Item Info Cell */}
                        <td className={cn("block border-none bg-transparent w-full p-0", itemColSpan)}>
                          <div className="flex items-center gap-3 w-full">
                            {line.item.image ? (
                              <img src={line.item.image} alt="Product" className="w-12 h-12 object-cover rounded-lg border border-gray-750 shrink-0" />
                            ) : (
                              <div className="w-15 h-15 bg-surface-container flex items-center justify-center rounded-lg border border-gray-750 text-xs text-muted-foreground font-mono shrink-0">
                                N/A
                              </div>
                            )}
                            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                              <span className="font-bold text-base md:text-lg text-white">
                                {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 font-mono tracking-wider uppercase" dir="ltr">
                                  {line.item.code}
                                </span>
                                {hideUomColumn && (
                                  <span className="text-[10px] bg-brand-gold/10 border border-brand-gold/30 text-brand-gold px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                    {line.item.primaryUom?.name || line.item.primaryUom?.code || 'PCS'}
                                  </span>
                                )}
                              </div>
                              {renderItemDescription?.(line as T)}
                            </div>
                            {/* Remove line button (only on mobile viewports; hidden on desktop where it has its own column) */}
                            <div className="md:hidden">
                              {!isReadOnly && onRemoveLine && (
                                <button
                                  type="button"
                                  onClick={() => onRemoveLine(line.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50/10 dark:hover:bg-red-500/10 rounded-md transition-colors flex items-center justify-center bg-transparent shrink-0"
                                  aria-label={tc('actions.remove_line')}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* PO Qty Cell */}
                        <td className="block border-none bg-transparent w-full md:col-span-2 p-0">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-gray-400 uppercase tracking-wider">{h.qty}</label>
                            {renderQty ? (
                              renderQty(line)
                            ) : (
                              <div dir="ltr" data-numeric="true" className="bg-transparent border border-gray-700 rounded-md p-2 text-white font-mono flex items-center h-10 select-none">
                                {line.qty}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* UOM */}
                        {!hideUomColumn && (
                          <td className="block border-none bg-transparent w-full md:col-span-2 p-0">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-gray-400 uppercase tracking-wider">{h.uom}</label>
                              {renderUom ? (
                                renderUom(line)
                              ) : (
                                <div className="bg-transparent border border-gray-600 rounded-md p-2 text-white uppercase flex items-center h-10">
                                  {line.item.primaryUom?.name || line.item.primaryUom?.code || 'N/A'}
                                </div>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Received Qty / Non-action Columns Cell */}
                        {extraColumns.filter(col => !isActionColumn(col)).map((col, i) => (
                          <td key={i} className="block border-none bg-transparent w-full md:col-span-2 p-0">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] text-gray-400 uppercase tracking-wider">{col.header}</label>
                              <div className="w-full">
                                {col.cell(line)}
                              </div>
                            </div>
                          </td>
                        ))}

                        {/* Action Columns Cell */}
                        {extraColumns.filter(col => isActionColumn(col)).map((col, i) => (
                          <td key={i} className="block border-none bg-transparent w-full md:col-span-3 p-0">
                            <div className="flex flex-col gap-1 md:justify-end">
                              <label className="text-[10px] text-gray-400 uppercase tracking-wider hidden md:block">&nbsp;</label>
                              <div className="w-full">
                                {col.cell(line)}
                              </div>
                            </div>
                          </td>
                        ))}

                        {/* Desktop-only Remove Line Column */}
                        {!isReadOnly && onRemoveLine && (
                          <td className="hidden md:block border-none bg-transparent md:col-span-1 p-0 text-center">
                            <div className="flex flex-col gap-1 md:justify-end h-full">
                              <label className="text-[10px] text-gray-400 uppercase tracking-wider hidden md:block">&nbsp;</label>
                              <button
                                type="button"
                                onClick={() => onRemoveLine(line.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50/10 dark:hover:bg-red-500/10 rounded-md transition-colors flex items-center justify-center bg-transparent mx-auto"
                                aria-label={tc('actions.remove_line')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Mobile card layout */}
                        {!noCollapse && (
                          <td className="block w-full p-0 border-none bg-transparent md:hidden mb-4">
                            {mobileLayoutPattern === 'transfer-form' ? (
                              <div className="flex flex-col bg-card border border-border shadow-sm rounded-xl p-3 transition-all mb-1">
                                {/* Header: Identity + Actions */}
                                <div className="flex items-start gap-2 mb-3">
                                  {line.item.image ? (
                                    <img src={line.item.image} alt="Product" className="w-10 h-10 object-cover rounded-md border border-border shrink-0" />
                                  ) : (
                                    <div className="w-10 h-10 bg-surface flex items-center justify-center rounded-md border border-border text-[9px] text-muted-foreground font-mono shrink-0">N/A</div>
                                  )}
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="text-[13px] font-bold text-foreground leading-tight whitespace-normal mb-1">
                                      {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0">
                                      <span className="font-mono tracking-wider uppercase" dir="ltr">{line.item.code}</span>
                                      {hideUomColumn && (
                                        <span className="text-[9px] bg-brand-gold/10 border border-brand-gold/30 text-brand-gold px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                                          {line.item.primaryUom?.name || line.item.primaryUom?.code || 'PCS'}
                                        </span>
                                      )}
                                    </div>
                                    {renderItemDescription && (
                                      <div className="mt-1">
                                        {renderItemDescription(line as T)}
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {/* Delete Button */}
                                    {!isReadOnly && onRemoveLine && (
                                      <button
                                        type="button"
                                        onClick={() => onRemoveLine(line.id)}
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10 border border-transparent rounded-md transition-colors flex items-center justify-center shrink-0"
                                        aria-label={tc('actions.remove_line')}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Body: QTY and Notes side by side */}
                                <div className="flex items-end gap-3 bg-slate-50 dark:bg-slate-900/40 border border-border/50 rounded-lg p-2.5">
                                  {/* QTY (Smaller) */}
                                  <div className="flex flex-col gap-1 w-2/5 shrink-0">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest truncate">{h.qty}</span>
                                    <div className="w-full">
                                      {renderQty ? renderQty(line) : (
                                        <div className="text-sm font-black text-foreground font-mono bg-background border border-border rounded-md px-2 h-9 flex items-center" dir="ltr">{line.qty}</div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Extra Columns (e.g. Notes - Larger) */}
                                  {extraColumns.map((col, i) => (
                                    <div key={i} className="flex flex-col gap-1 flex-1 min-w-0">
                                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest truncate">{col.header}</span>
                                      <div className="w-full h-9 flex items-center">
                                        {col.cell(line)}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Lot Allocation */}
                                {!hideLotColumns && (line.lot || line.lotAllocations?.length ? (
                                  <div className="flex items-center justify-between gap-3 px-1 pt-3">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">{h.lot}</span>
                                    <div className="font-mono text-xs text-foreground">
                                      {line.lot ? (
                                        <span dir="ltr">{line.lot.lotNumber}</span>
                                      ) : line.lotAllocations?.[0]?.lotNumber ? (
                                        <span dir="ltr">{line.lotAllocations.map(a => a.lotNumber).join(', ')}</span>
                                      ) : (
                                        <span className="text-muted-foreground/50">{tc('no_lot')}</span>
                                      )}
                                    </div>
                                  </div>
                                ) : null)}
                              </div>
                            ) : mobileLayoutPattern === 'goods-received-form' ? (
                              <div className="flex flex-col bg-card border border-border shadow-sm rounded-2xl p-4 transition-all mb-3 hover:border-brand-gold/30">
                                {/* Header: Image + Item Name + UOM Badge + Item Code on Start side, Lot Allocation & Delete Button on End side */}
                                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mb-3 pb-3 border-b border-border/40">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {line.item.image ? (
                                      <img src={line.item.image} alt="Product" className="w-11 h-11 object-cover rounded-xl border border-border shrink-0 shadow-sm" />
                                    ) : (
                                      <div className="w-11 h-11 bg-surface flex items-center justify-center rounded-xl border border-border text-[10px] text-muted-foreground font-mono shrink-0">N/A</div>
                                    )}
                                    <div className="flex flex-col min-w-0 flex-1 text-start items-start">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold text-foreground leading-tight truncate">
                                          {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                                        </span>
                                        {line.item.primaryUom && (
                                          <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-md uppercase shrink-0">
                                            {line.item.primaryUom.code || line.item.primaryUom.name}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase mt-0.5 text-start rtl:text-right ltr:text-left" dir="ltr">{line.item.code}</span>
                                      {renderItemDescription && (
                                        <div className="mt-1">
                                          {renderItemDescription(line as T)}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Header End Side: Lot Allocation Button + Delete Button */}
                                  <div className="flex items-center gap-2 shrink-0 sm:self-center ms-auto">
                                    {extraColumns.filter(col =>
                                      col.header.toLowerCase().includes('lot') ||
                                      col.header.toLowerCase().includes('allocat') ||
                                      col.header.includes('تخصيص') ||
                                      col.isAction
                                    ).map((col, i) => (
                                      <div key={i} className="shrink-0 flex items-center [&_button]:h-9 [&_button]:px-3 [&_button]:text-xs [&_button]:font-bold [&_button]:rounded-xl [&_button]:shadow-sm">
                                        {col.cell(line)}
                                      </div>
                                    ))}

                                    {!isReadOnly && onRemoveLine && (
                                      <button
                                        type="button"
                                        onClick={() => onRemoveLine(line.id)}
                                        className="h-9 w-9 text-destructive hover:bg-destructive/10 border border-transparent rounded-xl transition-colors flex items-center justify-center shrink-0 ms-1"
                                        aria-label={tc('actions.remove_line')}
                                      >
                                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Body / Bottom Row: QTY + Received QTY (50/50 Equal Width Grid) */}
                                <div className="bg-slate-50/70 dark:bg-slate-900/40 border border-border/50 rounded-xl p-3">
                                  <div className="grid grid-cols-2 gap-3 w-full items-center">
                                    {/* PO QTY */}
                                    {line.qty !== undefined && (
                                      <div className="flex flex-col gap-1 w-full text-center">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center truncate">{h.qty}</span>
                                        <div className="text-sm font-black text-foreground font-mono bg-background border border-border rounded-xl px-2 h-10 flex items-center justify-center w-full" dir="ltr">
                                          {line.qty}
                                        </div>
                                      </div>
                                    )}

                                    {/* Received Qty (Non-action extraColumns) */}
                                    {extraColumns.filter(col =>
                                      !col.header.toLowerCase().includes('lot') &&
                                      !col.header.toLowerCase().includes('allocat') &&
                                      !col.header.includes('تخصيص') &&
                                      !col.isAction
                                    ).map((col, i) => (
                                      <div key={i} className="flex flex-col gap-1 w-full text-center">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center truncate">{col.header}</span>
                                        <div className="w-full flex items-center justify-center h-10">
                                          {col.cell(line)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ) : mobileLayoutPattern === 'purchase-request-form' ? (
                              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3.5 bg-card border border-border rounded-2xl shadow-sm transition-all mb-2 hover:border-brand-gold/30">
                                {/* Identity: Image + Name + Code + UOM Badge */}
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {line.item.image ? (
                                    <img src={line.item.image} alt="Product" className="w-10 h-10 object-cover rounded-xl border border-border shrink-0 shadow-sm" />
                                  ) : (
                                    <div className="w-10 h-10 bg-surface flex items-center justify-center rounded-xl border border-border text-[9px] text-muted-foreground font-mono shrink-0">N/A</div>
                                  )}
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-bold text-foreground leading-tight truncate">
                                        {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                                      </span>
                                      {line.item.primaryUom && (
                                        <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-md uppercase shrink-0">
                                          {line.item.primaryUom.code || line.item.primaryUom.name}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mt-0.5" dir="ltr">{line.item.code}</span>
                                    {renderItemDescription && (
                                      <div className="mt-0.5">
                                        {renderItemDescription(line as T)}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Right side controls: QTY Input + Delete Button in same row */}
                                <div className="flex items-center gap-3 shrink-0 ms-auto">
                                  {/* QTY Input */}
                                  <div className="w-28 sm:w-32 shrink-0 flex flex-col items-center">
                                    {renderQty ? renderQty(line) : (
                                      <div className="text-sm font-black text-foreground font-mono bg-background border border-border rounded-xl px-2 h-10 flex items-center justify-center w-full" dir="ltr">{line.qty}</div>
                                    )}
                                  </div>

                                  {/* Delete Button */}
                                  {!isReadOnly && onRemoveLine && (
                                    <button
                                      type="button"
                                      onClick={() => onRemoveLine(line.id)}
                                      className="h-9 w-9 text-destructive hover:bg-destructive/10 border border-transparent rounded-xl transition-colors flex items-center justify-center shrink-0"
                                      aria-label={tc('actions.remove_line')}
                                    >
                                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : mobileLayoutPattern === 'adjustment-form' ? (
                              <div className="flex flex-col bg-card border border-border shadow-sm rounded-2xl p-4 transition-all mb-3 hover:border-brand-gold/30">
                                {/* Header: Identity + Direction (in header) + Actions */}
                                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mb-3 pb-3 border-b border-border/40">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {line.item.image ? (
                                      <img src={line.item.image} alt="Product" className="w-11 h-11 object-cover rounded-xl border border-border shrink-0 shadow-sm" />
                                    ) : (
                                      <div className="w-11 h-11 bg-surface flex items-center justify-center rounded-xl border border-border text-[10px] text-muted-foreground font-mono shrink-0">N/A</div>
                                    )}
                                    <div className="flex flex-col min-w-0 flex-1 text-start items-start">
                                      <span className="text-sm font-bold text-foreground leading-tight truncate">
                                        {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                                      </span>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase text-start rtl:text-right ltr:text-left" dir="ltr">{line.item.code}</span>
                                        {line.item.primaryUom && (
                                          <span className="text-[9px] bg-secondary/60 text-secondary-foreground px-1.5 py-0.5 rounded-md font-semibold uppercase">
                                            {line.item.primaryUom.code || line.item.primaryUom.name}
                                          </span>
                                        )}
                                      </div>
                                      {renderItemDescription && (
                                        <div className="mt-1">
                                          {renderItemDescription(line as T)}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Direction (In Header next to Item Name) & Actions */}
                                  <div className="flex items-center gap-2 shrink-0 sm:self-center ms-auto">
                                    {extraColumns.filter(col =>
                                      col.header.toLowerCase().includes('direction') ||
                                      col.header.includes('اتجاه')
                                    ).map((col, i) => (
                                      <div key={i} className="shrink-0 flex items-center [&_div]:h-9 [&_div]:w-auto [&_div]:min-w-[120px] [&_button]:h-7 [&_button]:px-2 [&_button]:text-[10px]">
                                        {col.cell(line)}
                                      </div>
                                    ))}

                                    {/* Delete Button */}
                                    {!isReadOnly && onRemoveLine && (
                                      <button
                                        type="button"
                                        onClick={() => onRemoveLine(line.id)}
                                        className="h-9 w-9 text-destructive hover:bg-destructive/10 border border-transparent rounded-xl transition-colors flex items-center justify-center shrink-0 ms-1"
                                        aria-label={tc('actions.remove_line')}
                                      >
                                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Body: QTY and Cost (Equal 50/50 sizes side-by-side, centered) */}
                                <div className="flex flex-col gap-3 bg-slate-50/70 dark:bg-slate-900/40 border border-border/50 rounded-xl p-3">
                                  <div className="grid grid-cols-2 gap-3 w-full items-center">
                                    {/* QTY */}
                                    <div className="flex flex-col gap-1 w-full text-center">
                                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center truncate">{h.qty}</span>
                                      <div className="w-full flex items-center justify-center">
                                        {renderQty ? renderQty(line) : (
                                          <div className="text-sm font-black text-foreground font-mono bg-background border border-border rounded-xl px-2 h-11 flex items-center justify-center w-full" dir="ltr">{line.qty}</div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Cost */}
                                    {extraColumns.filter(col =>
                                      col.header.toLowerCase().includes('cost') ||
                                      col.header.includes('تكلفة')
                                    ).map((col, i) => (
                                      <div key={i} className="flex flex-col gap-1 w-full text-center">
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center truncate">{col.header}</span>
                                        <div className="w-full flex items-center justify-center h-11">
                                          {col.cell(line)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Lot Number (Full width in last row) */}
                                  {extraColumns.filter(col =>
                                    col.header.toLowerCase().includes('lot') ||
                                    col.header.includes('دفعة')
                                  ).map((col, i) => (
                                    <div key={i} className="flex flex-col gap-1 w-full mt-1 pt-2 border-t border-border/30">
                                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest truncate">{col.header}</span>
                                      <div className="w-full">
                                        {col.cell(line)}
                                      </div>
                                    </div>
                                  ))}

                                  {/* Any other extra columns */}
                                  {extraColumns.filter(col =>
                                    !col.header.toLowerCase().includes('direction') &&
                                    !col.header.includes('اتجاه') &&
                                    !col.header.toLowerCase().includes('cost') &&
                                    !col.header.includes('تكلفة') &&
                                    !col.header.toLowerCase().includes('lot') &&
                                    !col.header.includes('دفعة')
                                  ).map((col, i) => (
                                    <div key={i} className="flex flex-col gap-1 w-full mt-1 pt-2 border-t border-border/30">
                                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest truncate">{col.header}</span>
                                      <div className="w-full">
                                        {col.cell(line)}
                                      </div>
                                    </div>
                                  ))}

                                  {/* Built-in Lot Allocation */}
                                  {!hideLotColumns && (line.lot || line.lotAllocations?.length ? (
                                    <div className="flex items-center justify-between gap-3 px-1 pt-2 border-t border-border/30">
                                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{h.lot}</span>
                                      <div className="font-mono text-xs text-foreground">
                                        {line.lot ? (
                                          <span dir="ltr">{line.lot.lotNumber}</span>
                                        ) : line.lotAllocations?.[0]?.lotNumber ? (
                                          <span dir="ltr">{line.lotAllocations.map(a => a.lotNumber).join(', ')}</span>
                                        ) : (
                                          <span className="text-muted-foreground/50">{tc('no_lot')}</span>
                                        )}
                                      </div>
                                    </div>
                                  ) : null)}
                                </div>
                              </div>
                            ) : mobileLayoutPattern === 'issue-form' ? (
                              <div className="flex flex-col bg-card border border-border shadow-sm rounded-2xl p-4 transition-all mb-3 hover:border-brand-gold/30">
                                {/* Header: Identity + Actions (FEFO Allocate / Sync / Actions Button beside Item Name + Delete Button) */}
                                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mb-3 pb-3 border-b border-border/40">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {line.item.image ? (
                                      <img src={line.item.image} alt="Product" className="w-11 h-11 object-cover rounded-xl border border-border shrink-0 shadow-sm" />
                                    ) : (
                                      <div className="w-11 h-11 bg-surface flex items-center justify-center rounded-xl border border-border text-[10px] text-muted-foreground font-mono shrink-0">N/A</div>
                                    )}
                                    <div className="flex flex-col min-w-0 flex-1 text-start items-start">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-bold text-foreground leading-tight truncate">
                                          {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                                        </span>
                                        {line.item.primaryUom && (
                                          <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-md uppercase shrink-0">
                                            {line.item.primaryUom.code || line.item.primaryUom.name}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase mt-0.5 text-start rtl:text-right ltr:text-left" dir="ltr">{line.item.code}</span>
                                      {renderItemDescription && (
                                        <div className="mt-1">
                                          {renderItemDescription(line as T)}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Actions: FEFO Allocate / Sync / Actions Button + Delete Button */}
                                  <div className="flex items-center gap-2 shrink-0 sm:self-center ms-auto">
                                    {extraColumns.filter(col =>
                                      col.header.toLowerCase().includes('sync') ||
                                      col.header.toLowerCase().includes('action') ||
                                      col.header.toLowerCase().includes('print') ||
                                      col.header.toLowerCase().includes('allocat') ||
                                      col.header.includes('تخصيص') ||
                                      col.header.includes('إجراء')
                                    ).map((col, i) => (
                                      <div key={i} className="shrink-0 flex items-center [&_button]:h-9 [&_button]:px-3 [&_button]:text-xs [&_button]:font-bold [&_button]:rounded-xl [&_button]:shadow-sm">
                                        {col.cell(line)}
                                      </div>
                                    ))}

                                    {/* Delete Button */}
                                    {!isReadOnly && onRemoveLine && (
                                      <button
                                        type="button"
                                        onClick={() => onRemoveLine(line.id)}
                                        className="h-9 w-9 text-destructive hover:bg-destructive/10 border border-transparent rounded-xl transition-colors flex items-center justify-center shrink-0 ms-1"
                                        aria-label={tc('actions.remove_line')}
                                      >
                                        <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Body: Inputs side by side */}
                                <div className="grid grid-cols-2 gap-3 bg-slate-50/70 dark:bg-slate-900/40 border border-border/50 rounded-xl p-3">
                                  {/* QTY */}
                                  <div className="flex flex-col gap-1 w-full text-center">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center truncate">{h.qty}</span>
                                    <div className="w-full flex items-center justify-center">
                                      {renderQty ? renderQty(line) : (
                                        <div className="text-sm font-black text-foreground font-mono bg-background border border-border rounded-xl px-2 h-10 flex items-center justify-center w-full" dir="ltr">{line.qty}</div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Fulfillment Status / Other non-action columns */}
                                  {extraColumns.filter(col =>
                                    !col.header.toLowerCase().includes('sync') &&
                                    !col.header.toLowerCase().includes('action') &&
                                    !col.header.toLowerCase().includes('print') &&
                                    !col.header.toLowerCase().includes('allocat') &&
                                    !col.header.includes('تخصيص') &&
                                    !col.header.includes('إجراء')
                                  ).map((col, i) => (
                                    <div key={i} className="flex flex-col gap-1 w-full text-center">
                                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center truncate">{col.header}</span>
                                      <div className="w-full flex items-center justify-center h-10">
                                        {col.cell(line)}
                                      </div>
                                    </div>
                                  ))}

                                  {/* Lot Allocation */}
                                  {!hideLotColumns && (line.lot || line.lotAllocations?.length ? (
                                    <div className="col-span-2 flex items-center justify-between gap-3 px-1 pt-2 border-t border-border/30 mt-1">
                                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{h.lot}</span>
                                      <div className="font-mono text-xs text-foreground">
                                        {line.lot ? (
                                          <span dir="ltr">{line.lot.lotNumber}</span>
                                        ) : line.lotAllocations?.[0]?.lotNumber ? (
                                          <span dir="ltr">{line.lotAllocations.map(a => a.lotNumber).join(', ')}</span>
                                        ) : (
                                          <span className="text-muted-foreground/50">{tc('no_lot')}</span>
                                        )}
                                      </div>
                                    </div>
                                  ) : null)}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col bg-card border border-border shadow-sm rounded-xl p-4 transition-all hover:shadow-md">

                                {/* Header: Code & UOM/Status */}
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase" dir="ltr">{line.item.code}</span>
                                  {!hideUomColumn && (
                                    <span className="text-[10px] bg-secondary/50 text-secondary-foreground px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                                      {line.item.primaryUom?.name || line.item.primaryUom?.code || 'PCS'}
                                    </span>
                                  )}
                                </div>

                                {/* Main Title & Image */}
                                <div className="flex gap-3 items-center mb-4">
                                  {line.item.image ? (
                                    <img src={line.item.image} alt="Product" className="w-12 h-12 object-cover rounded-lg border border-border shrink-0" />
                                  ) : (
                                    <div className="w-12 h-12 bg-surface flex items-center justify-center rounded-lg border border-border text-[10px] text-muted-foreground font-mono shrink-0">
                                      N/A
                                    </div>
                                  )}
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="text-base font-bold text-foreground leading-tight whitespace-normal">
                                      {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                                    </span>
                                    {renderItemDescription?.(line as T)}
                                  </div>
                                  {mobileLayoutPattern === 'elegant' && (
                                    <div className="flex flex-col items-end justify-center shrink-0 ms-3">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{h.qty}</span>
                                      {renderQty ? renderQty(line) : (
                                        <div className="text-xl font-black text-foreground font-mono leading-none" dir="ltr">{line.qty}</div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* The Inner Sunken Box (Inputs & Lots) */}
                                <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/50 rounded-lg p-3 mb-4 flex flex-col gap-3">
                                  {/* QTY Row */}
                                  {mobileLayoutPattern !== 'elegant' && (
                                    <div className="flex flex-col gap-1.5 w-full">
                                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{h.qty}</span>
                                      <div className="w-full">
                                        {renderQty ? renderQty(line) : (
                                          <div className="text-sm font-black text-foreground font-mono" dir="ltr">{line.qty}</div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Extra Columns (if any that are not actions) */}
                                  {extraColumns.filter(col => !col.header.toLowerCase().includes('action') && !col.header.toLowerCase().includes('sync') && !col.header.toLowerCase().includes('print')).length > 0 && (
                                    <div className={cn("grid grid-cols-2 gap-3", mobileLayoutPattern !== 'elegant' && "pt-3 border-t border-border/30 mt-1")}>
                                      {extraColumns.filter(col => !col.header.toLowerCase().includes('action') && !col.header.toLowerCase().includes('sync') && !col.header.toLowerCase().includes('print')).map((col, i) => (
                                        <div key={i} className={cn("flex flex-col gap-1.5 w-full", col.header.toLowerCase().includes('status') ? "col-span-2" : "col-span-1")}>
                                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{col.header}</span>
                                          <div className="w-full text-sm">
                                            {col.cell(line)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Lot Allocation */}
                                  {!hideLotColumns && (line.lot || line.lotAllocations?.length ? (
                                    <div className="flex flex-col gap-1.5 pt-3 border-t border-border/30 mt-1">
                                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{h.lot}</span>
                                      <div className="font-mono text-sm text-foreground">
                                        {line.lot ? (
                                          <span dir="ltr">{line.lot.lotNumber}</span>
                                        ) : line.lotAllocations?.[0]?.lotNumber ? (
                                          <span dir="ltr">{line.lotAllocations.map(a => a.lotNumber).join(', ')}</span>
                                        ) : (
                                          <span className="text-muted-foreground/50">{tc('no_lot')}</span>
                                        )}
                                      </div>
                                    </div>
                                  ) : null)}
                                </div>

                                {/* Footer: Actions */}
                                {(!isReadOnly || extraColumns.some(c => c.header.toLowerCase().includes('action') || c.header.toLowerCase().includes('sync') || c.header.toLowerCase().includes('print'))) && (
                                  <div className="flex items-center justify-between mt-auto">
                                    <div className="text-xs text-muted-foreground/50"></div>
                                    <div className="flex items-center gap-2 justify-end flex-wrap w-full">
                                      {extraColumns.filter(col => col.header.toLowerCase().includes('action') || col.header.toLowerCase().includes('sync') || col.header.toLowerCase().includes('print')).map((col, i) => (
                                        <div key={i} className="flex-1 max-w-[150px]">{col.cell(line)}</div>
                                      ))}

                                      {!isReadOnly && onRemoveLine && (
                                        <button
                                          type="button"
                                          onClick={() => onRemoveLine(line.id)}
                                          className="h-10 px-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent rounded-lg transition-colors flex items-center justify-center shrink-0"
                                          aria-label={tc('actions.remove_line')}
                                          title="Remove line"
                                        >
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        )}

                        {/* Desktop Layout cells (hidden on mobile) */}
                        <td className={cn(noCollapse ? "table-cell align-middle sticky start-0 z-20 bg-card border-e border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[130px] md:min-w-[180px]" : mobileLayoutPattern === 'transfer-form' ? "hidden md:table-cell md:align-middle md:sticky md:start-0 md:z-20 md:bg-card md:border-e md:border-border/50 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:w-[250px] md:max-w-[250px]" : "hidden md:table-cell md:align-middle md:sticky md:start-0 md:z-20 md:bg-card md:border-e md:border-border/50 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:min-w-[180px]", noCollapse ? (dense ? "px-3 py-1 text-xs" : "px-4 py-2") : (dense ? "md:px-4 md:py-1.5" : "md:px-8 md:py-5"))}>
                          <div className="flex items-center gap-2.5">
                            {line.item.image ? (
                              <img src={line.item.image} alt="Product" className="w-8 h-8 object-cover rounded-md border border-border shrink-0" />
                            ) : (
                              <div className="w-8 h-8 bg-surface-container flex items-center justify-center rounded-md border border-border text-[9px] text-muted-foreground font-mono shrink-0">
                                N/A
                              </div>
                            )}
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-sm font-black text-[#0B1220] dark:text-white truncate block">
                                {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 tracking-wider uppercase" dir="ltr">
                                  {line.item.code || 'N/A'}
                                </span>
                                {hideUomColumn && (
                                  <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded uppercase font-semibold">
                                    {line.item.primaryUom?.name || line.item.primaryUom?.code || 'PCS'}
                                  </span>
                                )}
                              </div>
                              {renderItemDescription?.(line as T)}
                            </div>
                          </div>
                        </td>
                        {!hideLotColumns && (
                          <>
                            <td className={cn("font-mono text-label-xs text-muted-foreground/60 align-middle", noCollapse ? "table-cell" : "hidden md:table-cell", dense ? "px-3 py-1.5 text-[11px]" : "px-6")}>
                              {line.lot ? (
                                <span dir="ltr">{line.lot.lotNumber}</span>
                              ) : line.lotAllocations?.[0]?.lotNumber ? (
                                <span dir="ltr">{line.lotAllocations[0].lotNumber}</span>
                              ) : (
                                <span className="opacity-20">—</span>
                              )}
                            </td>
                            <td className={cn("font-mono text-label-xs text-muted-foreground/60 align-middle", noCollapse ? "table-cell" : "hidden md:table-cell", dense ? "px-3 py-1.5 text-[11px]" : "px-6")}>
                              {line.lot?.expiryDate ? (
                                <span dir="ltr">{formatDate(line.lot.expiryDate, locale as 'ar' | 'en')}</span>
                              ) : line.lotAllocations?.[0]?.expiryDate ? (
                                <span dir="ltr">{formatDate(line.lotAllocations[0].expiryDate, locale as 'ar' | 'en')}</span>
                              ) : (
                                <span className="opacity-20">—</span>
                              )}
                            </td>
                          </>
                        )}
                        <td className={cn("text-center align-middle", noCollapse ? "table-cell" : "hidden md:table-cell", mobileLayoutPattern === 'transfer-form' ? "w-[140px] min-w-[130px]" : "", noCollapse ? (dense ? "px-2 py-1 text-xs" : "px-4 py-2") : (dense ? "md:px-3 md:py-1.5" : "md:px-6"))}>
                          <div className="flex items-center justify-center w-full">
                            {renderQty ? (
                              renderQty(line)
                            ) : (
                              <span dir="ltr" data-numeric="true" className={cn("font-mono font-bold text-foreground bg-surface-container-high/20 rounded-sm border", dense ? "text-xs px-2 py-0.5" : "text-xs md:text-body-md px-2 py-0.5 md:px-3 md:py-1")}>
                                {line.qty}
                              </span>
                            )}
                          </div>
                        </td>
                        {!hideUomColumn && (
                          <td className={cn("align-middle", noCollapse ? "table-cell" : "hidden md:table-cell", noCollapse ? (dense ? "px-2 py-1" : "px-4 py-2") : (dense ? "md:px-3 md:py-1.5" : "md:px-6"))}>
                            <div className="flex items-center w-full">
                              {renderUom ? (
                                renderUom(line)
                              ) : (
                                <RelationalName name={line.item.primaryUom?.name || line.item.primaryUom?.code} rawId={line.uomId} fallback="N/A" className="text-xs font-medium uppercase text-muted-foreground" />
                              )}
                            </div>
                          </td>
                        )}
                        {extraColumns.map((col, i) => (
                          <td key={i} className={cn("align-middle text-center", col.cellClassName, noCollapse ? "table-cell" : "hidden md:table-cell", noCollapse ? (dense ? "px-2 py-1" : "px-4 py-2") : (dense ? "md:px-3 md:py-1.5" : "md:px-6"))}>
                            {col.cell(line)}
                          </td>
                        ))}
                        {!isReadOnly && onRemoveLine && (
                          <td className={cn("align-middle text-center", noCollapse ? "table-cell" : "hidden md:table-cell", noCollapse ? (dense ? "px-2 py-0.5" : "px-4 py-1") : (dense ? "px-2 py-1" : "px-6"))}>
                            <button
                              type="button"
                              onClick={() => onRemoveLine(line.id)}
                              className={cn("text-muted-foreground/20 hover:text-destructive hover:bg-destructive/5 transition-all rounded-sm", dense ? "p-1" : "p-2")}
                              aria-label={tc('actions.remove_line')}
                            >
                              <svg className={cn(dense ? "w-3.5 h-3.5" : "w-4 h-4")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                );
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} colSpan={totalCols} />
                </tr>
              )}
            </>
          ) : (
            lines.map((line, idx) => (
              <tr
                key={line.id}
                className={cn(
                  "group transition-all hover:bg-primary/[0.04]",
                  dense ? "md:border-none" : "md:border-b",
                  idx % 2 === 0 ? "md:bg-card md:border md:border-border md:shadow-sm" : "md:bg-card md:border md:border-border md:shadow-sm/30",
                  rowClassName?.(line, idx),
                  noCollapse
                    ? "table-row"
                    : "flex flex-col border-b border-brand-gold/10 w-full md:table-row md:bg-transparent md:p-0 md:mb-0 md:rounded-none shadow-none"
                )}
              >
                {/* Mobile card layout */}
                {!noCollapse && (
                  <td className="block w-full p-0 border-none bg-transparent md:hidden mb-4">
                    {mobileLayoutPattern === 'transfer-form' ? (
                      <div className="flex flex-col bg-card border border-border shadow-sm rounded-xl p-3 transition-all mb-1">
                        {/* Header: Identity + Actions */}
                        <div className="flex items-start gap-2 mb-3">
                          {line.item.image ? (
                            <img src={line.item.image} alt="Product" className="w-10 h-10 object-cover rounded-md border border-border shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-surface flex items-center justify-center rounded-md border border-border text-[9px] text-muted-foreground font-mono shrink-0">N/A</div>
                          )}
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[13px] font-bold text-foreground leading-tight whitespace-normal mb-1">
                              {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0">
                              <span className="font-mono tracking-wider uppercase" dir="ltr">{line.item.code}</span>
                            </div>
                            {renderItemDescription && (
                              <div className="mt-1">
                                {renderItemDescription(line as T)}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Delete Button */}
                            {!isReadOnly && onRemoveLine && (
                              <button
                                type="button"
                                onClick={() => onRemoveLine(line.id)}
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 border border-transparent rounded-md transition-colors flex items-center justify-center shrink-0"
                                aria-label={tc('actions.remove_line')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Body: QTY and Notes side by side */}
                        <div className="flex items-end gap-3 bg-slate-50 dark:bg-slate-900/40 border border-border/50 rounded-lg p-2.5">
                          {/* QTY (Smaller) */}
                          <div className="flex flex-col gap-1 w-2/5 shrink-0">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest truncate">{h.qty}</span>
                            <div className="w-full">
                              {renderQty ? renderQty(line) : (
                                <div className="text-sm font-black text-foreground font-mono bg-background border border-border rounded-md px-2 h-9 flex items-center" dir="ltr">{line.qty}</div>
                              )}
                            </div>
                          </div>

                          {/* Extra Columns (e.g. Notes - Larger) */}
                          {extraColumns.map((col, i) => (
                            <div key={i} className="flex flex-col gap-1 flex-1 min-w-0">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest truncate">{col.header}</span>
                              <div className="w-full h-9 flex items-center">
                                {col.cell(line)}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Lot Allocation */}
                        {!hideLotColumns && (line.lot || line.lotAllocations?.length ? (
                          <div className="flex items-center justify-between gap-3 px-1 pt-3">
                            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">{h.lot}</span>
                            <div className="font-mono text-xs text-foreground">
                              {line.lot ? (
                                <span dir="ltr">{line.lot.lotNumber}</span>
                              ) : line.lotAllocations?.[0]?.lotNumber ? (
                                <span dir="ltr">{line.lotAllocations.map(a => a.lotNumber).join(', ')}</span>
                              ) : (
                                <span className="text-muted-foreground/50">{tc('no_lot')}</span>
                              )}
                            </div>
                          </div>
                        ) : null)}
                      </div>
                    ) : mobileLayoutPattern === 'goods-received-form' ? (
                      <div className="flex flex-col bg-card border border-border shadow-sm rounded-2xl p-4 transition-all mb-3 hover:border-brand-gold/30">
                        {/* Header: Image + Item Name + UOM Badge + Item Code on Start side, Lot Allocation & Delete Button on End side */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mb-3 pb-3 border-b border-border/40">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {line.item.image ? (
                              <img src={line.item.image} alt="Product" className="w-11 h-11 object-cover rounded-xl border border-border shrink-0 shadow-sm" />
                            ) : (
                              <div className="w-11 h-11 bg-surface flex items-center justify-center rounded-xl border border-border text-[10px] text-muted-foreground font-mono shrink-0">N/A</div>
                            )}
                            <div className="flex flex-col min-w-0 flex-1 text-start items-start">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-foreground leading-tight truncate">
                                  {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                                </span>
                                {line.item.primaryUom && (
                                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-md uppercase shrink-0">
                                    {line.item.primaryUom.code || line.item.primaryUom.name}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase mt-0.5 text-start rtl:text-right ltr:text-left" dir="ltr">{line.item.code}</span>
                              {renderItemDescription && (
                                <div className="mt-1">
                                  {renderItemDescription(line as T)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Header End Side: Lot Allocation Button + Delete Button */}
                          <div className="flex items-center gap-2 shrink-0 sm:self-center ms-auto">
                            {extraColumns.filter(col =>
                              col.header.toLowerCase().includes('lot') ||
                              col.header.toLowerCase().includes('allocat') ||
                              col.header.includes('تخصيص') ||
                              col.isAction
                            ).map((col, i) => (
                              <div key={i} className="shrink-0 flex items-center [&_button]:h-9 [&_button]:px-3 [&_button]:text-xs [&_button]:font-bold [&_button]:rounded-xl [&_button]:shadow-sm">
                                {col.cell(line)}
                              </div>
                            ))}

                            {!isReadOnly && onRemoveLine && (
                              <button
                                type="button"
                                onClick={() => onRemoveLine(line.id)}
                                className="h-9 w-9 text-destructive hover:bg-destructive/10 border border-transparent rounded-xl transition-colors flex items-center justify-center shrink-0 ms-1"
                                aria-label={tc('actions.remove_line')}
                              >
                                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Body / Bottom Row: QTY + Received QTY (50/50 Equal Width Grid) */}
                        <div className="bg-slate-50/70 dark:bg-slate-900/40 border border-border/50 rounded-xl p-3">
                          <div className="grid grid-cols-2 gap-3 w-full items-center">
                            {/* PO QTY */}
                            {line.qty !== undefined && (
                              <div className="flex flex-col gap-1 w-full text-center">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center truncate">{h.qty}</span>
                                <div className="text-sm font-black text-foreground font-mono bg-background border border-border rounded-xl px-2 h-10 flex items-center justify-center w-full" dir="ltr">
                                  {line.qty}
                                </div>
                              </div>
                            )}

                            {/* Received Qty (Non-action extraColumns) */}
                            {extraColumns.filter(col =>
                              !col.header.toLowerCase().includes('lot') &&
                              !col.header.toLowerCase().includes('allocat') &&
                              !col.header.includes('تخصيص') &&
                              !col.isAction
                            ).map((col, i) => (
                              <div key={i} className="flex flex-col gap-1 w-full text-center">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center truncate">{col.header}</span>
                                <div className="w-full flex items-center justify-center h-10">
                                  {col.cell(line)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : mobileLayoutPattern === 'purchase-request-form' ? (
                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3.5 bg-card border border-border rounded-2xl shadow-sm transition-all mb-2 hover:border-brand-gold/30">
                        {/* Identity: Image + Name + Code + UOM Badge */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {line.item.image ? (
                            <img src={line.item.image} alt="Product" className="w-10 h-10 object-cover rounded-xl border border-border shrink-0 shadow-sm" />
                          ) : (
                            <div className="w-10 h-10 bg-surface flex items-center justify-center rounded-xl border border-border text-[9px] text-muted-foreground font-mono shrink-0">N/A</div>
                          )}
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-foreground leading-tight truncate">
                                {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                              </span>
                              {line.item.primaryUom && (
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-md uppercase shrink-0">
                                  {line.item.primaryUom.code || line.item.primaryUom.name}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mt-0.5" dir="ltr">{line.item.code}</span>
                            {renderItemDescription && (
                              <div className="mt-0.5">
                                {renderItemDescription(line as T)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right side controls: QTY Input + Delete Button in same row */}
                        <div className="flex items-center gap-3 shrink-0 ms-auto">
                          {/* QTY Input */}
                          <div className="w-28 sm:w-32 shrink-0 flex flex-col items-center">
                            {renderQty ? renderQty(line) : (
                              <div className="text-sm font-black text-foreground font-mono bg-background border border-border rounded-xl px-2 h-10 flex items-center justify-center w-full" dir="ltr">{line.qty}</div>
                            )}
                          </div>

                          {/* Delete Button */}
                          {!isReadOnly && onRemoveLine && (
                            <button
                              type="button"
                              onClick={() => onRemoveLine(line.id)}
                              className="h-9 w-9 text-destructive hover:bg-destructive/10 border border-transparent rounded-xl transition-colors flex items-center justify-center shrink-0"
                              aria-label={tc('actions.remove_line')}
                            >
                              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : mobileLayoutPattern === 'adjustment-form' ? (
                      <div className="flex flex-col bg-card border border-border shadow-sm rounded-2xl p-4 transition-all mb-3 hover:border-brand-gold/30">
                        {/* Header: Identity + Direction (in header) + Actions */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mb-3 pb-3 border-b border-border/40">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {line.item.image ? (
                              <img src={line.item.image} alt="Product" className="w-11 h-11 object-cover rounded-xl border border-border shrink-0 shadow-sm" />
                            ) : (
                              <div className="w-11 h-11 bg-surface flex items-center justify-center rounded-xl border border-border text-[10px] text-muted-foreground font-mono shrink-0">N/A</div>
                            )}
                            <div className="flex flex-col min-w-0 flex-1 text-start items-start">
                              <span className="text-sm font-bold text-foreground leading-tight truncate">
                                {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase text-start rtl:text-right ltr:text-left" dir="ltr">{line.item.code}</span>
                                {line.item.primaryUom && (
                                  <span className="text-[9px] bg-secondary/60 text-secondary-foreground px-1.5 py-0.5 rounded-md font-semibold uppercase">
                                    {line.item.primaryUom.code || line.item.primaryUom.name}
                                  </span>
                                )}
                              </div>
                              {renderItemDescription && (
                                <div className="mt-1">
                                  {renderItemDescription(line as T)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Direction (In Header next to Item Name) & Actions */}
                          <div className="flex items-center gap-2 shrink-0 sm:self-center ms-auto">
                            {extraColumns.filter(col =>
                              col.header.toLowerCase().includes('direction') ||
                              col.header.includes('اتجاه')
                            ).map((col, i) => (
                              <div key={i} className="shrink-0 flex items-center [&_div]:h-9 [&_div]:w-auto [&_div]:min-w-[120px] [&_button]:h-7 [&_button]:px-2 [&_button]:text-[10px]">
                                {col.cell(line)}
                              </div>
                            ))}

                            {/* Delete Button */}
                            {!isReadOnly && onRemoveLine && (
                              <button
                                type="button"
                                onClick={() => onRemoveLine(line.id)}
                                className="h-9 w-9 text-destructive hover:bg-destructive/10 border border-transparent rounded-xl transition-colors flex items-center justify-center shrink-0 ms-1"
                                aria-label={tc('actions.remove_line')}
                              >
                                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Body: QTY and Cost (Equal 50/50 sizes side-by-side, centered) */}
                        <div className="flex flex-col gap-3 bg-slate-50/70 dark:bg-slate-900/40 border border-border/50 rounded-xl p-3">
                          <div className="grid grid-cols-2 gap-3 w-full items-center">
                            {/* QTY */}
                            <div className="flex flex-col gap-1 w-full text-center">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center truncate">{h.qty}</span>
                              <div className="w-full flex items-center justify-center">
                                {renderQty ? renderQty(line) : (
                                  <div className="text-sm font-black text-foreground font-mono bg-background border border-border rounded-xl px-2 h-11 flex items-center justify-center w-full" dir="ltr">{line.qty}</div>
                                )}
                              </div>
                            </div>

                            {/* Cost */}
                            {extraColumns.filter(col =>
                              col.header.toLowerCase().includes('cost') ||
                              col.header.includes('تكلفة')
                            ).map((col, i) => (
                              <div key={i} className="flex flex-col gap-1 w-full text-center">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center truncate">{col.header}</span>
                                <div className="w-full flex items-center justify-center h-11">
                                  {col.cell(line)}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Lot Number (Full width in last row) */}
                          {extraColumns.filter(col =>
                            col.header.toLowerCase().includes('lot') ||
                            col.header.includes('دفعة')
                          ).map((col, i) => (
                            <div key={i} className="flex flex-col gap-1 w-full mt-1 pt-2 border-t border-border/30">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest truncate">{col.header}</span>
                              <div className="w-full">
                                {col.cell(line)}
                              </div>
                            </div>
                          ))}

                          {/* Any other extra columns */}
                          {extraColumns.filter(col =>
                            !col.header.toLowerCase().includes('direction') &&
                            !col.header.includes('اتجاه') &&
                            !col.header.toLowerCase().includes('cost') &&
                            !col.header.includes('تكلفة') &&
                            !col.header.toLowerCase().includes('lot') &&
                            !col.header.includes('دفعة')
                          ).map((col, i) => (
                            <div key={i} className="flex flex-col gap-1 w-full mt-1 pt-2 border-t border-border/30">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest truncate">{col.header}</span>
                              <div className="w-full">
                                {col.cell(line)}
                              </div>
                            </div>
                          ))}

                          {/* Built-in Lot Allocation */}
                          {!hideLotColumns && (line.lot || line.lotAllocations?.length ? (
                            <div className="flex items-center justify-between gap-3 px-1 pt-2 border-t border-border/30">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{h.lot}</span>
                              <div className="font-mono text-xs text-foreground">
                                {line.lot ? (
                                  <span dir="ltr">{line.lot.lotNumber}</span>
                                ) : line.lotAllocations?.[0]?.lotNumber ? (
                                  <span dir="ltr">{line.lotAllocations.map(a => a.lotNumber).join(', ')}</span>
                                ) : (
                                  <span className="text-muted-foreground/50">{tc('no_lot')}</span>
                                )}
                              </div>
                            </div>
                          ) : null)}
                        </div>
                      </div>
                    ) : mobileLayoutPattern === 'issue-form' ? (
                      <div className="flex flex-col bg-card border border-border shadow-sm rounded-2xl p-4 transition-all mb-3 hover:border-brand-gold/30">
                        {/* Header: Identity + Actions (FEFO Allocate / Sync / Actions Button beside Item Name + Delete Button) */}
                        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mb-3 pb-3 border-b border-border/40">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {line.item.image ? (
                              <img src={line.item.image} alt="Product" className="w-11 h-11 object-cover rounded-xl border border-border shrink-0 shadow-sm" />
                            ) : (
                              <div className="w-11 h-11 bg-surface flex items-center justify-center rounded-xl border border-border text-[10px] text-muted-foreground font-mono shrink-0">N/A</div>
                            )}
                            <div className="flex flex-col min-w-0 flex-1 text-start items-start">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-foreground leading-tight truncate">
                                  {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                                </span>
                                {line.item.primaryUom && (
                                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-md uppercase shrink-0">
                                    {line.item.primaryUom.code || line.item.primaryUom.name}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase mt-0.5 text-start rtl:text-right ltr:text-left" dir="ltr">{line.item.code}</span>
                              {renderItemDescription && (
                                <div className="mt-1">
                                  {renderItemDescription(line as T)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions: FEFO Allocate / Sync / Actions Button + Delete Button */}
                          <div className="flex items-center gap-2 shrink-0 sm:self-center ms-auto">
                            {extraColumns.filter(col =>
                              col.header.toLowerCase().includes('sync') ||
                              col.header.toLowerCase().includes('action') ||
                              col.header.toLowerCase().includes('print') ||
                              col.header.toLowerCase().includes('allocat') ||
                              col.header.includes('تخصيص') ||
                              col.header.includes('إجراء')
                            ).map((col, i) => (
                              <div key={i} className="shrink-0 flex items-center [&_button]:h-9 [&_button]:px-3 [&_button]:text-xs [&_button]:font-bold [&_button]:rounded-xl [&_button]:shadow-sm">
                                {col.cell(line)}
                              </div>
                            ))}

                            {/* Delete Button */}
                            {!isReadOnly && onRemoveLine && (
                              <button
                                type="button"
                                onClick={() => onRemoveLine(line.id)}
                                className="h-9 w-9 text-destructive hover:bg-destructive/10 border border-transparent rounded-xl transition-colors flex items-center justify-center shrink-0 ms-1"
                                aria-label={tc('actions.remove_line')}
                              >
                                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Body: Inputs side by side */}
                        <div className="grid grid-cols-2 gap-3 bg-slate-50/70 dark:bg-slate-900/40 border border-border/50 rounded-xl p-3">
                          {/* QTY */}
                          <div className="flex flex-col gap-1 w-full text-center">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center truncate">{h.qty}</span>
                            <div className="w-full flex items-center justify-center">
                              {renderQty ? renderQty(line) : (
                                <div className="text-sm font-black text-foreground font-mono bg-background border border-border rounded-xl px-2 h-10 flex items-center justify-center w-full" dir="ltr">{line.qty}</div>
                              )}
                            </div>
                          </div>

                          {/* Fulfillment Status / Other non-action columns */}
                          {extraColumns.filter(col =>
                            !col.header.toLowerCase().includes('sync') &&
                            !col.header.toLowerCase().includes('action') &&
                            !col.header.toLowerCase().includes('print') &&
                            !col.header.toLowerCase().includes('allocat') &&
                            !col.header.includes('تخصيص') &&
                            !col.header.includes('إجراء')
                          ).map((col, i) => (
                            <div key={i} className="flex flex-col gap-1 w-full text-center">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest text-center truncate">{col.header}</span>
                              <div className="w-full flex items-center justify-center h-10">
                                {col.cell(line)}
                              </div>
                            </div>
                          ))}

                          {/* Lot Allocation */}
                          {!hideLotColumns && (line.lot || line.lotAllocations?.length ? (
                            <div className="col-span-2 flex items-center justify-between gap-3 px-1 pt-2 border-t border-border/30 mt-1">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{h.lot}</span>
                              <div className="font-mono text-xs text-foreground">
                                {line.lot ? (
                                  <span dir="ltr">{line.lot.lotNumber}</span>
                                ) : line.lotAllocations?.[0]?.lotNumber ? (
                                  <span dir="ltr">{line.lotAllocations.map(a => a.lotNumber).join(', ')}</span>
                                ) : (
                                  <span className="text-muted-foreground/50">{tc('no_lot')}</span>
                                )}
                              </div>
                            </div>
                          ) : null)}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col bg-card border border-border shadow-sm rounded-xl p-4 transition-all hover:shadow-md">

                        {/* Header: Code & UOM/Status */}
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[11px] font-mono text-muted-foreground tracking-wider uppercase" dir="ltr">{line.item.code}</span>
                          {!hideUomColumn && (
                            <span className="text-[10px] bg-accent text-accent-foreground px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
                              {line.item.primaryUom?.name || line.item.primaryUom?.code || 'PCS'}
                            </span>
                          )}
                        </div>

                        {/* Main Title & Image */}
                        <div className="flex gap-3 items-center mb-4">
                          {line.item.image ? (
                            <img src={line.item.image} alt="Product" className="w-12 h-12 object-cover rounded-lg border border-border shrink-0" />
                          ) : (
                            <div className="w-12 h-12 bg-surface flex items-center justify-center rounded-lg border border-border text-[10px] text-muted-foreground font-mono shrink-0">
                              N/A
                            </div>
                          )}
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-base font-bold text-foreground leading-tight whitespace-normal">
                              {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                            </span>
                            {renderItemDescription?.(line as T)}
                          </div>
                          {mobileLayoutPattern === 'elegant' && (
                            <div className="flex flex-col items-end justify-center shrink-0 ms-3">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">{h.qty}</span>
                              {renderQty ? renderQty(line) : (
                                <div className="text-xl font-black text-primary font-mono leading-none" dir="ltr">{line.qty}</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* The Inner Sunken Box (Inputs & Lots) */}
                        <div className="bg-slate-50 dark:bg-slate-900/40 border border-border/50 rounded-lg p-3 mb-4 flex flex-col gap-3">
                          {/* QTY Row */}
                          {mobileLayoutPattern !== 'elegant' && (
                            <div className="flex flex-col gap-1.5 w-full">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{h.qty}</span>
                              <div className="w-full">
                                {renderQty ? renderQty(line) : (
                                  <div className="text-sm font-black text-foreground font-mono" dir="ltr">{line.qty}</div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Extra Columns (if any that are not actions) */}
                          {extraColumns.filter(col => !col.header.toLowerCase().includes('action') && !col.header.toLowerCase().includes('sync') && !col.header.toLowerCase().includes('print')).length > 0 && (
                            <div className={cn("grid grid-cols-2 gap-3", mobileLayoutPattern !== 'elegant' && "pt-3 border-t border-border/30 mt-1")}>
                              {extraColumns.filter(col => !col.header.toLowerCase().includes('action') && !col.header.toLowerCase().includes('sync') && !col.header.toLowerCase().includes('print')).map((col, i) => (
                                <div key={i} className={cn("flex flex-col gap-1.5 w-full", col.header.toLowerCase().includes('status') ? "col-span-2" : "col-span-1")}>
                                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{col.header}</span>
                                  <div className="w-full text-sm">
                                    {col.cell(line)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Lot Allocation */}
                          {!hideLotColumns && (line.lot || line.lotAllocations?.length ? (
                            <div className="flex flex-col gap-1.5 pt-3 border-t border-border/30 mt-1">
                              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{h.lot}</span>
                              <div className="font-mono text-sm text-primary">
                                {line.lot ? (
                                  <span dir="ltr">{line.lot.lotNumber}</span>
                                ) : line.lotAllocations?.[0]?.lotNumber ? (
                                  <span dir="ltr">{line.lotAllocations.map(a => a.lotNumber).join(', ')}</span>
                                ) : (
                                  <span className="text-primary">{tc('no_lot')}</span>
                                )}
                              </div>
                            </div>
                          ) : null)}
                        </div>

                        {/* Footer: Actions */}
                        {(!isReadOnly || extraColumns.some(c => c.header.toLowerCase().includes('action') || c.header.toLowerCase().includes('sync') || c.header.toLowerCase().includes('print'))) && (
                          <div className="flex items-center justify-between mt-auto">
                            <div className="text-xs text-muted-foreground/50"></div>
                            <div className="flex items-center gap-2 justify-end flex-wrap w-full">
                              {extraColumns.filter(col => col.header.toLowerCase().includes('action') || col.header.toLowerCase().includes('sync') || col.header.toLowerCase().includes('print')).map((col, i) => (
                                <div key={i} className="flex-1 max-w-[150px]">{col.cell(line)}</div>
                              ))}

                              {!isReadOnly && onRemoveLine && (
                                <button
                                  type="button"
                                  onClick={() => onRemoveLine(line.id)}
                                  className="h-10 px-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-transparent rounded-lg transition-colors flex items-center justify-center shrink-0"
                                  aria-label={tc('actions.remove_line')}
                                  title="Remove line"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                )}

                {/* Desktop Layout cells (hidden on mobile) */}
                <td className={cn(noCollapse ? "table-cell align-middle sticky start-0 z-20 bg-card border-e border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[130px] md:min-w-[180px]" : mobileLayoutPattern === 'transfer-form' ? "hidden md:table-cell md:align-middle md:sticky md:start-0 md:z-20 md:bg-card md:border-e md:border-border/50 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:w-[250px] md:max-w-[250px]" : "hidden md:table-cell md:align-middle md:sticky md:start-0 md:z-20 md:bg-card md:border-e md:border-border/50 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:min-w-[180px]", noCollapse ? (dense ? "px-3 py-1 text-xs" : "px-4 py-2") : (dense ? "md:px-4 md:py-1.5" : "md:px-8 md:py-5"))}>
                  <div className="flex items-center gap-2.5">
                    {line.item.image ? (
                      <img src={line.item.image} alt="Product" className="w-8 h-8 object-cover rounded-md border border-border shrink-0" />
                    ) : (
                      <div className="w-8 h-8 bg-surface-container flex items-center justify-center rounded-md border border-border text-[9px] text-muted-foreground font-mono shrink-0">
                        N/A
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-black text-[#0B1220] dark:text-white truncate block">
                        {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-gray-500 dark:text-gray-400 tracking-wider uppercase" dir="ltr">
                          {line.item.code || 'N/A'}
                        </span>
                        {hideUomColumn && (
                          <span className="text-[9.5px] bg-[#1F2937] text-gray-300 px-1.5 py-0.5 rounded uppercase font-semibold">
                            {line.item.primaryUom?.name || line.item.primaryUom?.code || 'PCS'}
                          </span>
                        )}
                      </div>
                      {renderItemDescription?.(line as T)}
                    </div>
                  </div>
                </td>
                {!hideLotColumns && (
                  <>
                    <td className={cn("font-mono text-label-xs text-muted-foreground/60 align-middle", noCollapse ? "table-cell" : "hidden md:table-cell", dense ? "px-3 py-1.5 text-[11px]" : "px-6")}>
                      {line.lot ? <span dir="ltr">{line.lot.lotNumber}</span> : <span className="opacity-20">—</span>}
                    </td>
                    <td className={cn("font-mono text-label-xs text-muted-foreground/60 align-middle", noCollapse ? "table-cell" : "hidden md:table-cell", dense ? "px-3 py-1.5 text-[11px]" : "px-6")}>
                      {line.lot?.expiryDate
                        ? <span dir="ltr">{formatDate(line.lot.expiryDate, locale as 'ar' | 'en')}</span>
                        : <span className="opacity-20">—</span>}
                    </td>
                  </>
                )}
                <td className={cn("text-center align-middle", noCollapse ? "table-cell" : "hidden md:table-cell", noCollapse ? (dense ? "px-2 py-1 text-xs" : "px-4 py-2") : (dense ? "md:px-3 md:py-1.5" : "md:px-6"))}>
                  <div className="flex items-center justify-center w-full">
                    {renderQty ? (
                      renderQty(line)
                    ) : (
                      <span dir="ltr" data-numeric="true" className={cn("font-mono font-bold text-foreground bg-surface-container-high/20 rounded-sm border", dense ? "text-xs px-2 py-0.5" : "text-xs md:text-body-md px-2 py-0.5 md:px-3 md:py-1")}>
                        {line.qty}
                      </span>
                    )}
                  </div>
                </td>
                {!hideUomColumn && (
                  <td className={cn("align-middle", noCollapse ? "table-cell" : "hidden md:table-cell", noCollapse ? (dense ? "px-2 py-1" : "px-4 py-2") : (dense ? "md:px-3 md:py-1.5" : "md:px-6"))}>
                    <div className="flex items-center w-full">
                      {renderUom ? (
                        renderUom(line)
                      ) : (
                        <RelationalName name={line.item.primaryUom?.name || line.item.primaryUom?.code} rawId={line.uomId} fallback="N/A" className="text-xs font-medium uppercase text-muted-foreground" />
                      )}
                    </div>
                  </td>
                )}
                {extraColumns.map((col, i) => (
                  <td key={i} className={cn("align-middle text-center", noCollapse ? "table-cell" : "hidden md:table-cell", noCollapse ? (dense ? "px-2 py-1" : "px-4 py-2") : (dense ? "md:px-3 md:py-1.5" : "md:px-6"))}>
                    {col.cell(line)}
                  </td>
                ))}
                {!isReadOnly && onRemoveLine && (
                  <td className={cn("align-middle text-center", noCollapse ? "table-cell" : "hidden md:table-cell", noCollapse ? (dense ? "px-2 py-0.5" : "px-4 py-1") : (dense ? "px-2 py-1" : "px-6"))}>
                    <button
                      type="button"
                      onClick={() => onRemoveLine(line.id)}
                      className={cn("text-gray-400 hover:text-red-500 hover:bg-red-50/10 dark:hover:bg-red-500/10 transition-all rounded-sm", dense ? "p-1" : "p-2")}
                      aria-label={tc('actions.remove_line')}
                    >
                      <svg className={cn(dense ? "w-3.5 h-3.5" : "w-4 h-4")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

