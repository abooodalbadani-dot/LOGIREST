"use client"
// use no memo

import * as React from "react"
import {
 ColumnDef,
 flexRender,
 getCoreRowModel,
 useReactTable,
 getPaginationRowModel,
 getFilteredRowModel,
 SortingState,
 getSortedRowModel,
 ColumnFiltersState,
} from "@tanstack/react-table"

import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react"

// A generic translation placeholder mechanism since this is a client component
// and next-intl might not be universally available in simple stories.
// Usually, we'd inject this from the parent via props or use the hook directly.
import { useTranslations } from "next-intl"

interface DataTableProps<TData, TValue> {
 columns: ColumnDef<TData, TValue>[]
 data: TData[]
 searchKey?: string
 searchPlaceholder?: string
 enableExport?: boolean
 onExport?: () => void
}

export function DataTable<TData, TValue>({
 columns,
 data,
 searchKey,
 searchPlaceholder,
 enableExport,
 onExport,
}: DataTableProps<TData, TValue>) {
 const [sorting, setSorting] = React.useState<SortingState>([])
 const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
 const t = useTranslations("common");

 const table = useReactTable({
 data,
 columns,
 getCoreRowModel: getCoreRowModel(),
 getPaginationRowModel: getPaginationRowModel(),
 onSortingChange: setSorting,
 getSortedRowModel: getSortedRowModel(),
 onColumnFiltersChange: setColumnFilters,
 getFilteredRowModel: getFilteredRowModel(),
 state: {
 sorting,
 columnFilters,
 },
 })

 const [isRtl, setIsRtl] = React.useState(false)

 React.useEffect(() => {
 setIsRtl(document.documentElement.dir === 'rtl')
 
 const observer = new MutationObserver(() => {
 setIsRtl(document.documentElement.dir === 'rtl')
 })
 observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] })
 return () => observer.disconnect()
 }, [])

 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 {searchKey ? (
 <div className="relative max-w-sm w-full">
 <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <Input
  placeholder={searchPlaceholder || t("table.search")} value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""} onChange={(event) =>
 table.getColumn(searchKey)?.setFilterValue(event.target.value)
 }
 className="max-w-sm ps-10"
 />
 </div>
 ) : <div />}
 {enableExport && (
 <Button variant="outline" onClick={onExport} className="bg-surface-container-low hover:bg-surface-container-high border-border-surface">
 <Download className="me-2 h-4 w-4" />
 {t("table.export")}
 </Button>
 )}
 </div>
 <div className="rounded-xl border border-border-surface bg-surface-container-low overflow-hidden shadow-sm">
 <Table>
 <TableHeader>
 {table.getHeaderGroups().map((headerGroup) => (
 <TableRow key={headerGroup.id}>
 {headerGroup.headers.map((header) => {
 return (
 <TableHead key={header.id}>
 {header.isPlaceholder
 ? null
 : flexRender(
 header.column.columnDef.header,
 header.getContext()
 )}
 </TableHead>
 )
 })}
 </TableRow>
 ))}
 </TableHeader>
 <TableBody>
 {table.getRowModel().rows?.length ? (
 table.getRowModel().rows.map((row) => (
 <TableRow
 key={row.id}
 data-state={row.getIsSelected() && "selected"}
 >
 {row.getVisibleCells().map((cell) => (
 <TableCell key={cell.id}>
 {flexRender(cell.column.columnDef.cell, cell.getContext())}
 </TableCell>
 ))}
 </TableRow>
 ))
 ) : (
 <TableRow>
 <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
 {t("table.no_results")}
 </TableCell>
 </TableRow>
 )}
 </TableBody>
 </Table>
 </div>
 
 <div className="flex items-center justify-end gap-2 py-4">
 <div className="flex-1 text-body-md text-muted-foreground">
 {t("table.pagination", {
  start: table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1,
  end: Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length),
  total: table.getFilteredRowModel().rows.length
 })}
 </div>
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => table.previousPage()}
 disabled={!table.getCanPreviousPage()}
 className="bg-surface-container-low"
 >
 <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
 <span className="sr-only">{t("table.previous")}</span>
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => table.nextPage()}
 disabled={!table.getCanNextPage()}
 className="bg-surface-container-low"
 >
 <ChevronRight className="h-4 w-4 rtl:rotate-180" />
 <span className="sr-only">{t("table.next")}</span>
 </Button>
 </div>
 </div>
 </div>
 )
}
