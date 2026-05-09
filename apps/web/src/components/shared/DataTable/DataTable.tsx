'use client';
// use no memo
import * as React from 'react';
import { 
 useReactTable, 
 getCoreRowModel, 
 flexRender,
 ColumnDef,
 RowData
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type ResourceType } from '@/types/rbac';

declare module '@tanstack/react-table' {
 // eslint-disable-next-line @typescript-eslint/no-unused-vars
 interface ColumnMeta<TData extends RowData, TValue> {
 numeric?: boolean;
 }
}

import { Button } from '@/components/ui/button';
import { useTranslations, useLocale } from 'next-intl';
import { Pagination } from './Pagination';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { cn } from '@/lib/utils';

import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  onExport?: () => void;
  exportComponent?: React.ReactNode;
  emptyState?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  filters?: React.ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  collectionName?: ResourceType;
  enableVirtualization?: boolean;
  virtualRowHeight?: number;
  containerHeight?: string | number;
}

export function DataTable<T>({
  data,
  columns,
  isLoading,
  isError,
  onRetry,
  pagination,
  onExport,
  exportComponent,
  emptyState,
  emptyTitle,
  emptyDescription,
  filters,
  onRowClick,
  rowClassName,
  collectionName,
  enableVirtualization = false,
  virtualRowHeight = 48,
  containerHeight = '600px'
}: DataTableProps<T>) {
 const t = useTranslations('common.datatable');
 const locale = useLocale();
 const parentRef = React.useRef<HTMLDivElement>(null);

 const table = useReactTable({
 data: data || [],
 columns,
 getCoreRowModel: getCoreRowModel(),
 });

 const { rows } = table.getRowModel();

 const rowVirtualizer = useVirtualizer({
   count: rows.length,
   getScrollElement: () => parentRef.current,
   estimateSize: () => virtualRowHeight,
   overscan: 10,
   enabled: enableVirtualization,
 });

 const virtualRows = rowVirtualizer.getVirtualItems();
 const totalSize = rowVirtualizer.getTotalSize();

 const paddingTop = virtualRows.length > 0 ? virtualRows?.[0]?.start || 0 : 0;
 const paddingBottom =
   virtualRows.length > 0
     ? totalSize - (virtualRows?.[virtualRows.length - 1]?.end || 0)
     : 0;

 return (
 <div className="flex flex-col gap-6 w-full">
 {(filters || onExport) && (
 <div className="flex justify-between items-start gap-4 flex-wrap">
 <div className="flex-1 min-w-[200px]">
 {filters}
 </div>
 { (onExport || exportComponent) && (
 <PermissionGate action="export" resource={collectionName || 'generic_table'}>
 <div className="flex items-center gap-2 mt-1">
 {exportComponent}
 {!exportComponent && onExport && (
 <>
 <Button 
 variant="secondary"
 size="sm"
 onClick={onExport}
 className={`h-9 px-6 flex items-center gap-2 rounded-2xl bg-surface-container-low hover:bg-surface-container text-label-xxs font-semibold uppercase transition-all border-none`}
 >
 <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
 CSV
 </Button>
 <Button 
 variant="secondary"
 size="sm"
 onClick={onExport}
 className={`h-9 px-6 flex items-center gap-2 rounded-2xl bg-surface-container-low hover:bg-surface-container text-label-xxs font-semibold uppercase transition-all border-none`}
 >
 <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M8 13h2m4 0h2M8 17h2m4 0h2"/></svg>
 Excel
 </Button>
 </>
 )}
 </div>
 </PermissionGate>
 )}
 </div>
 )}

  {isError ? (
    <div className="p-8">
      <ErrorState 
        onRetry={onRetry || (() => window.location.reload())} 
      />
    </div>
  ) : isLoading ? (
    <TableSkeleton columns={columns} rows={pagination?.pageSize || 8} />
  ) : data.length === 0 ? (
    <div className="py-12 px-4">
      {emptyState || (
        <EmptyState
          title={emptyTitle || t('no_records')}
          description={emptyDescription || t('no_records_desc')}
        />
      )}
    </div>
  ) : (
    <div 
      ref={parentRef}
      className="overflow-auto rounded-lg bg-surface-container-lowest ambient-shadow"
      style={enableVirtualization ? { height: containerHeight } : {}}
    >
      <table 
        className="w-full text-start border-collapse min-w-[800px]"
      >
        <thead className="bg-surface-container-low/30 text-muted-foreground sticky top-0 z-10">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, idx) => {
                const isNumeric = header.column.columnDef.meta?.numeric === true;
                const isFirst = idx === 0;
                const isLast = idx === headerGroup.headers.length - 1;
                return (
                  <th 
                    key={header.id} 
                    className={`px-4 h-14 font-bold whitespace-nowrap bg-surface-container-low/30 backdrop-blur-sm ${isNumeric ? 'text-end' : 'text-start'} ${isFirst ? 'ps-8' : ''} ${isLast ? 'pe-8' : ''}`}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-none border-none">
          {enableVirtualization ? (
            <>
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} colSpan={columns.length} />
                </tr>
              )}
              {virtualRows.map((virtualRow) => {
                const row = rows[virtualRow.index];
                const i = virtualRow.index;
                return (
                  <tr 
                    key={row.id} 
                    className={`transition-all duration-[140ms] ease-out ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/60'} hover:bg-primary/[0.04] ${onRowClick ? "cursor-pointer" : ""} ${rowClassName ? rowClassName(row.original) : ""}`} 
                    style={{ height: `${virtualRowHeight}px` }}
                    onClick={() => onRowClick && onRowClick(row.original)}
                  >
                    {row.getVisibleCells().map((cell, idx) => {
                      const isNumeric = cell.column.columnDef.meta?.numeric === true;
                      const isFirst = idx === 0;
                      const isLast = idx === row.getVisibleCells().length - 1;
                      return (
                        <td 
                          key={cell.id} 
                          className={`px-4 text-body-md font-medium border-none ${isNumeric ? 'text-end font-mono' : 'text-start'} ${isFirst ? 'ps-8' : ''} ${isLast ? 'pe-8' : ''}`}
                          dir={isNumeric ? 'ltr' : undefined}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td style={{ height: `${paddingBottom}px` }} colSpan={columns.length} />
                </tr>
              )}
            </>
          ) : (
            table.getRowModel().rows.map((row, i) => (
              <tr 
                key={row.id} 
                className={`transition-all duration-[140ms] ease-out ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/60'} hover:bg-primary/[0.04] ${onRowClick ? "cursor-pointer" : ""} ${rowClassName ? rowClassName(row.original) : ""}`} 
                style={{ height: `${virtualRowHeight}px` }}
                onClick={() => onRowClick && onRowClick(row.original)}
              >
                {row.getVisibleCells().map((cell, idx) => {
                  const isNumeric = cell.column.columnDef.meta?.numeric === true;
                  const isFirst = idx === 0;
                  const isLast = idx === row.getVisibleCells().length - 1;
                  return (
                    <td 
                      key={cell.id} 
                      className={`px-4 text-body-md font-medium border-none ${isNumeric ? 'text-end font-mono' : 'text-start'} ${isFirst ? 'ps-8' : ''} ${isLast ? 'pe-8' : ''}`}
                      dir={isNumeric ? 'ltr' : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )}

 {pagination && !isLoading && data.length > 0 && (
 <div className="flex items-center justify-between mt-2 px-2">
 <div className={cn("text-label-xs font-bold text-muted-foreground uppercase opacity-70")}>
 {t('showing')} <span dir="ltr">{(pagination.page - 1) * pagination.pageSize + 1}</span> {t('to')} <span dir="ltr">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> {t('of')} <span dir="ltr">{pagination.total}</span>
 </div>
 <Pagination 
 page={pagination.page} 
 totalPages={pagination.totalPages} 
 onPageChange={pagination.onPageChange} 
 />
 </div>
 )}
 </div>
 );
}
