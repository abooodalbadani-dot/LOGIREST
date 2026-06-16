'use client';
import * as React from 'react';
import { 
 useReactTable, 
 getCoreRowModel, 
 getSortedRowModel,
 flexRender,
 ColumnDef,
 RowData,
 SortingState,
 ColumnSort,
 Header
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type ResourceType } from '@/types/rbac';

declare module '@tanstack/react-table' {
 // eslint-disable-next-line @typescript-eslint/no-unused-vars
 interface ColumnMeta<TData extends RowData, TValue> {
 numeric?: boolean;
 sortBy?: string;
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
import { ExportMenu } from '../ExportMenu';

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
 enableExport?: boolean;
 exportFilename?: string;
 exportTitle?: string;
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
 sorting?: SortingState;
 onSortingChange?: (sorting: SortingState) => void;
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
 enableExport = true,
 exportFilename,
 exportTitle,
 emptyState,
 emptyTitle,
 emptyDescription,
 filters,
 onRowClick,
 rowClassName,
 collectionName,
 enableVirtualization = false,
 virtualRowHeight = 48,
 containerHeight = '600px',
 sorting: controlledSorting,
 onSortingChange: controlledOnSortingChange,
}: DataTableProps<T>) {
 const t = useTranslations('common.datatable');
 const locale = useLocale();
 const parentRef = React.useRef<HTMLDivElement>(null);

 const exportColumns = React.useMemo(() => {
  return columns
   .map(col => {
    const key = ('accessorKey' in col ? (col.accessorKey as string | undefined) : undefined) || col.id;
    if (!key || key === 'actions') return null;

    let headerStr = '';
    if (typeof col.header === 'string') {
     headerStr = col.header;
    } else {
     headerStr = String(key);
    }
    return { header: headerStr, key };
   })
   .filter((col): col is { header: string; key: string } => !!col && !!col.header);
 }, [columns]);

 const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);

 const sorting = controlledSorting !== undefined ? controlledSorting : internalSorting;
 const onSortingChange = controlledOnSortingChange !== undefined ? controlledOnSortingChange : setInternalSorting;

 const handleSortingChange = React.useCallback((updaterOrValue: SortingState | ((old: SortingState) => SortingState)) => {
 if (typeof updaterOrValue === 'function') {
 onSortingChange(updaterOrValue(sorting));
 } else {
 onSortingChange(updaterOrValue);
 }
 }, [onSortingChange, sorting]);

 const table = useReactTable({
 data: data || [],
 columns,
 getCoreRowModel: getCoreRowModel(),
 getSortedRowModel: getSortedRowModel(),
 state: {
 sorting,
 },
 onSortingChange: handleSortingChange,
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

 const isRtl = locale === 'ar';

 const getSortIndicator = (column: Header<T, unknown>) => {
  const sort = sorting.find((s: ColumnSort) => s.id === column.id);
  if (!sort) return '⇅';
  return sort.desc ? '▼' : '▲';
 };

 const isColumnSortable = (column: Header<T, unknown>) => {
  const enableSorting = column.column.columnDef.enableSorting as unknown as boolean | undefined;
  return enableSorting !== false;
 };

 return (
 <div className="flex flex-col gap-6 w-full">
 {(filters || onExport || exportComponent || (enableExport && data && data.length > 0)) && (
 <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
 <div className="w-full sm:max-w-md flex-1 shrink-0 min-w-[200px]">
 {filters}
 </div>
 { (onExport || exportComponent || (enableExport && data && data.length > 0)) && (
 <PermissionGate action="export" resource={collectionName || 'generic_table'}>
 <div className="w-full sm:w-auto flex items-center gap-2">
 {exportComponent}
 {!exportComponent && enableExport && data && data.length > 0 && (
  <ExportMenu
   data={data as Record<string, unknown>[]}
   columns={exportColumns}
   filename={exportFilename || collectionName || 'report'}
   title={exportTitle || collectionName || 'Report'}
  />
 )}
 {!exportComponent && !enableExport && onExport && (
  <Button 
   variant="secondary"
   onClick={onExport}
   className="w-full sm:w-auto h-10 px-4 bg-transparent border border-gray-300 dark:border-neutral-700 text-text-main dark:text-gray-200 hover:bg-muted dark:hover:bg-neutral-800 rounded-md transition-colors flex items-center justify-center gap-2"
  >
   CSV
  </Button>
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
      variant="minimal"
      title={emptyTitle || t('no_records')}
      description={emptyDescription}
     />
    )}
   </div>
  ) : (
    <div 
     ref={parentRef}
     className="w-full overflow-x-auto rounded-xl border border-border bg-card shadow-sm"
     style={enableVirtualization ? { height: containerHeight } : {}}
    >
     <table 
      className="w-full text-start border-collapse text-sm whitespace-nowrap min-w-[800px]"
     >
      <thead className="bg-muted/50 border-b border-border text-muted-foreground text-xs uppercase tracking-wider sticky top-0 z-20">
       {table.getHeaderGroups().map(headerGroup => (
        <tr key={headerGroup.id}>
         {headerGroup.headers.map((header, idx) => {
          const isNumeric = header.column.columnDef.meta?.numeric === true;
          const isFirst = idx === 0;
          const sortable = isColumnSortable(header);
          const sortIndicator = sortable ? getSortIndicator(header) : null;
           return (
            <th 
             key={header.id} 
             className={cn(
              "px-6 py-4 font-medium text-start whitespace-nowrap backdrop-blur-sm bg-muted/50",
              isNumeric ? 'text-end' : 'text-start',
              isFirst ? 'sticky start-0 z-30 bg-card group-hover:bg-muted/50 transition-colors shadow-[4px_0_12px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_12px_rgba(0,0,0,0.2)] rtl:shadow-[-4px_0_12px_rgba(0,0,0,0.03)] rtl:dark:shadow-[-4px_0_12px_rgba(0,0,0,0.2)]' : '',
              sortable && 'cursor-pointer select-none'
             )}
            onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
           >
            <div className={cn("flex h-full items-center gap-1", isNumeric ? "justify-end" : "justify-start")}>
             {flexRender(header.column.columnDef.header, header.getContext())}
             {sortIndicator && (
              <span className={cn(
               "text-xs opacity-60 inline-block",
               isRtl ? "order-first" : "order-last"
              )}>
               {sortIndicator}
              </span>
             )}
            </div>
           </th>
          );
         })}
        </tr>
       ))}
      </thead>
      <tbody className="divide-y divide-border border-none bg-card">
       {enableVirtualization ? (
        <>
         {paddingTop > 0 && (
          <tr>
           <td style={{ height: `${paddingTop}px` }} colSpan={columns.length} />
          </tr>
         )}
         {virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index];
           return (
            <tr 
             key={row.id} 
             className={`border-b border-border last:border-0 hover:bg-muted/50 transition-colors group ${onRowClick ? "cursor-pointer" : ""} ${rowClassName ? rowClassName(row.original) : ""}`} 
             style={{ height: `${virtualRowHeight}px` }}
             onClick={() => onRowClick && onRowClick(row.original)}
            >
            {row.getVisibleCells().map((cell, idx) => {
             const isNumeric = cell.column.columnDef.meta?.numeric === true;
             const isFirst = idx === 0;
              return (
               <td 
                key={cell.id} 
                className={cn(
                  "px-6 py-4 text-foreground text-sm whitespace-nowrap",
                  isNumeric ? 'text-end font-mono text-muted-foreground' : 'text-start',
                  isFirst ? 'sticky start-0 z-10 bg-card group-hover:bg-muted/50 transition-colors shadow-[4px_0_12px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_12px_rgba(0,0,0,0.2)] rtl:shadow-[-4px_0_12px_rgba(0,0,0,0.03)] rtl:dark:shadow-[-4px_0_12px_rgba(0,0,0,0.2)]' : ''
                )}
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
        table.getRowModel().rows.map((row) => (
         <tr 
          key={row.id} 
          className={`border-b border-border last:border-0 hover:bg-muted/50 transition-colors group ${onRowClick ? "cursor-pointer" : ""} ${rowClassName ? rowClassName(row.original) : ""}`} 
          style={{ height: `${virtualRowHeight}px` }}
          onClick={() => onRowClick && onRowClick(row.original)}
         >
          {row.getVisibleCells().map((cell, idx) => {
           const isNumeric = cell.column.columnDef.meta?.numeric === true;
           const isFirst = idx === 0;
           return (
            <td 
             key={cell.id} 
             className={cn(
               "px-6 py-4 text-foreground text-sm whitespace-nowrap",
               isNumeric ? 'text-end font-mono text-muted-foreground' : 'text-start',
               isFirst ? 'sticky start-0 z-10 bg-card group-hover:bg-muted/50 transition-colors shadow-[4px_0_12px_rgba(0,0,0,0.03)] dark:shadow-[4px_0_12px_rgba(0,0,0,0.2)] rtl:shadow-[-4px_0_12px_rgba(0,0,0,0.03)] rtl:dark:shadow-[-4px_0_12px_rgba(0,0,0,0.2)]' : ''
             )}
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
 <div className={cn("text-label-xs font-bold text-muted-foreground uppercase opacity-70 whitespace-nowrap")}>
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