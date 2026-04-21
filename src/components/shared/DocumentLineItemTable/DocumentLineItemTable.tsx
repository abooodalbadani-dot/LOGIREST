'use client';

import React from 'react';

interface LineItem {
  id: string;
  item: { code: string; name_ar: string; name_en: string; primary_uom: { code: string } };
  lot?: { lot_number: string; expiry_date: string | null } | null;
  qty: number;
  uom_id: string;
  unit_cost?: number | null;
  [key: string]: unknown;
}

interface ExtraColumn {
  header: string;
  cell: (line: LineItem) => React.ReactNode;
}

interface DocumentLineItemTableProps {
  lines: LineItem[];
  extraColumns?: ExtraColumn[];
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

export function DocumentLineItemTable({
  lines,
  extraColumns = [],
  onRemoveLine,
  isReadOnly,
  locale,
  headers = {},
  hideLotColumns = false,
}: DocumentLineItemTableProps) {
  const h = {
    code:   headers.code   ?? 'Item Code',
    name:   headers.name   ?? 'Item Name',
    lot:    headers.lot    ?? 'Lot',
    expiry: headers.expiry ?? 'Expiry',
    qty:    headers.qty    ?? 'Qty',
    uom:    headers.uom    ?? 'UoM',
  };

  // Count base columns to set correct colSpan for empty state
  const baseCols = hideLotColumns ? 4 : 6;
  const totalCols = baseCols + extraColumns.length + (!isReadOnly && onRemoveLine ? 1 : 0);

  return (
    <div className="overflow-x-auto border border-surface-3 rounded bg-surface-1">
      <table className="w-full text-sm text-left rtl:text-right">
        <thead className="bg-surface-2 text-on-surface-muted border-b border-surface-3 text-xs uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3 font-medium whitespace-nowrap">{h.code}</th>
            <th className="px-4 py-3 font-medium whitespace-nowrap">{h.name}</th>
            {!hideLotColumns && (
              <>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{h.lot}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{h.expiry}</th>
              </>
            )}
            <th className="px-4 py-3 font-medium whitespace-nowrap text-center">{h.qty}</th>
            <th className="px-4 py-3 font-medium whitespace-nowrap">{h.uom}</th>
            {extraColumns.map((col, i) => (
              <th key={i} className="px-4 py-3 font-medium whitespace-nowrap text-center">{col.header}</th>
            ))}
            {!isReadOnly && onRemoveLine && (
              <th className="px-4 py-3 font-medium whitespace-nowrap w-10" />
            )}
          </tr>
        </thead>
        <tbody>
          {lines.length === 0 ? (
            <tr>
              <td colSpan={totalCols} className="px-4 py-8 text-center text-on-surface-muted">
                No items added.
              </td>
            </tr>
          ) : (
            lines.map(line => (
              <tr key={line.id} className="border-b border-surface-3 hover:bg-surface-2 transition-colors">
                <td className="px-4 py-3 font-mono text-sm">{line.item.code}</td>
                <td className="px-4 py-3">{locale === 'ar' ? line.item.name_ar : line.item.name_en}</td>
                {!hideLotColumns && (
                  <>
                    <td className="px-4 py-3 font-mono text-on-surface-muted text-sm">
                      {line.lot ? line.lot.lot_number : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-on-surface-muted text-sm">
                      {line.lot?.expiry_date
                        ? new Date(line.lot.expiry_date).toLocaleDateString()
                        : '—'}
                    </td>
                  </>
                )}
                <td className="px-4 py-3 text-center font-mono">
                  <span dir="ltr">{line.qty}</span>
                </td>
                <td className="px-4 py-3 font-mono text-sm">{line.item.primary_uom.code}</td>
                {extraColumns.map((col, i) => (
                  <td key={i} className="px-4 py-3 text-center">
                    {col.cell(line)}
                  </td>
                ))}
                {!isReadOnly && onRemoveLine && (
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveLine(line.id)}
                      className="text-on-surface-muted hover:text-neon-red transition-colors p-1 rounded"
                      aria-label="Remove line"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
