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
  mobileLayoutPattern?: 'standard' | 'issue-form' | 'adjustment-form' | 'variance-form' | 'elegant' | 'transfer-form';
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
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
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
            <th className={cn("sticky start-0 z-20 bg-card border-e border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] px-6 py-4 font-medium text-start whitespace-nowrap text-muted-foreground", noCollapse ? "w-auto min-w-[130px] md:min-w-[180px]" : "w-full min-w-[120px] md:min-w-[180px]", dense ? "px-3 py-2 h-9 text-[10px]" : "px-8 h-14")}>{h.name}</th>
            {!hideLotColumns && (
              <>
                <th className={cn("px-6 py-4 font-medium text-start whitespace-nowrap text-muted-foreground", noCollapse ? "table-cell" : "hidden md:table-cell", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{h.lot}</th>
                <th className={cn("px-6 py-4 font-medium text-start whitespace-nowrap text-muted-foreground", noCollapse ? "table-cell" : "hidden md:table-cell", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{h.expiry}</th>
              </>
            )}
            <th className={cn("px-6 py-4 font-medium text-center whitespace-nowrap text-muted-foreground", noCollapse ? "min-w-[85px] md:min-w-[120px]" : "min-w-[120px]", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{h.qty}</th>
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
                        ? "flex flex-col md:grid md:grid-cols-12 gap-4 p-5 mb-4 border border-[#b48e67]/20 hover:border-[#b48e67]/40 bg-[#0B1220] rounded-2xl shadow-lg transition-all w-full items-center"
                        : noCollapse
                          ? "border-b border-border last:border-0 hover:bg-muted/50 transition-colors group table-row"
                          : "border-b border-border last:border-0 hover:bg-muted/50 transition-colors group flex flex-col border-b border-[#b48e67]/10 w-full md:table-row md:border-b md:border-border/50 md:bg-transparent md:p-0 md:mb-0 md:rounded-none shadow-none",
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
                              <div className="w-12 h-12 bg-surface-container flex items-center justify-center rounded-lg border border-gray-750 text-xs text-muted-foreground font-mono shrink-0">
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
                                  <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded uppercase font-semibold">
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
                          <td className="block w-full p-0 border-none bg-transparent md:hidden">
                            {mobileLayoutPattern === 'adjustment-form' ? (
                              renderAdjustmentMobileCard(line)
                            ) : (
                              <>
                                {/* Top Tier (Master) */}
                                <div className={cn(
                                  "flex items-center py-2 bg-[#0B1220] px-3 w-full rounded-t-xl gap-2.5"
                                )}>
                                  {line.item.image ? (
                                    <img src={line.item.image} alt="Product" className="w-8 h-8 object-cover rounded-md border border-gray-800 shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 bg-surface-container flex items-center justify-center rounded-md border border-gray-800 text-[9px] text-muted-foreground font-mono shrink-0">
                                      N/A
                                    </div>
                                  )}
                                  <div className="flex flex-col gap-1 min-w-0 flex-1 text-start">
                                    <span className="text-sm font-bold text-white truncate block">
                                      {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                                    </span>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase" dir="ltr">
                                        {line.item.code}
                                      </span>
                                      {hideUomColumn && (
                                        <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded uppercase font-semibold">
                                          {line.item.primaryUom?.name || line.item.primaryUom?.code || 'PCS'}
                                        </span>
                                      )}
                                    </div>
                                    {renderItemDescription?.(line as T)}
                                  </div>
                                  {!isReadOnly && onRemoveLine && (
                                    <button
                                      type="button"
                                      onClick={() => onRemoveLine(line.id)}
                                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50/10 dark:hover:bg-red-500/10 rounded transition-colors flex items-center justify-center shrink-0"
                                      aria-label={tc('actions.remove_line')}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>

                                {/* Detail Tier (High-Density CSS Grid) */}
                                {mobileLayoutPattern === 'transfer-form' ? (
                                  <div className="flex flex-col gap-3 p-3 bg-white dark:bg-[#1A2234] border-x border-b border-gray-200 dark:border-transparent w-full rounded-b-xl text-start items-stretch">
                                    {/* Qty input */}
                                    <div className="flex flex-col w-full">
                                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{h.qty}</span>
                                      <div className="w-full">
                                        {renderQty ? renderQty(line) : (
                                          <span className="text-sm font-black text-foreground" dir="ltr">{line.qty}</span>
                                        )}
                                      </div>
                                    </div>
                                    {/* Notes / Extra Columns */}
                                    {extraColumns.map((col, i) => (
                                      <div key={i} className="flex flex-col w-full mt-1">
                                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{col.header}</span>
                                        <div className="w-full">
                                          {col.cell(line)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : mobileLayoutPattern === 'issue-form' ? (
                                  <div className="flex flex-col gap-3 p-3 bg-white dark:bg-[#1A2234] border-x border-b border-gray-200 dark:border-transparent items-center w-full rounded-b-xl">
                                    {/* Top Row: Qty and Fulfillment Status side-by-side */}
                                    <div className="grid grid-cols-2 gap-3 w-full">
                                      {/* Col 1: QTY */}
                                      <div className="flex items-center justify-between gap-2 w-full h-8">
                                        <label className="text-[9px] text-gray-600 dark:text-gray-500 uppercase tracking-widest shrink-0">{h.qty}</label>
                                        <div className="w-auto flex-1 flex justify-end">
                                          {renderQty ? (
                                            renderQty(line)
                                          ) : (
                                            <div dir="ltr" className="bg-gray-50 border border-gray-200 text-[#0B1220] dark:bg-[#0B1220] dark:border-gray-700 dark:text-white rounded-md p-2 font-mono flex items-center h-8 text-sm justify-center">
                                              {line.qty}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Col 2: Fulfillment Status */}
                                      {extraColumns[0] && (
                                        <div className="flex items-center justify-between gap-2 w-full h-8">
                                          <label className="text-[9px] text-gray-600 dark:text-slate-500 uppercase tracking-widest shrink-0">{extraColumns[0].header}</label>
                                          <div className="w-auto flex-1 flex justify-end">
                                            {extraColumns[0].cell(line)}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Bottom Row: Actions/FEFO Sync button */}
                                    {extraColumns[1] && (
                                      <div className="w-full flex justify-center mt-1">
                                        {extraColumns[1].cell(line)}
                                      </div>
                                    )}

                                    {/* Any additional extra columns */}
                                    {extraColumns.slice(2).map((col, i) => (
                                      <div key={i} className="flex items-center justify-between gap-2 w-full h-8">
                                        <label className="text-[9px] text-gray-600 dark:text-slate-500 uppercase tracking-widest shrink-0">{col.header}</label>
                                        <div className="w-auto flex-1 flex justify-end">
                                          {col.cell(line)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-4 p-3 bg-white dark:bg-[#1A2234] border-x border-b border-gray-200 dark:border-transparent w-full rounded-b-xl">
                                    {/* Col 1: QTY */}
                                    <div className="flex flex-col items-start w-full">
                                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{h.qty}</span>
                                      {renderQty ? (
                                        renderQty(line)
                                      ) : (
                                        <span className="text-sm font-black text-[#0B1220] dark:text-white font-sans" dir="ltr" data-numeric="true">{line.qty}</span>
                                      )}
                                    </div>

                                    {/* Col 2: UOM */}
                                    {!hideUomColumn && (
                                      <div className="flex flex-col items-start w-full">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{h.uom}</span>
                                        {renderUom ? (
                                          renderUom(line)
                                        ) : (
                                          <span className="text-sm font-black text-[#0B1220] dark:text-white uppercase">{line.item.primaryUom?.name || line.item.primaryUom?.code || 'N/A'}</span>
                                        )}
                                      </div>
                                    )}

                                    {/* Extra Columns */}
                                    {extraColumns.map((col, i) => (
                                      <div key={i} className="flex flex-col items-start w-full col-span-2 sm:col-span-1 mt-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{col.header}</span>
                                        {col.cell(line)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </td>
                        )}

                        {/* Desktop Layout cells (hidden on mobile) */}
                        <td className={cn(noCollapse ? "table-cell align-middle sticky start-0 z-20 bg-card border-e border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[130px] md:min-w-[180px]" : "hidden md:table-cell md:align-middle md:sticky md:start-0 md:z-20 md:bg-card md:border-e md:border-border/50 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:min-w-[180px]", noCollapse ? (dense ? "px-3 py-1 text-xs" : "px-4 py-2") : (dense ? "md:px-4 md:py-1.5" : "md:px-8 md:py-5"))}>
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
                    : "flex flex-col border-b border-[#b48e67]/10 w-full md:table-row md:bg-transparent md:p-0 md:mb-0 md:rounded-none shadow-none"
                )}
              >
                {/* Mobile card layout */}
                {!noCollapse && (
                  <td className="block w-full p-0 border-none bg-transparent md:hidden">
                    {mobileLayoutPattern === 'adjustment-form' ? (
                      renderAdjustmentMobileCard(line)
                    ) : (
                      <>
                        {/* Top Tier (Master) */}
                        {mobileLayoutPattern !== 'elegant' && (
                          <div className="flex items-center py-2 bg-[#0B1220] px-3 w-full rounded-t-xl gap-2.5">
                            {line.item.image ? (
                              <img src={line.item.image} alt="Product" className="w-8 h-8 object-cover rounded-md border border-gray-800 shrink-0" />
                            ) : (
                              <div className="w-8 h-8 bg-surface-container flex items-center justify-center rounded-md border border-gray-800 text-[9px] text-muted-foreground font-mono shrink-0">
                                N/A
                              </div>
                            )}
                            <div className="flex flex-col gap-1 min-w-0 flex-1 text-start">
                              <span className="text-sm font-bold text-white truncate block">
                                {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                              </span>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase" dir="ltr">
                                  {line.item.code}
                                </span>
                                {hideUomColumn && (
                                  <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded uppercase font-semibold">
                                    {line.item.primaryUom?.name || line.item.primaryUom?.code || 'PCS'}
                                  </span>
                                )}
                              </div>
                              {renderItemDescription?.(line as T)}
                            </div>
                            {!isReadOnly && onRemoveLine && (
                              <button
                                type="button"
                                onClick={() => onRemoveLine(line.id)}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50/10 dark:hover:bg-red-500/10 rounded transition-colors flex items-center justify-center shrink-0"
                                aria-label={tc('actions.remove_line')}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Detail Tier (High-Density CSS Grid) */}
                        {mobileLayoutPattern === 'elegant' ? (
                          <div className="flex flex-col w-full border-b border-border dark:border-[#b48e67]/10 last:border-0 pb-2">
                            {/* Headers */}
                            <div className="grid grid-cols-4 gap-2 px-3 py-2 border-b border-border dark:border-[#b48e67]/10 w-full items-center">
                              <span className="text-[10px] font-bold text-muted-foreground dark:text-gray-400 text-start col-span-1 truncate">{h.name}</span>
                              {!hideLotColumns && <span className="text-[10px] font-bold text-muted-foreground dark:text-gray-400 text-center truncate">{h.lot}</span>}
                              {!hideLotColumns && <span className="text-[10px] font-bold text-muted-foreground dark:text-gray-400 text-center truncate">{h.expiry}</span>}
                              <span className="text-[10px] font-bold text-muted-foreground dark:text-gray-400 text-center col-span-1 truncate">{h.qty}</span>
                            </div>
                            {/* Values */}
                            <div className="grid grid-cols-4 gap-2 px-3 py-2 w-full items-center">
                              {/* Name */}
                              <div className="flex items-center gap-2 text-start col-span-1 overflow-hidden">
                                {line.item.image ? (
                                  <img src={line.item.image} alt="Product" className="w-6 h-6 object-cover rounded-md border border-border shrink-0" />
                                ) : (
                                  <div className="w-6 h-6 bg-surface-container flex items-center justify-center rounded-md border border-border text-[8px] text-muted-foreground font-mono shrink-0">
                                    N/A
                                  </div>
                                )}
                                <div className="flex flex-col items-start min-w-0 overflow-hidden">
                                  <span className="text-[11px] font-bold text-foreground dark:text-white leading-tight line-clamp-2">
                                    {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground dark:text-gray-500 font-mono uppercase mt-1">
                                    {line.item.code}
                                  </span>
                                </div>
                              </div>
                              {/* Lot */}
                              {!hideLotColumns && (
                                <div className="flex justify-center text-center">
                                  <span className="text-[10px] text-muted-foreground dark:text-gray-500 font-mono">
                                    {line.lot ? line.lot.lotNumber : '—'}
                                  </span>
                                </div>
                              )}
                              {/* Expiry */}
                              {!hideLotColumns && (
                                <div className="flex justify-center text-center">
                                  <span className="text-[10px] text-muted-foreground dark:text-gray-500 font-mono">
                                    {line.lot?.expiryDate ? formatDate(line.lot.expiryDate, locale as 'ar' | 'en') : '—'}
                                  </span>
                                </div>
                              )}
                              {/* Qty */}
                              <div className="flex justify-center text-center col-span-1">
                                {renderQty ? renderQty(line) : (
                                  <div className="border border-border dark:border-[#b48e67]/30 rounded bg-transparent px-2 py-0.5 text-foreground dark:text-white font-mono text-xs shadow-sm">
                                    {line.qty}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : mobileLayoutPattern === 'variance-form' ? (
                          <div className="grid grid-cols-2 gap-3 p-4 bg-[#1A2234]/30 rounded-b-xl border-t border-gray-800 w-full">
                            {/* Col 1: Snapshot Qty */}
                            <div className="flex flex-col w-full">
                              <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{extraColumns[0]?.header}</label>
                              <div className="flex h-8 items-center w-full">
                                {extraColumns[0]?.cell(line)}
                              </div>
                            </div>

                            {/* Col 2: Counted Qty + UOM */}
                            <div className="flex flex-col w-full">
                              <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{h.qty}</label>
                              <div className="flex h-8 items-center gap-2 w-full">
                                {renderQty ? renderQty(line) : null}
                                {renderUom ? renderUom(line) : null}
                              </div>
                            </div>

                            {/* Col 3: Variance */}
                            <div className="flex flex-col w-full">
                              <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{extraColumns[1]?.header}</label>
                              <div className="flex h-8 items-center w-full">
                                {extraColumns[1]?.cell(line)}
                              </div>
                            </div>

                            {/* Col 4: Variance Value */}
                            <div className="flex flex-col w-full">
                              <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{extraColumns[2]?.header}</label>
                              <div className="flex h-8 items-center w-full">
                                {extraColumns[2]?.cell(line)}
                              </div>
                            </div>

                            {/* Col 5: Variance Reason (Spans 2 cols) */}
                            {extraColumns[3] && (
                              <div className="flex flex-col w-full col-span-2 mt-2">
                                <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{extraColumns[3].header}</label>
                                <div className="flex w-full">
                                  {extraColumns[3].cell(line)}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={cn(
                            "flex flex-col gap-3 p-3 bg-white dark:bg-[#1A2234] border-x border-b border-gray-200 dark:border-transparent w-full rounded-b-xl",
                            mobileLayoutPattern === 'transfer-form' ? "items-stretch text-start" : "items-center"
                          )}>
                            {mobileLayoutPattern === 'transfer-form' ? (
                              <div className="flex flex-col gap-3 w-full">
                                {/* Qty input */}
                                <div className="flex flex-col w-full">
                                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{h.qty}</span>
                                  <div className="w-full">
                                    {renderQty ? renderQty(line) : (
                                      <span className="text-sm font-black text-foreground" dir="ltr">{line.qty}</span>
                                    )}
                                  </div>
                                </div>
                                {/* Notes / Extra Columns */}
                                {extraColumns.map((col, i) => (
                                  <div key={i} className="flex flex-col w-full mt-1">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{col.header}</span>
                                    <div className="w-full">
                                      {col.cell(line)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : mobileLayoutPattern === 'issue-form' ? (
                              <>
                                <div className="grid grid-cols-2 gap-3 w-full">
                                  <div className="flex items-center justify-between gap-2 w-full h-8">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">{h.qty}</label>
                                    <div className="w-auto flex-1 flex justify-end">
                                      {renderQty ? (
                                        renderQty(line)
                                      ) : (
                                        <div dir="ltr" data-numeric="true" className="bg-gray-50 dark:bg-[#0B1220] border border-gray-200 dark:border-gray-600 rounded-md p-2 text-[#0B1220] dark:text-white font-mono flex items-center h-8 text-sm justify-center">
                                          {line.qty}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {extraColumns[0] && (
                                    <div className="flex items-center justify-between gap-2 w-full h-8">
                                      <label className="text-[9px] text-gray-500 uppercase tracking-widest shrink-0">{extraColumns[0].header}</label>
                                      <div className="w-auto flex-1 flex justify-end">
                                        {extraColumns[0].cell(line)}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {extraColumns[1] && (
                                  <div className="w-full flex justify-center mt-1">
                                    {extraColumns[1].cell(line)}
                                  </div>
                                )}

                                {extraColumns.slice(2).map((col, i) => (
                                  <div key={i} className="flex items-center justify-between gap-2 w-full h-8">
                                    <label className="text-[9px] text-gray-500 uppercase tracking-widest shrink-0">{col.header}</label>
                                    <div className="w-auto flex-1 flex justify-end">
                                      {col.cell(line)}
                                    </div>
                                  </div>
                                ))}
                              </>
                            ) : (
                              <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="flex flex-col items-start w-full">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{h.qty}</span>
                                  {renderQty ? (
                                    renderQty(line)
                                  ) : (
                                    <span className="text-sm font-black text-[#0B1220] dark:text-white" dir="ltr" data-numeric="true">{line.qty}</span>
                                  )}
                                </div>

                                {!hideUomColumn && (
                                  <div className="flex flex-col items-start w-full">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{h.uom}</span>
                                    {renderUom ? (
                                      renderUom(line)
                                    ) : (
                                      <span className="text-sm font-black text-[#0B1220] dark:text-white uppercase">{line.item.primaryUom?.name || line.item.primaryUom?.code || 'N/A'}</span>
                                    )}
                                  </div>
                                )}

                                {extraColumns.map((col, i) => (
                                  <div key={i} className="flex flex-col items-start w-full col-span-2 sm:col-span-1 mt-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{col.header}</span>
                                    {col.cell(line)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </td>
                )}

                {/* Desktop Layout cells (hidden on mobile) */}
                <td className={cn(noCollapse ? "table-cell align-middle sticky start-0 z-20 bg-card border-e border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[130px] md:min-w-[180px]" : "hidden md:table-cell md:align-middle md:sticky md:start-0 md:z-20 md:bg-card md:border-e md:border-border/50 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:min-w-[180px]", noCollapse ? (dense ? "px-3 py-1 text-xs" : "px-4 py-2") : (dense ? "md:px-4 md:py-1.5" : "md:px-8 md:py-5"))}>
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

