'use client';

import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import { formatDate } from '@/utils/currency';
import type { LotAllocation } from '@/types/documents';
import { useVirtualizer } from '@tanstack/react-virtual';
import { RelationalName } from '@/components/shared/RelationalName';

export interface LineItem {
 id: string;
 item: { id: string; code: string; name?: string; nameAr?: string; nameEn?: string; primaryUom?: { code: string; name?: string } | null; category?: { id: string; name: string } | null };
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
   className={cn("w-full overflow-x-auto relative custom-scrollbar rounded-xl border border-border bg-card shadow-sm", dense ? "border-border/80" : "")}
   style={enableVirtualization ? { maxHeight, overflowY: 'auto' } : {}}
  >
   <table className="w-full min-w-full text-start border-collapse text-sm whitespace-nowrap">
    <thead className={cn("hidden md:table-header-group bg-card border-b border-border text-muted-foreground text-xs uppercase tracking-wider sticky top-0 z-20", dense ? "border-b border-border" : "")}>
     <tr>
      <th className={cn("sticky start-0 z-20 bg-card border-e border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] px-6 py-4 font-medium text-start whitespace-nowrap text-muted-foreground w-full min-w-[120px] md:min-w-[180px]", dense ? "px-4 py-2 h-9 text-[10px]" : "px-8 h-14")}>{h.name}</th>
      {!hideLotColumns && (
       <>
        <th className={cn("px-6 py-4 font-medium text-start whitespace-nowrap text-muted-foreground hidden md:table-cell", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{h.lot}</th>
        <th className={cn("px-6 py-4 font-medium text-start whitespace-nowrap text-muted-foreground hidden md:table-cell", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{h.expiry}</th>
       </>
      )}
      <th className={cn("px-6 py-4 font-medium text-center whitespace-nowrap text-muted-foreground min-w-[120px]", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14 min-w-[120px]")}>{h.qty}</th>
      <th className={cn("px-6 py-4 font-medium text-start whitespace-nowrap text-muted-foreground", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{h.uom}</th>
      {extraColumns.map((col, i) => (
       <th key={i} className={cn("px-6 py-4 font-medium text-center whitespace-nowrap text-muted-foreground", dense ? "px-3 py-2 h-9 text-[10px]" : "px-6 h-14")}>{col.header}</th>
      ))}
      {!isReadOnly && onRemoveLine && (
       <th className={cn("px-6 py-4 font-medium whitespace-nowrap w-10 text-muted-foreground", dense ? "px-3 py-2 h-9" : "px-6 h-14")} />
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
          ref={rowVirtualizer.measureElement}
          data-index={virtualRow.index}
          className={cn(
           "border-b border-border last:border-0 hover:bg-muted/50 transition-colors group",
           rowClassName?.(line, idx),
           "flex flex-wrap gap-y-4 p-5 mb-4 border border-brand-gold/30 bg-card rounded-2xl md:table-row md:border-b md:border-border/50 md:bg-transparent md:p-0 md:mb-0 md:rounded-none shadow-md md:shadow-none"
          )}
          style={{ minHeight: `${dense ? 48 : 64}px` }}
         >
          <td className={cn("block w-full p-0 border-none bg-transparent md:table-cell md:w-auto md:align-middle order-1 md:sticky md:start-0 md:z-20 md:bg-card md:border-e md:border-border/50 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:min-w-[180px]", dense ? "md:px-4 md:py-1.5" : "md:px-8 md:py-5")}>
           <div className="flex justify-between items-start w-full">
            <div className="flex flex-col gap-0.5 max-w-[120px] sm:max-w-[150px] md:max-w-none">
             <span className={cn("font-bold text-foreground group-hover:text-operational-cyan transition-colors truncate block", dense ? "text-xs" : "text-body-md")}>
              {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
             </span>
             <span className={cn("font-mono font-semibold text-muted-foreground/40 tracking-wider uppercase", dense ? "text-[9px]" : "text-[10px]")} dir="ltr">
              {line.item.code}
             </span>
            </div>
            {!isReadOnly && onRemoveLine && (
             <div className="md:hidden">
              <button
               type="button"
               onClick={() => onRemoveLine(line.id)}
               className="p-2 md:p-3 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-red-400 rounded-lg transition-colors flex items-center justify-center"
               aria-label={tc('actions.remove_line')}
              >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
              </button>
             </div>
            )}
           </div>
          </td>
          {!hideLotColumns && (
           <>
            <td className={cn("font-mono text-label-xs text-muted-foreground/60 hidden md:table-cell", dense ? "px-3 py-1.5 text-[11px]" : "px-6")}>
             {line.lot ? <span dir="ltr">{line.lot.lotNumber}</span> : <span className="opacity-20">—</span>}
            </td>
            <td className={cn("font-mono text-label-xs text-muted-foreground/60 hidden md:table-cell", dense ? "px-3 py-1.5 text-[11px]" : "px-6")}>
             {line.lot?.expiryDate
              ? <span dir="ltr">{formatDate(line.lot.expiryDate, locale as 'ar' | 'en')}</span>
              : <span className="opacity-20">—</span>}
            </td>
           </>
          )}
          <td className={cn("block w-1/3 p-0 border-none bg-transparent pr-2 md:pr-0 md:table-cell md:w-auto md:align-middle order-3 text-start md:text-center", dense ? "md:px-3 md:py-1.5" : "md:px-6")}>
           <div className="flex flex-col md:block gap-1">
            <span className="md:hidden block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{h.qty}</span>
            <div className="flex items-center w-full">
             {renderQty ? (
              renderQty(line)
             ) : (
              <span dir="ltr" className={cn("font-mono font-bold text-foreground bg-surface-container-high/20 rounded-sm border", dense ? "text-xs px-2 py-0.5" : "text-body-md px-3 py-1")}>
               {line.qty}
              </span>
             )}
            </div>
           </div>
          </td>
          <td className={cn("block w-2/3 p-0 border-none bg-transparent pl-2 md:pl-0 md:table-cell md:w-auto md:align-middle order-4", dense ? "md:px-3 md:py-1.5" : "md:px-6")}>
           <div className="flex flex-col md:block gap-1">
            <span className="md:hidden block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{h.uom}</span>
            <div className="flex items-center w-full">
             {renderUom ? (
              renderUom(line)
             ) : (
              <RelationalName name={line.item.primaryUom?.name || line.item.primaryUom?.code} rawId={line.uomId} fallback="N/A" className="text-xs font-medium uppercase text-muted-foreground" />
             )}
            </div>
           </div>
          </td>
          {extraColumns.map((col, i) => (
           <td key={i} className={cn("block p-0 border-none bg-transparent md:table-cell md:w-auto md:align-middle text-start md:text-center", col.mobileWidth || "w-full", dense ? "md:px-3 md:py-1.5" : "md:px-6")} style={{ order: col.mobileOrder || 5 }}>
            {col.cell(line)}
           </td>
          ))}
          {!isReadOnly && onRemoveLine && (
           <td className={cn("hidden md:table-cell text-center min-w-[120px]", dense ? "px-2 py-1" : "px-6")}>
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
         dense ? "md:border-none" : "md:border-b",
         idx % 2 === 0 ? "md:bg-card md:border md:border-border md:shadow-sm" : "md:bg-card md:border md:border-border md:shadow-sm/30",
         rowClassName?.(line, idx),
         "flex flex-wrap gap-y-4 p-5 mb-4 border border-brand-gold/30 bg-card rounded-2xl md:table-row md:bg-transparent md:p-0 md:mb-0 md:rounded-none shadow-md md:shadow-none"
        )}
       >
        <td className={cn("block w-full p-0 border-none bg-transparent md:table-cell md:w-auto md:align-middle order-1 md:sticky md:start-0 md:z-20 md:bg-card md:border-e md:border-border/50 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:min-w-[180px]", dense ? "md:px-4 md:py-1.5" : "md:px-8 md:py-5")}>
         <div className="flex justify-between items-start w-full">
          <div className="flex flex-col gap-0.5 max-w-[120px] sm:max-w-[150px] md:max-w-none">
           <span className={cn("font-bold text-foreground group-hover:text-operational-cyan transition-colors truncate block", dense ? "text-xs" : "text-body-md")}>
            {locale === 'ar' ? (line.item.nameAr || line.item.name || line.item.nameEn || '') : (line.item.nameEn || line.item.name || line.item.nameAr || '')}
           </span>
           <span className={cn("font-mono font-semibold text-muted-foreground/40 tracking-wider uppercase", dense ? "text-[9px]" : "text-[10px]")} dir="ltr">
            {line.item.code}
           </span>
          </div>
          {!isReadOnly && onRemoveLine && (
           <div className="md:hidden">
            <button
             type="button"
             onClick={() => onRemoveLine(line.id)}
             className="p-2 md:p-3 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-red-400 rounded-lg transition-colors flex items-center justify-center"
             aria-label={tc('actions.remove_line')}
            >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
            </button>
           </div>
          )}
         </div>
        </td>
        {!hideLotColumns && (
         <>
          <td className={cn("font-mono text-label-xs text-muted-foreground/60 hidden md:table-cell", dense ? "px-3 py-1.5 text-[11px]" : "px-6")}>
           {line.lot ? <span dir="ltr">{line.lot.lotNumber}</span> : <span className="opacity-20">—</span>}
          </td>
          <td className={cn("font-mono text-label-xs text-muted-foreground/60 hidden md:table-cell", dense ? "px-3 py-1.5 text-[11px]" : "px-6")}>
           {line.lot?.expiryDate
            ? <span dir="ltr">{formatDate(line.lot.expiryDate, locale as 'ar' | 'en')}</span>
            : <span className="opacity-20">—</span>}
          </td>
         </>
        )}
        <td className={cn("block w-1/3 p-0 border-none bg-transparent pr-2 md:pr-0 md:table-cell md:w-auto md:align-middle order-3 text-start md:text-center", dense ? "md:px-3 md:py-1.5" : "md:px-6")}>
         <div className="flex flex-col md:block gap-1">
          <span className="md:hidden block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{h.qty}</span>
          <div className="flex items-center w-full">
           {renderQty ? (
            renderQty(line)
           ) : (
            <span dir="ltr" className={cn("font-mono font-bold text-foreground bg-surface-container-high/20 rounded-sm border", dense ? "text-xs px-2 py-0.5" : "text-body-md px-3 py-1")}>
             {line.qty}
            </span>
           )}
          </div>
         </div>
        </td>
        <td className={cn("block w-2/3 p-0 border-none bg-transparent pl-2 md:pl-0 md:table-cell md:w-auto md:align-middle order-4", dense ? "md:px-3 md:py-1.5" : "md:px-6")}>
         <div className="flex flex-col md:block gap-1">
          <span className="md:hidden block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">{h.uom}</span>
          <div className="flex items-center w-full">
           {renderUom ? (
            renderUom(line)
           ) : (
            <RelationalName name={line.item.primaryUom?.name || line.item.primaryUom?.code} rawId={line.uomId} fallback="N/A" className="text-xs font-medium uppercase text-muted-foreground" />
           )}
          </div>
         </div>
        </td>
        {extraColumns.map((col, i) => (
         <td key={i} className={cn("block p-0 border-none bg-transparent md:table-cell md:w-auto md:align-middle text-start md:text-center", col.mobileWidth || "w-full", dense ? "md:px-3 md:py-1.5" : "md:px-6")} style={{ order: col.mobileOrder || 5 }}>
          {col.cell(line)}
         </td>
        ))}
        {!isReadOnly && onRemoveLine && (
         <td className={cn("hidden md:table-cell text-center", dense ? "px-2 py-1" : "px-6")}>
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

