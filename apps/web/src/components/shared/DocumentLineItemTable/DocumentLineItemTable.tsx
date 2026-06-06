'use client';

import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import { formatDate } from '@/utils/currency';
import type { LotAllocation } from '@/types/documents';
import { useVirtualizer } from '@tanstack/react-virtual';

export interface LineItem {
 id: string;
 item: { id: string; code: string; name?: string; nameAr?: string; nameEn?: string; primaryUom: { code: string } };
 lot?: { lotNumber: string; expiryDate: string | null } | null;
 qty: number;
 uomId: string;
 unitCost?: number | null;
 lotAllocations?: LotAllocation[];
}

export interface ExtraColumn<T extends LineItem = LineItem> {
 header: string;
 cell: (line: T) => React.ReactNode;
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
  enableVirtualization = true,
  maxHeight = '480px',
  virtualizerRef,
  rowClassName,
}: DocumentLineItemTableProps<T>) {
  const t = useTranslations('common.table_headers');
  const tc = useTranslations('common');
  const locale = useLocale();

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

  // Count base columns to set correct colSpan for empty state
  // New layout: [Item (Name + Code)] [Lot] [Expiry] [Qty] [UOM] + Extra + Remove
  const baseCols = hideLotColumns ? 3 : 5;
  const totalCols = baseCols + extraColumns.length + (!isReadOnly && onRemoveLine ? 1 : 0);

  return (
    <div 
      ref={parentRef}
      className={cn("overflow-x-auto rounded-sm bg-surface-container-lowest", dense ? "border border-surface-container-high/30 shadow-sm" : "")}
      style={enableVirtualization ? { maxHeight, overflowY: 'auto' } : {}}
    >
      <table className="w-full text-start border-collapse">
        <thead className={cn("bg-surface-container-low/95 backdrop-blur-sm sticky top-0 z-10 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]", dense ? "border-b border-surface-container-high/50" : "")}>
          <tr>
            <th className={cn("text-label-xs font-bold uppercase text-muted-foreground/40 text-start", dense ? "px-4 py-2 h-9 text-[10px]" : "px-8 h-14 min-w-[300px]")}>{h.name}</th>
            {!hideLotColumns && (
              <>
                <th className={cn("text-label-xs font-bold uppercase text-muted-foreground/40 whitespace-nowrap text-start", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{h.lot}</th>
                <th className={cn("text-label-xs font-bold uppercase text-muted-foreground/40 whitespace-nowrap text-start", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{h.expiry}</th>
              </>
            )}
            <th className={cn("text-label-xs font-bold uppercase text-muted-foreground/40 whitespace-nowrap text-center", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{h.qty}</th>
            <th className={cn("text-label-xs font-bold uppercase text-muted-foreground/40 whitespace-nowrap text-start", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{h.uom}</th>
            {extraColumns.map((col, i) => (
              <th key={i} className={cn("text-label-xs font-bold uppercase text-muted-foreground/40 whitespace-nowrap text-center", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{col.header}</th>
            ))}
            {!isReadOnly && onRemoveLine && (
              <th className={cn("text-label-xs font-bold uppercase text-muted-foreground/40 whitespace-nowrap w-10", dense ? "px-3 py-2 h-9" : "px-6 h-14")} />
            )}
          </tr>
        </thead>
        <tbody>
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
                return (
                  <tr 
                    key={line.id} 
                    className={cn(
                      "group transition-all hover:bg-primary/[0.04]",
                      dense ? "border-none" : "border-b",
                      idx % 2 === 0 ? "bg-surface-container-lowest" : "bg-surface-container-low/30",
                      rowClassName?.(line, idx)
                    )}
                    style={{ height: `${dense ? 48 : 64}px` }}
                  >
                    <td className={cn(dense ? "px-4 py-1.5" : "px-8 py-5")}>
                      <div className="flex flex-col gap-0.5">
                        <span className={cn("font-bold text-foreground group-hover:text-operational-cyan transition-colors", dense ? "text-xs" : "text-body-md")}>
                          {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                        </span>
                        <span className={cn("font-mono font-semibold text-muted-foreground/40 tracking-wider uppercase", dense ? "text-[9px]" : "text-[10px]")} dir="ltr">
                          {line.item.code}
                        </span>
                      </div>
                    </td>
                    {!hideLotColumns && (
                      <>
                        <td className={cn("font-mono text-label-xs text-muted-foreground/60", dense ? "px-3 py-1.5 text-[11px]" : "px-6")}>
                          {line.lot ? <span dir="ltr">{line.lot.lotNumber}</span> : <span className="opacity-20">—</span>}
                        </td>
                        <td className={cn("font-mono text-label-xs text-muted-foreground/60", dense ? "px-3 py-1.5 text-[11px]" : "px-6")}>
                          {line.lot?.expiryDate
                            ? <span dir="ltr">{formatDate(line.lot.expiryDate, locale as 'ar' | 'en')}</span>
                            : <span className="opacity-20">—</span>}
                        </td>
                      </>
                    )}
                    <td className={cn("text-center", dense ? "px-3 py-1.5" : "px-6")}>
                      {renderQty ? (
                        renderQty(line)
                      ) : (
                        <span dir="ltr" className={cn("font-mono font-bold text-foreground bg-surface-container-high/20 rounded-sm border", dense ? "text-xs px-2 py-0.5" : "text-body-md px-3 py-1")}>
                          {line.qty}
                        </span>
                      )}
                    </td>
                    <td className={cn(dense ? "px-3 py-1.5" : "px-6")}>
                      {renderUom ? (
                        renderUom(line)
                      ) : (
                        <span dir="ltr" className="text-label-xs font-black uppercase text-muted-foreground/30">{line.item.primaryUom.code}</span>
                      )}
                    </td>
                    {extraColumns.map((col, i) => (
                      <td key={i} className={cn("text-center", dense ? "px-3 py-1.5" : "px-6")}>
                        {col.cell(line)}
                      </td>
                    ))}
                    {!isReadOnly && onRemoveLine && (
                      <td className={cn("text-center", dense ? "px-2 py-1" : "px-6")}>
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
                  dense ? "border-none" : "border-b",
                  idx % 2 === 0 ? "bg-surface-container-lowest" : "bg-surface-container-low/30",
                  rowClassName?.(line, idx)
                )}
              >
                <td className={cn(dense ? "px-4 py-1.5" : "px-8 py-5")}>
                  <div className="flex flex-col gap-0.5">
                    <span className={cn("font-bold text-foreground group-hover:text-operational-cyan transition-colors", dense ? "text-xs" : "text-body-md")}>
                      {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
                    </span>
                    <span className={cn("font-mono font-semibold text-muted-foreground/40 tracking-wider uppercase", dense ? "text-[9px]" : "text-[10px]")} dir="ltr">
                      {line.item.code}
                    </span>
                  </div>
                </td>
                {!hideLotColumns && (
                  <>
                    <td className={cn("font-mono text-label-xs text-muted-foreground/60", dense ? "px-3 py-1.5 text-[11px]" : "px-6")}>
                      {line.lot ? <span dir="ltr">{line.lot.lotNumber}</span> : <span className="opacity-20">—</span>}
                    </td>
                    <td className={cn("font-mono text-label-xs text-muted-foreground/60", dense ? "px-3 py-1.5 text-[11px]" : "px-6")}>
                      {line.lot?.expiryDate
                        ? <span dir="ltr">{formatDate(line.lot.expiryDate, locale as 'ar' | 'en')}</span>
                        : <span className="opacity-20">—</span>}
                    </td>
                  </>
                )}
                <td className={cn("text-center", dense ? "px-3 py-1.5" : "px-6")}>
                  {renderQty ? (
                    renderQty(line)
                  ) : (
                    <span dir="ltr" className={cn("font-mono font-bold text-foreground bg-surface-container-high/20 rounded-sm border", dense ? "text-xs px-2 py-0.5" : "text-body-md px-3 py-1")}>
                      {line.qty}
                    </span>
                  )}
                </td>
                <td className={cn(dense ? "px-3 py-1.5" : "px-6")}>
                  {renderUom ? (
                    renderUom(line)
                  ) : (
                    <span dir="ltr" className="text-label-xs font-black uppercase text-muted-foreground/30">{line.item.primaryUom.code}</span>
                  )}
                </td>
                {extraColumns.map((col, i) => (
                  <td key={i} className={cn("text-center", dense ? "px-3 py-1.5" : "px-6")}>
                    {col.cell(line)}
                  </td>
                ))}
                {!isReadOnly && onRemoveLine && (
                  <td className={cn("text-center", dense ? "px-2 py-1" : "px-6")}>
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
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

