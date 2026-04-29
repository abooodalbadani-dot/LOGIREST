'use client';
// use no memo
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender,
  ColumnDef,
  RowData
} from '@tanstack/react-table';
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

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  isLoading?: boolean;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  onExport?: () => void;
  emptyState?: React.ReactNode;
  filters?: React.ReactNode;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  collectionName?: ResourceType;
}

export function DataTable<T>({
  data,
  columns,
  isLoading,
  pagination,
  onExport,
  emptyState,
  filters,
  onRowClick,
  rowClassName,
  collectionName
}: DataTableProps<T>) {
  const t = useTranslations('common.datatable');
  const locale = useLocale();
  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-6 w-full">
      {(filters || onExport) && (
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            {filters}
          </div>
          {onExport && (
            <PermissionGate action="export" resource={collectionName || 'generic_table'}>
              <div className="flex items-center gap-2 mt-1">
                <Button 
                  variant="secondary"
                  size="sm"
                  onClick={onExport}
                  className={`h-9 px-6 flex items-center gap-2 rounded-2xl bg-surface-container-low hover:bg-surface-container text-[9px] font-black uppercase ${locale === 'ar' ? 'tracking-normal' : 'tracking-[0.08em]'} transition-all border-none`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
                  CSV
                </Button>
                <Button 
                  variant="secondary"
                  size="sm"
                  onClick={onExport}
                  className={`h-9 px-6 flex items-center gap-2 rounded-2xl bg-surface-container-low hover:bg-surface-container text-[9px] font-black uppercase ${locale === 'ar' ? 'tracking-normal' : 'tracking-[0.08em]'} transition-all border-none`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M8 13h2m4 0h2M8 17h2m4 0h2"/></svg>
                  Excel
                </Button>
              </div>
            </PermissionGate>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg bg-surface-container-lowest ambient-shadow">
        <table 
          className="w-full text-start border-collapse min-w-[800px]"
          data-webmcp-collection={collectionName || 'generic_table'}
        >
          <thead className="bg-surface-container-low/30 text-muted-foreground">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, idx) => {
                    const isNumeric = header.column.columnDef.meta?.numeric === true;
                    const isFirst = idx === 0;
                    const isLast = idx === headerGroup.headers.length - 1;
                    return (
                      <th 
                        key={header.id} 
                        className={`px-4 h-14 font-bold text-[11px] uppercase whitespace-nowrap ${locale === 'ar' ? 'tracking-normal' : 'tracking-[0.08em]'} ${isNumeric ? 'text-end' : 'text-start'} ${isFirst ? 'ps-8' : ''} ${isLast ? 'pe-8' : ''}`}
                      >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-none border-none">
            {isLoading ? (
              Array.from({ length: 9 }).map((_, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-transparent' : 'bg-surface-container-low/20'}>
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 h-12">
                      <div className="h-2 bg-foreground/[0.04] animate-pulse rounded-full w-[60%]"></div>
                    </td>
                  ))}
                </tr>
              ))
                        ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={cn("px-4 py-16 text-center text-muted-foreground italic text-xs uppercase opacity-60", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>
                  {emptyState || t('no_records')}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, i) => (
                <tr 
                  key={row.id} 
                  className={`transition-all duration-[140ms] ease-out h-14 ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface-container-low/60'} hover:bg-primary/[0.04] ${onRowClick ? "cursor-pointer" : ""} ${rowClassName ? rowClassName(row.original) : ""}`} 
                  onClick={() => onRowClick && onRowClick(row.original)}
                  data-webmcp-row={row.id}
                >
                  {row.getVisibleCells().map((cell, idx) => {
                    const isNumeric = cell.column.columnDef.meta?.numeric === true;
                    const isFirst = idx === 0;
                    const isLast = idx === row.getVisibleCells().length - 1;
                    return (
                      <td 
                        key={cell.id} 
                        className={`px-4 text-[14px] font-medium border-none ${isNumeric ? 'text-end font-mono' : 'text-start'} ${isFirst ? 'ps-8' : ''} ${isLast ? 'pe-8' : ''}`}
                        dir={isNumeric ? 'ltr' : undefined}
                        data-webmcp-field={cell.column.id}
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

      {pagination && !isLoading && data.length > 0 && (
        <div className="flex items-center justify-between mt-2 px-2">
           <div className={cn("text-[10px] font-bold text-muted-foreground uppercase opacity-70", locale === 'ar' ? "tracking-normal" : "tracking-[0.05em]")}>
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
