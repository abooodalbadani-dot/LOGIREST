'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import { formatDate } from '@/utils/currency';
import type { LotAllocation } from '@/types/documents';

export interface LineItem {
 id: string;
 item: { id: string; code: string; name_ar: string; name_en: string; primary_uom: { code: string } };
 lot?: { lot_number: string; expiry_date: string | null } | null;
 qty: number;
 uom_id: string;
 unit_cost?: number | null;
 lot_allocations?: LotAllocation[];
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
}


export function DocumentLineItemTable<T extends LineItem>({
  lines,
  extraColumns = [],
  onRemoveLine,
  isReadOnly,
  headers = {},
  hideLotColumns = false,
  renderQty,
}: DocumentLineItemTableProps<T>) {
  const t = useTranslations('common.table_headers');
  const tc = useTranslations('common');
  const locale = useLocale();

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
    <div className="overflow-x-auto rounded-sm bg-surface-container-lowest">
      <table className="w-full text-start border-collapse">
        <thead className="bg-surface-container-low/50">
          <tr>
            <th className="px-8 h-14 text-label-xs font-semibold uppercase text-muted-foreground/40 text-start min-w-[300px]">{h.name}</th>
            {!hideLotColumns && (
              <>
                <th className="px-6 h-14 text-label-xs font-semibold uppercase text-muted-foreground/40 whitespace-nowrap text-start">{h.lot}</th>
                <th className="px-6 h-14 text-label-xs font-semibold uppercase text-muted-foreground/40 whitespace-nowrap text-start">{h.expiry}</th>
              </>
            )}
            <th className="px-6 h-14 text-label-xs font-semibold uppercase text-muted-foreground/40 whitespace-nowrap text-center">{h.qty}</th>
            <th className="px-6 h-14 text-label-xs font-semibold uppercase text-muted-foreground/40 whitespace-nowrap text-start">{h.uom}</th>
            {extraColumns.map((col, i) => (
              <th key={i} className="px-6 h-14 text-label-xs font-semibold uppercase text-muted-foreground/40 whitespace-nowrap text-center">{col.header}</th>
            ))}
            {!isReadOnly && onRemoveLine && (
              <th className={cn("px-6 h-14 text-label-xs font-semibold uppercase text-muted-foreground/40 whitespace-nowrap w-10")} />
            )}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={totalCols} className="px-8 py-20 text-center">
                <p className={cn("text-label-xs font-semibold uppercase text-muted-foreground/20 italic")}>{tc('no_items')}</p>
              </td>
            </tr>
          ) : (
            lines.map((line, idx) => (
              <tr 
                key={line.id} 
                className={cn(
                  "group transition-all hover:bg-primary/[0.04] border-b border-surface-variant/5",
                  idx % 2 === 0 ? "bg-surface-container-lowest" : "bg-surface-container-low/30"
                )}
              >
                <td className="px-8 py-5">
                  <div className="flex flex-col gap-1">
                    <span className="text-body-md font-bold text-foreground group-hover:text-operational-cyan transition-colors">
                      {locale === 'ar' ? line.item.name_ar : line.item.name_en}
                    </span>
                    <span className="font-mono text-[10px] font-semibold text-muted-foreground/40 tracking-wider uppercase" dir="ltr">
                      {line.item.code}
                    </span>
                  </div>
                </td>
                {!hideLotColumns && (
                  <>
                    <td className="px-6 font-mono text-label-xs text-muted-foreground/60">
                      {line.lot ? <span dir="ltr">{line.lot.lot_number}</span> : <span className="opacity-20">—</span>}
                    </td>
                    <td className="px-6 font-mono text-label-xs text-muted-foreground/60">
                      {line.lot?.expiry_date
                        ? <span dir="ltr">{formatDate(line.lot.expiry_date, locale as 'ar' | 'en')}</span>
                        : <span className="opacity-20">—</span>}
                    </td>
                  </>
                )}
                <td className="px-6 text-center">
                  {renderQty ? (
                    renderQty(line)
                  ) : (
                    <span dir="ltr" className="font-mono text-body-md font-bold text-foreground bg-surface-container-high/20 px-3 py-1 rounded-sm border border-surface-variant/10">
                      {line.qty}
                    </span>
                  )}
                </td>
                <td className="px-6">
                  <span dir="ltr" className="text-label-xs font-black uppercase text-muted-foreground/30">{line.item.primary_uom.code}</span>
                </td>
                {extraColumns.map((col, i) => (
                  <td key={i} className="px-6 text-center">
                    {col.cell(line)}
                  </td>
                ))}
                {!isReadOnly && onRemoveLine && (
                  <td className="px-6 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveLine(line.id)}
                      className="text-muted-foreground/20 hover:text-destructive hover:bg-destructive/5 transition-all p-2 rounded-sm"
                      aria-label="Remove line"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

