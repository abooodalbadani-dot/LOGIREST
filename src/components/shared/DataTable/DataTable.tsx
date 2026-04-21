'use client';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender,
  ColumnDef
} from '@tanstack/react-table';
import { Pagination } from './Pagination';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  isLoading?: boolean;
  pagination?: PaginationProps;
  onExport?: () => void;
  emptyState?: React.ReactNode;
  filters?: React.ReactNode;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  data,
  columns,
  isLoading,
  pagination,
  onExport,
  emptyState,
  filters,
  onRowClick
}: DataTableProps<T>) {
  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4 w-full">
      {(filters || onExport) && (
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            {filters}
          </div>
          {onExport && (
            <button 
              onClick={onExport}
              className="px-4 py-2 mt-1 bg-surface-2 border border-surface-3 text-on-surface hover:bg-surface-3 transition-colors rounded text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export to CSV
            </button>
          )}
        </div>
      )}

      <div className="overflow-x-auto border border-surface-3 rounded bg-surface-1">
        <table className="w-full text-sm text-left rtl:text-right">
          <thead className="bg-surface-2 text-on-surface-muted border-b border-surface-3">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  const isNumeric = (header.column.columnDef.meta as any)?.numeric === true;
                  return (
                    <th 
                      key={header.id} 
                      className={`px-4 py-3 font-medium whitespace-nowrap ${isNumeric ? 'text-right rtl:text-left' : ''}`}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 9 }).map((_, i) => (
                <tr key={i} className="border-b border-surface-3">
                  {columns.map((c, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-6 bg-surface-3 animate-pulse rounded w-3/4"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr className="border-b border-surface-3">
                <td colSpan={columns.length} className="px-4 py-12 text-center text-on-surface-muted">
                  {emptyState || 'No records found.'}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className={`border-b border-surface-3 hover:bg-surface-2 transition-colors ${onRowClick ? "cursor-pointer" : ""}`} onClick={() => onRowClick && onRowClick(row.original)}>
                  {row.getVisibleCells().map(cell => {
                    const isNumeric = (cell.column.columnDef.meta as any)?.numeric === true;
                    return (
                      <td 
                        key={cell.id} 
                        className={`px-4 py-3 ${isNumeric ? 'text-right rtl:text-left' : ''}`}
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

      {pagination && !isLoading && data.length > 0 && (
        <div className="flex items-center justify-between mt-2">
           <div className="text-sm text-on-surface-muted">
             Showing <span dir="ltr">{(pagination.page - 1) * pagination.pageSize + 1}</span> to <span dir="ltr">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> of <span dir="ltr">{pagination.total}</span>
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
