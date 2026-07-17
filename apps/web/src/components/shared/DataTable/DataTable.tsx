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

const getHeaderString = (header: unknown): string => {
  if (header === null || header === undefined) return '';
  if (typeof header === 'string') return header;
  if (typeof header === 'number') return String(header);
  if (typeof header === 'function') {
    try {
      const fn = header as (props: { column: unknown; header: unknown; table: unknown }) => unknown;
      const evaluated = fn({
        column: {},
        header: {},
        table: {},
      });
      return getHeaderString(evaluated);
    } catch {
      return '';
    }
  }
  if (React.isValidElement(header)) {
    const props: unknown = header.props;
    if (props && typeof props === 'object') {
      if ('title' in props && props.title) {
        const titleStr = getHeaderString(props.title);
        if (titleStr) return titleStr;
      }
      if ('children' in props && props.children) {
        const children = props.children;
        if (Array.isArray(children)) {
          return children
            .map((child: unknown) => getHeaderString(child))
            .filter(Boolean)
            .join(' ')
            .trim();
        }
        return getHeaderString(children);
      }
    }
  }
  return '';
};

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
    onPageSizeChange?: (pageSize: number) => void;
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
  renderMobileCard?: (item: T) => React.ReactNode;
}

const formatLocalTime = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  const hr = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${d}/${m}/${y} ${hr}:${min}`;
};

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
  renderMobileCard,
}: DataTableProps<T>) {
  const t = useTranslations('common.datatable');
  const locale = useLocale();
  const parentRef = React.useRef<HTMLDivElement>(null);

  const pageValue = pagination?.page;
  const totalValue = pagination?.total;
  const onPageChange = pagination?.onPageChange;

  React.useEffect(() => {
    if (
      !isLoading &&
      !isError &&
      data &&
      data.length === 0 &&
      pageValue &&
      pageValue > 1 &&
      totalValue &&
      totalValue > 0 &&
      onPageChange
    ) {
      onPageChange(1);
    }
  }, [isLoading, isError, data, pageValue, totalValue, onPageChange]);

  const exportColumns = React.useMemo(() => {
    return columns
      .map(col => {
        const key = ('accessorKey' in col ? (col.accessorKey as string | undefined) : undefined) || col.id;
        if (!key) return null;

        // Exclude standard UI-only columns: select, actions, expander
        const excludedKeys = ['select', 'actions', 'expander'];
        if (excludedKeys.includes(key.toLowerCase())) return null;

        // Exclude any columns that do not have a valid, printable string header
        const resolvedHeader = getHeaderString(col.header);
        if (!resolvedHeader || !resolvedHeader.trim()) {
          return null;
        }

        return { header: resolvedHeader, key };
      })
      .filter((col): col is { header: string; key: string } => !!col);
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
  const isIssuesList = collectionName === 'operations_issues';

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
    <div className="flex flex-col gap-6 w-full min-w-0">
      {(filters || onExport || exportComponent || (enableExport && data && data.length > 0)) && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full mb-6 min-w-0">
          {filters}
          <div className="hidden md:block flex-1" />
          {(onExport || exportComponent || (enableExport && data && data.length > 0)) && (
            <PermissionGate action="export" resource={collectionName || 'generic_table'}>
              <div className="flex items-center w-full md:w-auto mt-2 md:mt-0 justify-end">
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
          className={cn(
            "w-full min-w-0 -mx-4 px-4 md:mx-0 md:px-0 md:border md:rounded-xl overflow-x-auto bg-card md:bg-transparent custom-scrollbar",
            isIssuesList ? "md:border-brand-gold" : "md:border-border/50",
            renderMobileCard ? "hidden md:block" : ""
          )}
          style={enableVirtualization ? { height: containerHeight } : {}}
        >
          <table
            className={cn(
              "w-full text-start border-collapse text-sm whitespace-nowrap",
              "min-w-[800px]"
            )}
          >
            <thead className="hidden md:table-header-group bg-muted/50 border-b border-border text-slate-300 font-semibold text-xs uppercase tracking-wider sticky top-0 z-20">
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
                          "px-6 py-4 font-medium text-start whitespace-nowrap backdrop-blur-sm bg-muted/50 group/header",
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
                              "text-xs inline-block transition-opacity duration-150",
                              sorting.some((s: ColumnSort) => s.id === header.column.id)
                                ? "opacity-100 text-primary"
                                : "opacity-0 group-hover/header:opacity-50",
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
            <tbody className={cn(
              "border-none bg-card",
              "divide-y divide-border"
            )}>
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
                        className={cn(
                          "group hover:bg-surface-container-highest/20 transition-colors border-b border-border/50 last:border-0",
                          onRowClick ? "cursor-pointer" : "",
                          rowClassName ? rowClassName(row.original) : ""
                        )}
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
                table.getRowModel().rows.map((row) => {
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-border/50 last:border-0 hover:bg-surface-container-highest/20 transition-colors group",
                        onRowClick ? "cursor-pointer" : "",
                        rowClassName ? rowClassName(row.original) : ""
                      )}
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
                })
              )}
            </tbody>
          </table>
        </div>
      )}
      {renderMobileCard && !isLoading && data.length > 0 && (
        <div className="flex flex-col gap-4 md:hidden w-full mt-4">
          {data.map((item, idx) => (
            <React.Fragment key={idx}>
              {renderMobileCard(item)}
            </React.Fragment>
          ))}
        </div>
      )}

      {pagination && !isLoading && data.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2 px-2 w-full">
          <div className="flex items-center gap-4 flex-wrap">
            <div className={cn("text-label-xs font-bold text-muted-foreground uppercase opacity-70 whitespace-nowrap")}>
              {t('showing')} <span dir="ltr">{(pagination.page - 1) * pagination.pageSize + 1}</span> {t('to')} <span dir="ltr">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> {t('of')} <span dir="ltr">{pagination.total}</span>
            </div>
            {pagination.onPageSizeChange && (
              <div className="flex items-center gap-2 text-label-xs font-bold text-muted-foreground uppercase opacity-70">
                <span>{locale === 'ar' ? 'الصفوف لكل صفحة:' : 'Rows per page:'}</span>
                <select
                  value={pagination.pageSize}
                  onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
                  className="bg-card border border-border rounded px-1.5 py-0.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  {[10, 25, 50, 100].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}
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