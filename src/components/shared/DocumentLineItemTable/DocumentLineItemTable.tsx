'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
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
  locale: 'ar' | 'en';
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
}

export function DocumentLineItemTable<T extends LineItem>({
  lines,
  extraColumns = [],
  onRemoveLine,
  isReadOnly,
  locale,
  headers = {},
  hideLotColumns = false,
}: DocumentLineItemTableProps<T>) {
  const t = useTranslations('common.table_headers');
  const tc = useTranslations('common');

  const h = {
    code:   headers.code   ?? t('code'),
    name:   headers.name   ?? t('name'),
    lot:    headers.lot    ?? t('lot'),
    expiry: headers.expiry ?? t('expiry'),
    qty:    headers.qty    ?? t('qty'),
    uom:    headers.uom    ?? t('uom'),
  };

  // Count base columns to set correct colSpan for empty state
  const baseCols = hideLotColumns ? 4 : 6;
  const totalCols = baseCols + extraColumns.length + (!isReadOnly && onRemoveLine ? 1 : 0);

  return (
    <div className="overflow-x-auto rounded-sm border border-white/5 bg-surface-container-low shadow-2xl overflow-hidden">
      <table className="w-full text-left rtl:text-right border-collapse">
        <thead className="bg-surface-container-highest/10 border-b border-white/5">
          <tr>
            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 whitespace-nowrap">{h.code}</th>
            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 whitespace-nowrap">{h.name}</th>
            {!hideLotColumns && (
              <>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 whitespace-nowrap">{h.lot}</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 whitespace-nowrap">{h.expiry}</th>
              </>
            )}
            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 whitespace-nowrap text-center">{h.qty}</th>
            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 whitespace-nowrap">{h.uom}</th>
            {extraColumns.map((col, i) => (
              <th key={i} className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 whitespace-nowrap text-center">{col.header}</th>
            ))}
            {!isReadOnly && onRemoveLine && (
              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 whitespace-nowrap w-10" />
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {lines.length === 0 ? (
            <tr>
              <td colSpan={totalCols} className="px-6 py-20 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/20 italic">{tc('no_items')}</p>
              </td>
            </tr>
          ) : (
            lines.map(line => (
              <tr key={line.id} className="group hover:bg-white/[0.01] transition-all">
                <td className="px-6 py-6 font-mono text-[11px] text-cyan-500/70 tracking-widest uppercase"><span dir="ltr">{line.item.code}</span></td>
                <td className="px-6 py-6 text-xs font-bold text-foreground/80">{locale === 'ar' ? line.item.name_ar : line.item.name_en}</td>
                {!hideLotColumns && (
                  <>
                    <td className="px-6 py-6 font-mono text-[10px] text-muted-foreground/60 tracking-wider">
                      {line.lot ? <span dir="ltr">{line.lot.lot_number}</span> : '—'}
                    </td>
                    <td className="px-6 py-6 font-mono text-[10px] text-muted-foreground/60 tracking-wider">
                      {line.lot?.expiry_date
                        ? <span dir="ltr">{new Date(line.lot.expiry_date).toLocaleDateString()}</span>
                        : '—'}
                    </td>
                  </>
                )}
                <td className="px-6 py-6 text-center">
                  <span dir="ltr" className="font-mono text-sm font-black text-foreground">{line.qty}</span>
                </td>
                <td className="px-6 py-6">
                  <span dir="ltr" className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/40">{line.item.primary_uom.code}</span>
                </td>
                {extraColumns.map((col, i) => (
                  <td key={i} className="px-6 py-6 text-center">
                    {col.cell(line)}
                  </td>
                ))}
                {!isReadOnly && onRemoveLine && (
                  <td className="px-6 py-6 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveLine(line.id)}
                      className="text-muted-foreground/20 hover:text-rose-500 hover:bg-rose-500/10 transition-all p-2 rounded-sm"
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
